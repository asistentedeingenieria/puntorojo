/* v1002 (pedido de Antonio 27-jul): "para pedir pedidos de proyectos varios que NO están acá
   prefiero que haya una pestaña en PROYECTO que diga PROYECTOS VARIOS y ahí poder manejar
   todos los pedidos de material de estos proyectos."

   Hoy un pedido de proyecto pequeño (TIFFANY) se hace desde el formulario del proyecto activo
   y queda GUARDADO ADENTRO de ese proyecto — mezclado con Vicinia. Se agrega un tercer
   contenedor con el mismo patrón probado de BODEGA CENTRAL (v964):
     state.variosMat = { pedidos, ordenes, pedidosEliminados, ordenesEliminadas, … }
   con su entrada en el desplegable de PROYECTO, su vista propia y union-merge por id + _ts.

   Los pedidos manuales VIEJOS siguen viviendo en sus proyectos: la vista los muestra igual
   (agregados por proyectoManual) para no migrar datos ni romper sus OCs. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. el store ──
const zS = ex('function _variosMatStore(');
ok('existe _variosMatStore', !!zS);
let fS = null;
try { fS = new Function('state', 'return (' + zS + ')'); } catch(e){}
if (fS) {
  const st = {};
  const f = fS(st);
  const v = f();
  ok('crea la estructura completa', Array.isArray(v.pedidos) && Array.isArray(v.ordenes) && v.pedidosEliminados && v.ordenesEliminadas);
  ok('es idempotente y conserva lo que ya había', (function(){ v.pedidos.push({id:'x'}); return f().pedidos.length === 1; })());
  ok('lleva las memorias de proveedor/precio como bodega', !!v.ocProvPorItem && !!v.postesPrecioMedida);
}

// ── 2. sincronización (mismo régimen que bodegaMat) ──
ok('variosMat se une por id + tombstones en applyRemote', /_vmL|variosMat/.test(html) && /merged\.variosMat/.test(html));
const iM = html.indexOf('merged.variosMat');
const zM = iM > 0 ? html.slice(iM - 700, iM + 1500) : '';
ok('pedidos con union-merge', /_mergeById\(_vmL\.pedidos/.test(zM));
ok('órdenes con union-merge', /_mergeById\(_vmL\.ordenes/.test(zM));
ok('tombstones de pedidos y órdenes', /pedidosEliminados/.test(zM) && /ordenesEliminadas/.test(zM));
ok('las entregas por OC también se unen acá', /_mergeRecepciones\(/.test(zM));
ok('APP_SYNC_VERSION subió (contenedor nuevo en el merge)', (function(){ const m = html.match(/const APP_SYNC_VERSION = (\d+);/); return !!m && Number(m[1]) >= 915; })());

// ── 3. el pedido de proyecto pequeño se guarda en el contenedor nuevo ──
const zSub = ex('async function submitPedido(');
ok('submitPedido manda los MANUALES a variosMat', /_variosMatStore\(\)/.test(zSub));
ok('y los del proyecto siguen en su proyecto', /p\.materiales\.pedidos\.push/.test(zSub));

// ── 4. el pedido se encuentra desde cualquier lado ──
const zF = ex('function _findPedidoGlobal(');
ok('_findPedidoGlobal busca también en varios', /variosMat|_variosMatStore/.test(zF));
const zG = ex('function getPedidoOrdenes(');
ok('getPedidoOrdenes incluye las órdenes de varios', /variosMat|_variosMatStore/.test(zG));

// ── 5. la vista ──
ok('hay entrada PROYECTOS VARIOS en el desplegable', /PROYECTOS VARIOS/.test(html));
const zV = ex('function _puedeVerVarios(');
ok('con su propio gate', !!zV);
let fV = null;
try { fV = new Function('can', 'return (' + zV + ')'); } catch(e){}
if (fV) {
  ok('lo ve quien crea pedidos', fV(k => k === 'pedidos.create')() === true);
  ok('lo ve compras', fV(k => k === 'compras.autorizar')() === true);
  ok('y el admin', fV(k => k === 'users.manage')() === true);
  ok('alguien sin nada NO lo ve', fV(() => false)() === false);
}
ok('existe el panel', /window\._abrirPanelVarios/.test(html));
// la vista junta lo nuevo con los pedidos manuales que quedaron en proyectos
const zL = ex('function _variosPedidosTodos(');
ok('existe el agregador', !!zL);
let fL = null;
try { fL = new Function('state', '_variosMatStore', 'return (' + zL + ')'); } catch(e){}
if (fL) {
  const st = {
    variosMat: { pedidos: [{ id:'n1', numero:'TIFFANY – 1', proyectoPedido:'TIFFANY' }] },
    projects: [
      { id:'p1', name:'VICINIA DEL CARMEN', materiales:{ pedidos:[
        { id:'v1', numero:'CASA LOPEZ – 1', proyectoManual:true, proyectoPedido:'CASA LOPEZ' },
        { id:'v2', numero:'VICINIA DEL CARMEN – 1' }                       // normal: NO va
      ]}}
    ]
  };
  const f = fL(st, () => st.variosMat);
  const lista = f();
  ok('trae los del contenedor nuevo', lista.some(x => x.id === 'n1'));
  ok('y los manuales que quedaron en proyectos', lista.some(x => x.id === 'v1'));
  ok('sin arrastrar los pedidos normales del proyecto', !lista.some(x => x.id === 'v2'));
  ok('marca de dónde viene cada uno', lista.every(x => typeof x._origen === 'string'));
}

/* v1002 — fronteras críticas que el mapa de enganches marcó: si se olvida una, el pedido de
   PROYECTOS VARIOS se vuelve invisible, no se puede borrar o su OC se duplica. */
ok('el borrado de pedido tiene rama propia (si no, revive en el sync)', ex('function _doDeletePedido(').includes('_ctx.esVarios'));
ok('el borrado de OC también', /_esDeVarios/.test(ex('function _doDeleteOrden(')));
ok('el gate de eliminar OC busca en los TRES contenedores', ex('function deleteOrden(').includes('_bodegaFindOc(id)'));
ok('_bodegaFindOc encuentra las OC de varios', /esVarios: true/.test(ex('function _bodegaFindOc(')));
const zOC = ex('async function openOrdenCompra(');
ok('el folio previsto sale del CONTENEDOR del pedido, no del proyecto activo', zOC.includes('_ctx.cont && _ctx.cont.ordenes'));
const zGen = ex('async function generarOrdenCompra(');
ok('la base de folios también', zGen.includes('_ordExistentes = (_ctx.cont && _ctx.cont.ordenes)'));
ok('y la memoria de proveedor/precio se guarda con el pedido', zGen.includes('_memDest = _ctx.cont'));
ok('el panel pospone applyRemote como los demás modales', /#_variosPanelModal/.test(html));
ok('la numeración del cliente mira el contenedor de varios', ex('async function submitPedido(').includes('_variosPedidosTodos()'));

/* v1002 — otros dos reportes de Antonio del mismo tramo */
ok('se pueden ELIMINAR las OC pendientes de autorizar', html.includes('window._ocEliminarBorrador = async function'));
const zDel = ex('window._ocEliminarBorrador = async function');
ok('solo mientras no esté autorizada', /PENDIENTE_AUTORIZACION/.test(zDel) && /YA ESTÁ AUTORIZADA/.test(zDel));
ok('deja tombstone (union-merge v972)', zDel.includes('ordenesEliminadas[ocId] = Date.now()'));
ok('si el pedido queda sin OC vuelve a SOLICITADO', /to: 'SOLICITADO', by: 'OC ELIMINADA'/.test(zDel));
ok('re-lee tras el modal (regla v769/v770)', zDel.split('_bodegaFindOc(ocId)').length - 1 >= 2);
ok('DETALLE en bodega ya no cierra el panel', !html.includes('_cerrarPanelBodegaDom(); openPedidoDetalle'));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
