/* v1007 (pedido de Antonio): "acá quiero que también creemos el historial cuando ya se
   marquen como recibidas — que se oculten todas como historial las ya recibidas".
   Es el mismo criterio de v1006 (pestaña ÓRDENES DE COMPRA) pero DENTRO de los paneles:
   BODEGA CENTRAL y PROYECTOS VARIOS. Los pedidos ya recibidos en obra se guardan en un
   bloque colapsable al final de su lista, con su conteo y MOSTRAR/OCULTAR. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── criterio compartido: un pedido ya recibido sale de la lista activa ──
const zR = ex('function _pedidoYaRecibido(');
ok('existe _pedidoYaRecibido', !!zR);
let f = null;
try { f = new Function('return (' + zR + ')')(); } catch(e){}
if (f) {
  ok('RECIBIDO cuenta como recibido', f({ status:'RECIBIDO' }) === true);
  ok('APROBADO todavía no', f({ status:'APROBADO' }) === false);
  ok('SOLICITADO tampoco', f({ status:'SOLICITADO' }) === false);
  ok('con recepción registrada aunque el estado no haya avanzado', f({ status:'APROBADO', recepcion:{ ts:1 } }) === true);
  ok('pero NO si todavía faltan entregas', f({ status:'APROBADO', recepcion:{ ts:1, faltanEntregas:true } }) === false);
  ok('null no rompe', f(null) === false);
}

// ── panel de BODEGA CENTRAL ──
const iPan = html.indexOf('PEDIDOS DE ABASTECIMIENTO del store global');
const zPan = iPan > 0 ? html.slice(iPan, iPan + 6500) : '';
ok('bodega separa los recibidos', /_pedidoYaRecibido\(/.test(zPan));
ok('bodega tiene su historial colapsable', /HISTORIAL DE PEDIDOS RECIBIDOS/.test(zPan));
ok('con conteo y MOSTRAR/OCULTAR', /▶ MOSTRAR|▼ OCULTAR/.test(zPan));
const zTB = ex('window.toggleBodegaHistorial = function');
ok('su toggle repinta el panel', /_abrirPanelBodega\(\)|_bodegaRepintar\(\)/.test(zTB));

// ── panel de PROYECTOS VARIOS ──
const zVar = ex('window._abrirPanelVarios = function');
ok('varios también separa los recibidos', /_pedidoYaRecibido\(/.test(zVar));
ok('y tiene su historial', /HISTORIAL DE PEDIDOS RECIBIDOS/.test(zVar));
const zTV = ex('window.toggleVariosHistorial = function');
ok('su toggle repinta', /_abrirPanelVarios\(\)|_variosRepintar\(\)/.test(zTV));

// ── no se pierde nada: el historial existe aunque no haya activos ──
ok('bodega avisa si ya no queda ninguno pendiente', /TODOS LOS PEDIDOS FUERON RECIBIDOS/.test(zPan));

/* v1007 (pedido de Antonio): 'en proyectos varios los pedidos y TODO se maneje únicamente
   dentro de esta pestaña. NO QUIERO QUE ME REGRESE A LA GENERAL'. El formulario no se
   duplica: se MUEVE el nodo real (#pedido-nuevo) adentro del panel y se devuelve al salir. */
const zNP2 = ex('window._variosNuevoPedido = function');
ok('el formulario se abre DENTRO del panel', zNP2.includes('_variosFormHost') && zNP2.includes('host.appendChild(form)'));
ok('ya no navega a la pestaña general', !zNP2.includes("setView('materiales')"));
ok('recuerda de dónde vino el formulario', zNP2.includes('_variosFormOrigen'));
ok('queda fijo en PROYECTO PEQUEÑO', zNP2.includes("sel.value = 'MANUAL'") && zNP2.includes('sel.disabled = true'));
const zDev = ex('window._variosDevolverForm = function');
ok('sabe devolver el formulario a su lugar', zDev.includes('org.padre.insertBefore'));
ok('y reactiva el selector de tipo', zDev.includes('sel.disabled = false'));
ok('cerrar el panel devuelve el formulario ANTES de destruirlo', ex('function _cerrarPanelVariosDom(').includes('_variosDevolverForm'));
ok('tras enviar el pedido vuelve al listado de varios', ex('async function submitPedido(').includes('_variosVolverALista'));
ok('GENERAR OC ya no cierra el panel', !html.includes("_cerrarPanelVariosDom(); currentPedidoDetalleId"));
ok('y el modal de OC se abre encima del panel', ex('async function openOrdenCompra(').includes("_panOc ? '99000' : ''"));

/* v1008 (pedidos de Antonio): la barra de ENVIAR A COMPRAS no puede quedar FIJA en medio del
   catálogo dentro del panel, y las ÓRDENES de proyectos varios se manejan ahí adentro. */
ok('la barra de resumen es estática dentro del panel', html.includes('#_variosFormHost .pedido-summary-bar{position:static'));
ok('varios tiene su bandeja de autorización', zVar.includes('OC PENDIENTES DE AUTORIZAR'));
ok('con autorizar, editar y eliminar', zVar.includes('autorizarOrden(') && zVar.includes('_ocEditarBorrador(') && zVar.includes('_ocEliminarBorrador('));
ok('y su sección POR RECIBIR', zVar.includes('POR RECIBIR') && zVar.includes('MARCAR RECIBIDO'));
ok('la recepción va por ORDEN (no por pedido entero)', zVar.includes("advancePedido('") && zVar.includes("o.pedidoId"));
ok('solo muestra órdenes vivas', zVar.includes("o.status !== 'CANCELADA'"));
ok('las ya recibidas no aparecen como pendientes', zVar.includes('_ocPendienteDeRecibir('));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
