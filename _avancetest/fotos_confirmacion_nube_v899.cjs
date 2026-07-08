/* v899: CONFIRMACIÓN REAL de fotos de avance + chip "POR COMPARTIR".
   Antes el toast decía "FOTO GUARDADA" cuando solo el ARCHIVO había subido a Storage; la
   referencia viajaba después en la cola (saveState debounced) y con mala señal el encargado
   cerraba la app sin que nadie más viera la foto. Ahora:
   (1) tras guardar, la app espera CloudSync.forceUploadNow() → "FOTO GUARDADA Y COMPARTIDA"
       solo cuando la nube confirmó; si falla → aviso honesto "se comparte al recuperar señal".
   (2) marcador LOCAL por dispositivo (pr_fotos_pend_v1 en localStorage, NO sincroniza) → chip
       ámbar POR COMPARTIR en el tile del modal hasta que uploadCurrent commitee de verdad
       (se limpia en scheduleSave/forceUploadNow, nunca por reloj). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. helpers del marcador local (funcional, localStorage mockeado) ──
const srcGet = extractFn('_fotosPendGet'), srcAdd = extractFn('_fotosPendAdd'),
      srcPend = extractFn('_fotoEstaPendiente'), srcClear = extractFn('_fotosPendClear');
ok('helpers existen', !!(srcGet && srcAdd && srcPend && srcClear));
if (srcGet && srcAdd && srcPend && srcClear) {
  const store = {}; const setCalls = [];
  const ls = { getItem: k => (k in store ? store[k] : null), setItem: (k,v) => { store[k]=v; setCalls.push(v); } };
  const get  = new Function('localStorage', srcGet + '\nreturn _fotosPendGet;')(ls);
  const add  = new Function('localStorage','_fotosPendGet', srcAdd + '\nreturn _fotosPendAdd;')(ls, get);
  const pend = new Function('_fotosPendGet', srcPend + '\nreturn _fotoEstaPendiente;')(get);
  const clear = new Function('localStorage','_fotosPendGet', srcClear + '\nreturn _fotosPendClear;')(ls, get);
  add('https://x/foto1.jpg');
  ok('agregar → queda pendiente', pend('https://x/foto1.jpg')===true && pend('https://x/otra.jpg')===false);
  clear();
  ok('confirmación de la nube → limpia', pend('https://x/foto1.jpg')===false);
  const antes = setCalls.length; clear();
  ok('limpiar sin pendientes = no-op (sin bucles)', setCalls.length===antes);
}

// ── 2. cableado de los DOS flujos de subida (cámara + archivo) ──
ok('ambos flujos marcan POR COMPARTIR', (html.match(/_fotosPendAdd\(url\)/g)||[]).length >= 2);
ok('ambos flujos esperan la nube', (html.match(/CONFIRMANDO EN LA NUBE\.\.\./g)||[]).length >= 2);
ok('toast honesto de éxito', (html.match(/FOTO GUARDADA Y COMPARTIDA/g)||[]).length >= 2);
ok('toast honesto sin señal', (html.match(/SE COMPARTE AL RECUPERAR SEÑAL/g)||[]).length >= 2);
ok('ya no existe el "GUARDADA" prematuro', (html.match(/showToast\('FOTO GUARDADA', 'green'\)/g)||[]).length === 0);
ok('esperan forceUploadNow con await', (html.match(/await CloudSync\.forceUploadNow\(\); _nube = true;/g)||[]).length >= 2);

// ── 3. la limpieza corre SOLO cuando uploadCurrent commitea ──
ok('scheduleSave y forceUploadNow limpian el marcador', (html.match(/_fotosPendClear\(\)/g)||[]).length >= 2);

// ── 4. el chip se dibuja en el tile del modal ──
ok('chip POR COMPARTIR en el tile', /_fotoEstaPendiente\(src\)[\s\S]{0,300}POR COMPARTIR/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
