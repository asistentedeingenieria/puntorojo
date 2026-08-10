/* v1162 — CANCELAR PEDIDO (solo admin): sale de la lista, conserva su número

   Antonio (10-ago): "una opcion para poder CANCELAR pedidos. NO eliminar. Que solo
   desaparezca de ahi y aparezca como cancelado pero que no pase nada con la numeracion.
   UNICAMENTE lo pueda hacer yo como admin."

   ⚠️ LO QUE EL ANÁLISIS ADVERSARIAL ENCONTRÓ (y esta versión cubre):
   1. La receta lo SEGUIRÍA contando: _coberturaAptosEtapa y _itemsYaPedidosEtapa filtran
      por esDeReceta/nivel/etapa y NO miran status ⇒ el material quedaría cubierto para
      siempre y no se podría volver a pedir. GUARD en las dos.
   2. El candado de etapa quedaría trabado ⇒ se libera como en el borrado (v1001).
   3. _pedidoResyncConReceta lo resucitaría reescribiendo items y sellando _ts ⇒ guard.
   4. Se pintaría como SOLICITADO (PEDIDO_ESTADOS[0] es el fallback) con el botón de
      aprobar ⇒ badge propio y sin acciones.
   5. Contaría como ACTIVO en los KPIs y viviría arriba en la lista ⇒ va al historial.
   6. Las OC ya generadas seguirían vivas (gasto, badge, "por recibir") ⇒ NO se permite
      cancelar un pedido con OCs: primero se cancelan ellas (mismo criterio que usa el
      resync para congelarse).
   La NUMERACIÓN no se toca: el pedido conserva su número y nadie lo reutiliza. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— la acción —');
const zC = ex(code, 'window._cancelarPedido = async function');
ok('existe y es async', zC.length > 600);
ok('SOLO admin (users.manage) — ni compras ni el solicitante', /users\.manage/.test(zC) && !/compras\.autorizar/.test(zC));
ok('un pedido CON OCs no se puede cancelar (primero se cancelan ellas)', /getPedidoOrdenes\(/.test(zC) && /ORDEN/.test(zC));
ok('el motivo es OBLIGATORIO (oninput a window var, v813)', /oninput="window\._cancelPdForm/.test(zC) && /ESCRIB[ÍI]/.test(zC));
ok('re-lee el pedido tras el modal (v769/v940)', zC.indexOf('_findPedidoGlobal') !== zC.lastIndexOf('_findPedidoGlobal'));
ok('escribe status CANCELADO con motivo, quién y cuándo', /status = 'CANCELADO'/.test(zC) && /cancelacion/.test(zC) && /motivo/.test(zC));
ok('sella pd._ts (union-merge v972 — sin esto una copia vieja lo revive)', /_ts = _t/.test(zC));
ok('libera el candado de etapa (como el borrado v1001)', /_recetaLiberarCandadoEtapa/.test(zC));
ok('limpia el metal a medida pedido', /metalMedidaPedida/.test(zC));
ok('sube de inmediato y deja rastro', /forceUploadNow/.test(zC) && /logActivity/.test(zC));
ok('el número NO se toca (no se reusa ni se renumera)', !/numero =/.test(zC) && !/nextPedidoCode/.test(zC));

console.log('\n— la receta deja de contarlo (lo más caro) —');
const zCob = ex(html, 'function _coberturaAptosEtapa(');
const zYa = ex(html, 'function _itemsYaPedidosEtapa(');
ok('_coberturaAptosEtapa ignora los cancelados', /CANCELADO/.test(zCob));
ok('_itemsYaPedidosEtapa también', /CANCELADO/.test(zYa));
/* prueba de comportamiento: un pedido cancelado NO cubre nada */
let cob = null;
try { cob = new Function('_pedidoCubre', '_devolucionesDeEtapa', 'return (' + zCob + ')')(pd => (pd && pd.recetaQty) || {}, () => ({})); } catch(e){}
ok('extraíble', typeof cob === 'function');
if (cob) {
  const vivos = [{ esDeReceta:true, recetaLevelId:'n1', recetaEtapaIdx:0, recetaQty:{ 'TORNILLO':100 } }];
  const conCancel = vivos.concat([{ esDeReceta:true, recetaLevelId:'n1', recetaEtapaIdx:0, status:'CANCELADO', recetaQty:{ 'TORNILLO':500 } }]);
  const a = cob(vivos, 'n1', 0, null), b = cob(conCancel, 'n1', 0, null);
  ok('el cancelado NO suma cobertura (el material se puede volver a pedir)',
    JSON.stringify(a.TORNILLO && a.TORNILLO.total) === JSON.stringify(b.TORNILLO && b.TORNILLO.total));
}
ok('el resync NO resucita un pedido cancelado', /CANCELADO/.test(ex(code, 'function _pedidoResyncConReceta(')));

console.log('\n— la lista y la tarjeta —');
const zCard = ex(code, 'function renderPedidoCard(');
ok('badge propio CANCELADO (no cae al fallback SOLICITADO)', /CANCELADO/.test(zCard));
ok('sin botones de avanzar ni recibir', /CANCELADO[\s\S]{0,400}actionBtn = ''|actionBtn = ''[\s\S]{0,200}CANCELADO/.test(zCard) || /_esCancel/.test(zCard));
ok('el motivo se ve en la tarjeta', /cancelacion[\s\S]{0,200}motivo/.test(zCard));
const zList = ex(code, 'function renderPedidosList(');
ok('va al HISTORIAL, no entre los activos', /CANCELADO/.test(zList));
ok('no cuenta como activo en los KPIs', /_activos[\s\S]{0,200}CANCELADO|CANCELADO[\s\S]{0,200}_activos/.test(zList));
ok('el botón CANCELAR sale en la tarjeta solo para admin', /_cancelarPedido\('/.test(zCard) && /users\.manage/.test(zCard));

console.log('\n— la frontera de acciones —');
const zAdv = ex(code, 'async function advancePedido(');
ok('advancePedido corta con un pedido cancelado (con aviso, no mudo)', /CANCELADO/.test(zAdv));

console.log('\n— lo que no cambia —');
ok('eliminar sigue existiendo, aparte', /function deletePedido\(/.test(code));
ok('los tres estados originales siguen', /SOLICITADO/.test(code) && /APROBADO/.test(code) && /RECIBIDO/.test(code));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
