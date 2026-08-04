/* v964 (pedido de Antonio 23-jul): los pedidos de ABASTECIMIENTO ya no nacen en el
   proyecto activo — viven en el store GLOBAL state.bodegaMat {pedidos, ordenes} con
   union-merge por id + tombstones (APP_SYNC 911) y numeración propia derivada
   'BODEGA – 00001' (SIN contador mutable — lección v953: dos dispositivos se pisan).
   Todo el circuito resuelve pedido/OC globalmente (bodega primero, proyecto después);
   la gestión completa vive en la vista BODEGA CENTRAL. El proyecto solo se entera al
   despacharle de bodega (SALIDA v959, sin cambios). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFrom(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. sync: union-merge del store con tombstones (regla v752) ──
const iApply = html.indexOf('applyRemote(remoteData');
/* v1136: la ventana era de 30.000 caracteres y applyRemote sigue creciendo (cada contenedor
   nuevo que se une suma su bloque). Al agregar el merge de devoluciones por trasiego, el de
   bodega quedó fuera y el test se puso rojo sin que nada se hubiera roto. Se amplía; si vuelve
   a pasar, conviene extraer la función completa en vez de seguir estirando el número. */
const zApply = html.slice(iApply, iApply + 60000);
ok('applyRemote mergea bodegaMat.pedidos', /state\.bodegaMat/.test(zApply) && /_mergeById\(_bmL\.pedidos/.test(zApply));
ok('applyRemote mergea bodegaMat.ordenes', /_mergeById\(_bmL\.ordenes/.test(zApply));
ok('...con tombstones de ambos', /pedidosEliminados/.test(zApply) && /ordenesEliminadas/.test(zApply));
const mVer = html.match(/const APP_SYNC_VERSION = (\d+)/);
ok('APP_SYNC_VERSION >= 911', !!mVer && Number(mVer[1]) >= 911);

// ── 2. el store y la numeración derivada ──
const sSrc = extractFrom('function _bodegaMatStore(');
ok('_bodegaMatStore existe y asegura la forma', !!sSrc && /pedidos/.test(sSrc) && /ordenes/.test(sSrc));
const nSrc = extractFrom('function _bodegaNextNum(');
// v997 (queja de Antonio): pasó de max+1 al PRIMER NÚMERO LIBRE — al eliminar un pedido su
// número vuelve a estar disponible y la serie de bodega no deja huecos (regla v992).
ok('_bodegaNextNum existe (numeración DERIVADA, sin contador)', !!sSrc && !!nSrc && /_primerNumeroLibre/.test(nSrc));
let nFn = null;
try { nFn = new Function(extractFrom('function _primerNumeroLibre(') + '\nreturn (' + nSrc + ')')(); } catch(e){}
if (typeof nFn === 'function') {
  ok('sigue la serie cuando está completa', nFn([{ numero: 'BODEGA – 00001' }, { numero: 'BODEGA – 00002' }]) === 3);
  ok('rellena el hueco que dejó un pedido eliminado', nFn([{ numero: 'BODEGA – 00003' }, { numero: 'BODEGA – 00001' }]) === 2);
  ok('lista vacía arranca en 1', nFn([]) === 1);
} else { ok('_bodegaNextNum evaluable', false); }
ok('el store NO usa contador mutable propio', !/bodegaMat\.pedidoCounter\s*=|bodegaMat\.ordenCounter\s*=/.test(html));

// ── 3. creación: _bodegaGenerarPedido escribe al store global ──
const zGen = extractFrom('function _bodegaGenerarPedido(');
ok('el abastecimiento nace en bodegaMat, no en el proyecto', /_bodegaMatStore\(\)/.test(zGen) && !/p\.materiales\.pedidos\.push/.test(zGen));
ok('numeración BODEGA propia', /BODEGA – /.test(zGen) || /_bodegaNextNum/.test(zGen));
ok('nace sellado con _ts', /_ts/.test(zGen));

// ── 4. resolución GLOBAL pedido/OC en el circuito ──
const fSrc = extractFrom('function _findPedidoGlobal(');
ok('_findPedidoGlobal existe (bodega primero, proyecto después)', !!fSrc && /bodegaMat/.test(fSrc));
ok('openPedidoDetalle resuelve global', /_findPedidoGlobal/.test(extractFrom('function openPedidoDetalle(')));
ok('getPedidoOrdenes incluye las OCs de bodega', /bodegaMat/.test(extractFrom('function getPedidoOrdenes(')));
ok('openOrdenCompra resuelve global', /_findPedidoGlobal/.test(extractFrom('async function openOrdenCompra(')));
const zGenOc = extractFrom('async function generarOrdenCompra(');
ok('generarOrdenCompra resuelve global (inicial y re-lectura v940)', (zGenOc.match(/_findPedidoGlobal/g) || []).length >= 2);
ok('...y pushea la OC al contenedor del pedido', /_ctx\.cont\.ordenes\.push|cont\.ordenes\.push/.test(zGenOc));
ok('advancePedido resuelve global', /_findPedidoGlobal/.test(extractFrom('async function advancePedido(')));
ok('printPedido resuelve global', /_findPedidoGlobal/.test(extractFrom('function printPedido(')));
ok('deletePedido/_doDeletePedido resuelven global', /_findPedidoGlobal/.test(extractFrom('function deletePedido(')) && /_findPedidoGlobal/.test(extractFrom('function _doDeletePedido(')));
ok('_doDeletePedido escribe tombstone si es de bodega', /pedidosEliminados/.test(extractFrom('function _doDeletePedido(')));

// ── 5. gestión de OC global ──
ok('_bodegaFindOc también barre bodegaMat.ordenes', /bodegaMat/.test(extractFrom('function _bodegaFindOc(')));
ok('autorizarOrden usa lookup global (inicial + re-lectura)', (extractFrom('async function autorizarOrden(').match(/_bodegaFindOc/g) || []).length >= 2);
ok('printOrdenCompra usa lookup global', /_bodegaFindOc/.test(extractFrom('function printOrdenCompra(')));
ok('subir factura usa lookup global', /_bodegaFindOc/.test(extractFrom('function _ocAbrirSubirFactura(')) && /_bodegaFindOc/.test(extractFrom('async function _ocSubirFactura(')));
ok('_doDeleteOrden global + tombstone de bodega', /_bodegaFindOc|bodegaMat/.test(extractFrom('function _doDeleteOrden(')) && /ordenesEliminadas/.test(extractFrom('function _doDeleteOrden(')));
ok('_ocEsAbastecimiento reconoce pedidos del store', /bodegaMat/.test(extractFrom('function _ocEsAbastecimiento(')));
ok('_bodegaOcsPorRecibir incluye las OCs del store', /bodegaMat/.test(extractFrom('function _bodegaOcsPorRecibir(')));

// ── 6. la vista de bodega gestiona sus pedidos y OCs ──
const zView = extractFrom('function _abrirPanelBodega(');
ok('sección PEDIDOS DE ABASTECIMIENTO en la vista', /PEDIDOS DE ABASTECIMIENTO/.test(zView));
ok('...con generar OC y autorizar desde ahí', /openPedidoDetalle|openOrdenCompra/.test(zView) && /autorizarOrden/.test(zView));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
