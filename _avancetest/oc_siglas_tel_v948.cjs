/* v948 (pedido de Antonio): en las ÓRDENES DE COMPRA los proyectos van con SIGLAS
   (VICINIA LAS AMÉRICAS -> VLA): en el bloque del No. va "VLA - APP" (el texto APP
   se quita de al lado del logo y se muda ahí) y la fila Proyecto: solo "VLA".
   Además los teléfonos SIEMPRE con guion: 42375385 -> 4237-5385 (al armar ENTREGAR A
   y también sobre los entregarA ya congelados de OCs viejas, al imprimir). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
function getFn(name){ const s = extractFn(name); if(!s) return null; try { return new Function('return ('+s+')')(); } catch(e){ return null; } }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. _projSiglas ──
const sig = getFn('_projSiglas');
ok('_projSiglas existe y evalúa', typeof sig === 'function');
if (sig) {
  ok('VICINIA LAS AMÉRICAS -> VLA', sig('VICINIA LAS AMÉRICAS') === 'VLA');
  ok('VICINIA DEL CARMEN -> VDC (primera letra de cada palabra)', sig('VICINIA DEL CARMEN') === 'VDC');
  ok('una sola palabra queda igual (ESSENZA)', sig('ESSENZA') === 'ESSENZA');
  ok('palabra con dígitos se conserva (TORRE 4 -> T4)', sig('TORRE 4') === 'T4');
  ok('minúsculas suben (vicinia las américas -> VLA)', sig('vicinia las américas') === 'VLA');
  ok('vacío -> vacío', sig('') === '' && sig(null) === '');
}

// ── 2. _telFmt / _ocTelGuiones ──
const tel = getFn('_telFmt');
ok('_telFmt existe y evalúa', typeof tel === 'function');
if (tel) {
  ok('42375385 -> 4237-5385', tel('42375385') === '4237-5385');
  ok('ya formateado queda igual', tel('4237-5385') === '4237-5385');
  ok('con 502 -> +502 4237-5385', tel('50242375385') === '+502 4237-5385');
  ok('no-teléfono queda como está', tel('123') === '123');
}
const telTxt = getFn('_ocTelGuiones');
ok('_ocTelGuiones existe y evalúa', typeof telTxt === 'function');
if (telTxt) {
  ok('formatea el teléfono dentro del entregarA congelado', telTxt('ZONA 13 - CONTACTO: JULIO CHARVAC 42375385') === 'ZONA 13 - CONTACTO: JULIO CHARVAC 4237-5385');
  ok('no toca números cortos de dirección (15-13)', telTxt('22 CALLE 15-13, ZONA 13') === '22 CALLE 15-13, ZONA 13');
  ok('no toca corridas de más de 8 dígitos (DPI)', telTxt('DPI 2547896540101') === 'DPI 2547896540101');
}

// ── 3. template de impresión de la OC ──
const iSheet = html.indexOf('class="oc-sheet"');
const sheet = iSheet > -1 ? html.slice(iSheet, iSheet + 4000) : '';
const logoLine = (sheet.match(/<div[^>]*><img src="\$\{_LOGO_PR\}"[^>]*>[^\n]*/) || [''])[0];
ok('el texto APP ya no está al lado del logo', !!logoLine && !/>APP</.test(logoLine));
ok('bloque No.: sigla del proyecto + " - APP"', /\$\{_obraSigla\(_ocNumeroPartes\(oc\)\.proyecto\)\} - APP/.test(sheet));
/* v1001: la fila pasa por _ocProyectoLabel — sigue dando la SIGLA para los proyectos, pero
   una orden de abastecimiento imprime BODEGA CENTRAL en vez de "OC—A" (las siglas de
   "OFICINA CENTRAL — ABASTECIMIENTO"). La línea de Área se quitó: no hay torre ni apto. */
ok('fila Proyecto: usa la etiqueta (sigla o BODEGA CENTRAL)', /<dt>Proyecto:<\/dt><dd>\$\{_ocProyectoLabel\(oc\)\}<\/dd>/.test(sheet));
ok('la sigla sigue viva para los proyectos', /_projSiglas\(p\)/.test(html));
ok('ENTREGAR A pasa por el formato de teléfono', /\$\{_ocTelGuiones\(oc\.entregarA\)\}/.test(html.slice(iSheet, iSheet + 8000)));

// ── 4. captura y lista ──
const apl = extractFn('applyOcDireccion');
ok('applyOcDireccion formatea el teléfono al armar la línea', /_telFmt\(d\.telefono\)/.test(apl));
const lst = extractFn('renderOrdenesList');
ok('la lista de OCs muestra la sigla en el No.', /ocn-proy">\$\{_obraSigla\(_np\.proyecto\)\}/.test(lst));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
