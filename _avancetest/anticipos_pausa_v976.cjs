/* v976 (pedidos de Antonio 25/26-jul):
   1. PAUSAR/REANUDAR solicitudes de anticipo — si no hay existencias para comprar,
      la persona con permiso anticipos.pausar (o admin) pone la solicitud EN PAUSA:
      deja de contar como pendiente/mensaje (badge) hasta reanudarla. Es un FLAG
      (s.pausada), NO un estado nuevo: al reanudar sigue exactamente donde iba.
      Mutaciones sellan _ts (union-merge v844).
   2. Mensaje del header de BODEGA CENTRAL más ordenado y bonito (grid de 4 tarjetitas
      en vez del párrafo denso). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFrom(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. el permiso ──
ok('permiso anticipos.pausar en el catálogo', /key:\s*'anticipos\.pausar'/.test(html));

// ── 2. pausar ──
const zPau = extractFrom('window.pausarSolicitudAnticipo = async function');
ok('pausarSolicitudAnticipo existe', !!zPau);
ok('gate anticipos.pausar (+admin)', /_antSolicPerm\('anticipos\.pausar'\)/.test(zPau) && /_antEsAdmin\(\)/.test(zPau));
ok('marca pausada y sella _ts', /\.pausada = true/.test(zPau) && /_ts\s*=\s*Date\.now\(\)/.test(zPau));
ok('guarda con _antSolicSave (forceUploadNow adentro)', /_antSolicSave\(\)/.test(zPau));
ok('re-lee del state vivo tras el await del confirm (patrón v769/v770)', /prConfirm/.test(zPau) && /sol2/.test(zPau));

// ── 3. reanudar ──
const zRea = extractFrom('window.reanudarSolicitudAnticipo = async function');
ok('reanudarSolicitudAnticipo existe', !!zRea);
ok('gate anticipos.pausar (+admin)', /_antSolicPerm\('anticipos\.pausar'\)/.test(zRea) && /_antEsAdmin\(\)/.test(zRea));
ok('quita la pausa y sella _ts', /\.pausada = false/.test(zRea) && /_ts\s*=\s*Date\.now\(\)/.test(zRea));

// ── 4. pausada NO cuenta como pendiente (badge/mensaje) ──
const zParaMi = extractFrom('window._antSolicPendientesParaMi = function');
let fnParaMi = null;
try {
  fnParaMi = new Function('_antSolics', '_antSolicPerm', '_antEsGerente',
    'return (' + zParaMi.slice(zParaMi.indexOf('function')) + ')');
} catch(e){}
if (fnParaMi) {
  const sols = [
    { id:'a', estado:'pendiente_cotizacion' },
    { id:'b', estado:'pendiente_cotizacion', pausada:true },
    { id:'c', estado:'autorizada', pausada:true }
  ];
  const res = fnParaMi(() => sols, () => true, () => true)();
  ok('pendientesParaMi EXCLUYE pausadas', res.length === 1 && res[0].id === 'a');
} else ok('_antSolicPendientesParaMi evaluable', false);

const zCnt = extractFrom('window._cntAnticipoPend = function');
let fnCnt = null;
try {
  fnCnt = new Function('isReadOnly', 'state',
    'return (' + zCnt.slice(zCnt.indexOf('function')) + ')');
} catch(e){}
if (fnCnt) {
  const st = { solicitudesAnticipo: [
    { estado:'pendiente_autorizacion' },
    { estado:'pendiente_autorizacion', pausada:true }
  ] };
  ok('el contador solo-lectura también excluye pausadas', fnCnt(() => true, st)() === 1);
} else ok('_cntAnticipoPend evaluable', false);

// ── 5. la tarjeta: chip EN PAUSA + botones ──
const zRen = extractFrom('function _antSolicRender(');
ok('chip gris EN PAUSA en vez del estado', /s\.pausada \?/.test(zRen) && /EN PAUSA/.test(zRen));
ok('gate puedePausar definido en el render', /puedePausar = _antSolicPerm\('anticipos\.pausar'\)/.test(zRen));
ok('botón PAUSAR (solo con permiso, en estados activos)', /puedePausar[^\n]*PAUSAR/.test(zRen.replace(/\n/g,' ')) && /pausarSolicitudAnticipo/.test(zRen));
ok('botón REANUDAR cuando está pausada', /reanudarSolicitudAnticipo/.test(zRen));
ok('en pausa se esconden las acciones del flujo (cotizar/autorizar/entregar)', (zRen.match(/!s\.pausada && s\.estado===/g) || []).length >= 3);

// ── 6. header de bodega más ordenado y bonito (grid de tarjetitas) ──
const zVista = extractFrom('function _abrirPanelBodega(');
ok('header de bodega en grid de tarjetitas (no párrafo)', /grid-template-columns:repeat\(auto-fit,minmax\(/.test(zVista) && /CÓMO LEER LA TABLA/.test(zVista));
ok('conserva las 3 definiciones (cargar/abastecer/ajuste-correcciones)', /ya hay físicamente/.test(zVista) && /compra stock al proveedor/.test(zVista) && /correcciones puntuales/.test(zVista));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
