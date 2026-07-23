/* v959 (pedido de Antonio 23-jul): BODEGA CENTRAL con existencias reales.
   - Libro de movimientos GLOBAL state.bodegaMovs (union-merge por id + tombstones, regla v752).
   - ENTRADA: MARCAR RECIBIDO en la OC de abastecimiento (cantidad real llegada).
   - SALIDA: automática al AUTORIZAR una orden de despacho (una sola vez por OC).
   - AJUSTE: conteo inicial y correcciones con motivo, desde el panel.
   - Permiso nuevo materiales.bodega (persona de oficina): panel + abastecimiento + recibido;
     sus OC pasan por el circuito v919 (quien genera no autoriza).
   - Blindaje v944-style para bodegaItemsGlobal (lista DE BODEGA dejaba de ser LWW).
   - Panel BODEGA CENTRAL en MATERIALES; modales nuevos registrados en isUserBusy. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFrom(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. permiso nuevo en el catálogo ──
ok('permiso materiales.bodega', /key:\s*'materiales\.bodega'/.test(html));

// ── 2. can(): materiales.bodega abre view.materiales implícito, sin regalar compras ──
const canSrc = extractFrom('function can(perm)');
let canFn = null;
try { canFn = new Function('getCurrentUser', '_permEsSoloVer', 'return (' + canSrc + ')')(
  () => ({ perms: ['materiales.bodega'] }), () => false
); } catch(e){}
ok('can() evaluable', typeof canFn === 'function');
if (typeof canFn === 'function') {
  ok('bodega -> view.materiales implícito', canFn('view.materiales') === true);
  ok('bodega NO pasa compras.autorizar', canFn('compras.autorizar') === false);
  ok('bodega NO pasa compras.revisar', canFn('compras.revisar') === false);
}

// ── 3. gate compartido _puedeGestionarBodega ──
const gSrc = extractFrom('function _puedeGestionarBodega(');
ok('_puedeGestionarBodega existe', !!gSrc);
let gFn = null;
try { gFn = new Function('can', 'return (' + gSrc + ')')(p => p === 'materiales.bodega'); } catch(e){}
ok('gate acepta materiales.bodega', typeof gFn === 'function' && gFn() === true);
try { gFn = new Function('can', 'return (' + gSrc + ')')(p => p === 'compras.autorizar'); } catch(e){}
ok('gate acepta compras.autorizar', typeof gFn === 'function' && gFn() === true);
try { gFn = new Function('can', 'return (' + gSrc + ')')(() => false); } catch(e){}
ok('gate rechaza sin permisos', typeof gFn === 'function' && gFn() === false);
// los tres gates viejos de bodega usan el helper
ok('_toggleItemBodega usa el gate', /_puedeGestionarBodega\(\)/.test(extractFrom('function _toggleItemBodega(')));
ok('_abrirModalBodega usa el gate', /_puedeGestionarBodega\(\)/.test(extractFrom('function _abrirModalBodega(')));
ok('_bodegaGenerarPedido usa el gate', /_puedeGestionarBodega\(\)/.test(extractFrom('function _bodegaGenerarPedido(')));

// ── 4. saldos: puro y con las 3 clases de movimiento ──
const sSrc = extractFrom('window._bodegaSaldos = function');
ok('_bodegaSaldos existe', !!sSrc);
let sFn = null;
try { sFn = new Function('return (function' + sSrc.slice(sSrc.indexOf('(')) + ')')(); } catch(e){}
ok('_bodegaSaldos evaluable', typeof sFn === 'function');
if (typeof sFn === 'function') {
  const movs = [
    { tipo:'ENTRADA', k:'PLANCHA', name:'PLANCHA 1/2"', u:'UND', qty:10 },
    { tipo:'SALIDA',  k:'PLANCHA', name:'PLANCHA 1/2"', qty:4 },
    { tipo:'AJUSTE',  k:'PLANCHA', qty:-2 },
    { tipo:'ENTRADA', k:'MASILLA', name:'MASILLA', u:'CUBETA', qty:3 },
    { tipo:'SALIDA',  k:'TORNILLO', name:'TORNILLO 1"', qty:5 },
    null, { tipo:'ENTRADA', qty: 99 } // basura: sin k se ignora
  ];
  const s = sFn(movs);
  ok('saldo = entradas - salidas + ajustes', s.PLANCHA && s.PLANCHA.saldo === 4);
  ok('unidad y nombre se conservan', s.PLANCHA.u === 'UND' && /PLANCHA/.test(s.PLANCHA.name));
  ok('saldo puede quedar NEGATIVO', s.TORNILLO && s.TORNILLO.saldo === -5);
  ok('material solo-entrada suma', s.MASILLA && s.MASILLA.saldo === 3);
  ok('basura sin k no crea filas', Object.keys(s).length === 3);
}

// ── 5. dedupe por OC: _bodegaYaTieneMov ──
const ySrc = extractFrom('window._bodegaYaTieneMov = function');
ok('_bodegaYaTieneMov existe', !!ySrc);
let yFn = null;
try { yFn = new Function('return (function' + ySrc.slice(ySrc.indexOf('(')) + ')')(); } catch(e){}
if (typeof yFn === 'function') {
  const movs = [{ tipo:'SALIDA', k:'X', ref:{ ocId:'oc-1' } }];
  ok('detecta mov existente por ocId+tipo', yFn(movs, 'oc-1', 'SALIDA') === true);
  ok('otro tipo no cuenta', yFn(movs, 'oc-1', 'ENTRADA') === false);
  ok('otra OC no cuenta', yFn(movs, 'oc-2', 'SALIDA') === false);
} else { ok('_bodegaYaTieneMov evaluable', false); }

// ── 6. constructor de ENTRADAS desde una OC recibida (puro, cablea por índice) ──
const eSrc = extractFrom('window._bodegaMovsEntradaDeOc = function');
ok('_bodegaMovsEntradaDeOc existe', !!eSrc);
const normSrc = extractFrom('function normOcName(');
const memSrc = extractFrom('function _ocItemMemKey(');
const movSrc = extractFrom('function _bodegaMov(');
ok('_bodegaMov existe', !!movSrc);
let eFn = null;
try {
  eFn = new Function('uid', 'getCurrentUser', 'state',
    normSrc + '\n' + memSrc + '\nfunction _bodegaUnidadDe(){ return ""; }\n' + movSrc + '\nreturn (function' + eSrc.slice(eSrc.indexOf('(')) + ')'
  )(() => 'test1', () => ({ username:'lessy', displayName:'LESSY' }), {});
} catch(e){}
ok('_bodegaMovsEntradaDeOc evaluable', typeof eFn === 'function');
if (typeof eFn === 'function') {
  const oc = { id:'oc-9', numero:'PD-1 - OC01', proyecto:'OFICINA CENTRAL', items:[
    { name:'PLANCHA 1/2" X 8\'', qty: 50 }, { name:'MASILLA', qty: 10 }
  ]};
  const movs = eFn(oc, [48, 0]); // llegó 48 de la primera, nada de la segunda
  ok('solo cantidades > 0 generan ENTRADA', movs.length === 1);
  ok('la ENTRADA lleva ocId y tipo', movs[0] && movs[0].tipo === 'ENTRADA' && movs[0].ref && movs[0].ref.ocId === 'oc-9');
  ok('qty = lo RECIBIDO, no lo pedido', movs[0] && movs[0].qty === 48);
  // normOcName descarta la barra de 1/2 (no está en la clase permitida) y toda medida
  // colapsa a X 10' — MISMA clave que ya usan bodegaItemsGlobal y ocProvPorItem.
  ok('clave canónica _ocItemMemKey', movs[0] && movs[0].k === 'PLANCHA 1 2" X 10\'');
  ok('mov nace sellado con _ts', movs[0] && typeof movs[0]._ts === 'number' && movs[0]._ts > 0);
}

// ── 7. SALIDA al autorizar despacho (zona de la definición ÚNICA de autorizarOrden) ──
const zAuth = extractFrom('async function autorizarOrden(');
ok('autorizarOrden llama el descuento de bodega', /_bodegaSalidaDespacho/.test(zAuth));
const zSal = extractFrom('function _bodegaSalidaDespacho(');
ok('el descuento aplica SOLO a despachos', /esDespacho/.test(zSal));
ok('...con guard anti-doble descuento', /_bodegaYaTieneMov/.test(zSal));

// ── 8. sync: union-merge de bodegaMovs con tombstones en applyRemote (regla v752) ──
const iApply = html.indexOf('applyRemote(remoteData');
const zApply = html.slice(iApply, iApply + 26000);
ok('applyRemote mergea bodegaMovs', /_mergeById\(\(state && state\.bodegaMovs\)/.test(zApply));
ok('...con tombstones bodegaMovsEliminados', /bodegaMovsEliminados/.test(zApply));
// ── 9. blindaje v944-style para la lista DE BODEGA (dejaba de ser LWW) ──
ok('applyRemote blinda bodegaItemsGlobal', /bodegaItemsTs/.test(zApply) && /bodegaItemsEliminados/.test(zApply));
const zTog = extractFrom('function _toggleItemBodega(');
ok('_toggleItemBodega sella ts y tombstone', /bodegaItemsTs/.test(zTog) && /bodegaItemsEliminados/.test(zTog));

// ── 10. APP_SYNC_VERSION subida (cambio de sync) ──
const mVer = html.match(/const APP_SYNC_VERSION = (\d+)/);
ok('APP_SYNC_VERSION >= 910', !!mVer && Number(mVer[1]) >= 910);

// ── 11. UI: sub-pestaña ÓRDENES visible para oficina; botón del panel nuevo ──
ok('subtab ÓRDENES admite materiales.bodega', /data-mattab="ordenes"[^>]*data-perm="[^"]*materiales\.bodega/.test(html));
ok('botón BODEGA CENTRAL abre el panel', /_abrirPanelBodega\(\)/.test(html) && /data-perm="[^"]*materiales\.bodega[^"]*"[^>]*onclick="_abrirPanelBodega\(\)"|onclick="_abrirPanelBodega\(\)"[^>]*data-perm="[^"]*materiales\.bodega/.test(html));
// v960: el botón suelto de ABASTECER se quitó (un solo botón) — ahora vive DENTRO del panel
ok('ABASTECER accesible desde el panel y gateado', /_abrirModalBodega\(\)/.test(extractFrom('function _abrirPanelBodega(')) && /_puedeGestionarBodega\(\)/.test(extractFrom('function _abrirModalBodega(')));

// ── 12. isUserBusy (regla v769/v940) — v961: la VISTA de bodega ya NO pospone (espacio
// de trabajo largo, congelaría el sync); el modal corto de RECIBIDO sí sigue.
const zBusy = extractFrom('isUserBusy(){');
const qsBusy = (zBusy.match(/querySelector\('#prConfirmModal[^']*'\)/) || [''])[0]; // la LISTA de modales (no el .modal-bg.show ni el comentario)
ok('RECIBIDO pospone applyRemote; la vista de bodega no', /_ocRecibidoModal/.test(qsBusy) && !/_bodegaPanelModal/.test(qsBusy));

// ── 13. oficina genera OC SOLO de pedidos de abastecimiento ──
const zOpen = extractFrom('async function openOrdenCompra(');
ok('openOrdenCompra admite bodega en abastecimiento', /materiales\.bodega/.test(zOpen) && /_pedidoEsAbastecimiento/.test(zOpen));
const zGen = extractFrom('async function generarOrdenCompra(');
ok('generarOrdenCompra mismo gate', /materiales\.bodega/.test(zGen) && /_pedidoEsAbastecimiento/.test(zGen));
const iDet = html.indexOf('const canOC =');
const zDet = html.slice(iDet, iDet + 600);
ok('botón GENERAR OC del detalle admite bodega', /materiales\.bodega/.test(zDet));

// ── 14. MARCAR RECIBIDO en la lista de órdenes (solo abastecimiento autorizado) ──
const iRol = html.indexOf('const canDeleteOC = can(');
const zLista = html.slice(iRol, iRol + 9000);
ok('renderOrdenesList arma botón MARCAR RECIBIDO', /_ocAbrirRecibido/.test(zLista));

// ── 15. eliminar orden con movimientos escribe la REVERSA (auditable) ──
const zDel = extractFrom('function _doDeleteOrden(');
ok('_doDeleteOrden revierte movimientos de bodega', /AJUSTE/.test(zDel) && /REVERSA/i.test(zDel));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
