/* v965 (pedido de Antonio 23-jul): "una manera más fácil de poner las existencias que YA
   tenemos sin hacer un pedido". Botón CARGAR EXISTENCIAS en la vista de bodega → modal
   body-level con buscador: se escribe el TOTAL REAL físico por material (catálogo global
   de recetas + materiales libres) y el sistema deriva el AJUSTE (total − saldo actual).
   Sin pedido, sin OC. Motivo fijo 'CARGA DE EXISTENCIAS'. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFrom(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. constructor PURO: total real − saldo actual = AJUSTE (solo deltas ≠ 0) ──
const cSrc = extractFrom('window._bodegaMovsDeCarga = function');
ok('_bodegaMovsDeCarga existe', !!cSrc);
const normSrc = extractFrom('function normOcName(');
const memSrc = extractFrom('function _ocItemMemKey(');
const movSrc = extractFrom('function _bodegaMov(');
let cFn = null;
try {
  cFn = new Function('uid', 'getCurrentUser', 'state',
    normSrc + '\n' + memSrc + '\nfunction _bodegaUnidadDe(){ return ""; }\n' + movSrc +
    '\nreturn (function' + cSrc.slice(cSrc.indexOf('(')) + ')'
  )(() => 'x1', () => ({ username: 'antonio' }), {});
} catch(e){}
ok('_bodegaMovsDeCarga evaluable', typeof cFn === 'function');
if (typeof cFn === 'function') {
  const saldos = { 'LIJA AGUA FANDELI NO. 150': { saldo: 20 } };
  const movs = cFn([
    { name: 'LIJA AGUA FANDELI No. 150', total: 100 },  // 20 → 100 = +80
    { name: 'MASILLA', total: 12 },                      // 0 → 12 = +12
    { name: 'TORNILLO 1"', total: 0 },                   // 0 → 0 = sin movimiento
    { name: '', total: 50 }                              // sin nombre = se ignora
  ], saldos);
  ok('deriva el DELTA contra el saldo actual', movs.length === 2 && movs[0].qty === 80 && movs[0].tipo === 'AJUSTE');
  ok('material nuevo entra completo', movs[1].qty === 12);
  ok('motivo CARGA DE EXISTENCIAS', movs.every(m => /CARGA DE EXISTENCIAS/.test((m.ref || {}).motivo || '')));
  ok('nacen sellados con _ts', movs.every(m => typeof m._ts === 'number'));
  // bajar también funciona (contaron menos de lo que decía el sistema)
  const baja = cFn([{ name: 'LIJA AGUA FANDELI No. 150', total: 5 }], saldos);
  ok('total menor al saldo genera ajuste NEGATIVO', baja.length === 1 && baja[0].qty === -15);
}

// ── 2. el modal y su botón ──
const zModal = extractFrom('function _abrirCargaExistencias(');
ok('_abrirCargaExistencias existe (modal body-level)', !!zModal && /_bodegaCargaModal/.test(zModal) && /document\.body\.appendChild/.test(zModal));
ok('gate de bodega', /_puedeGestionarBodega\(\)/.test(zModal));
ok('con buscador unificado', /pr-buscador/.test(zModal));
ok('catálogo global + saldo actual visibles', /_bodegaProductosGlobal/.test(zModal) && /_bodegaSaldos/.test(zModal));
ok('permite material LIBRE (no de receta)', /_cargaLibre|MATERIAL LIBRE|OTRO MATERIAL/i.test(zModal));
ok('cableado por índice (trampa escapeAttr v740)', /data-cx/.test(zModal));
const zConf = extractFrom('function _bodegaConfirmarCarga(');
ok('confirmar usa el constructor puro y sube al toque', /_bodegaMovsDeCarga/.test(zConf) && /forceUploadNow/.test(zConf));
ok('botón CARGAR EXISTENCIAS en la vista', /CARGAR EXISTENCIAS/.test(extractFrom('function _abrirPanelBodega(')) && /_abrirCargaExistencias\(\)/.test(html));

// ── 2b. v966 (observación de Antonio): con la tabla vacía el AJUSTE no pinta nada ──
const zVista = extractFrom('function _abrirPanelBodega(');
ok('el bloque de AJUSTE solo sale con materiales', /lista\.length \? `<div[^`]*MOTIVO DEL AJUSTE/.test(zVista.replace(/\n/g, ' ')));
ok('el vacío manda a CARGAR EXISTENCIAS (no al ajuste)', /SIN MATERIALES TODAVÍA[^']*CARGAR EXISTENCIAS/.test(zVista));

// ── 3. el modal pospone applyRemote (captura corta, regla v769/v940) ──
const zBusy = extractFrom('isUserBusy(){');
const qsBusy = (zBusy.match(/querySelector\('#prConfirmModal[^']*'\)/) || [''])[0];
ok('el modal de carga está en isUserBusy', /_bodegaCargaModal/.test(qsBusy));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
