/* v979 BUG (Antonio 26-jul): eliminó un pedido de receta y la etapa quedó trabada
   "ETAPA 1 · PEDIDA" sin dejar re-pedirla — etapasPedidas se sella al crear el pedido
   pero _doDeletePedido nunca la limpiaba (ni metalMedidaPedida soltaba el id).
   Fix: _recetaRecalcularCandadoEtapa PURO (candado = queda algún pedido de receta a
   escala de NIVEL de ese nivel/etapa) usado al ELIMINAR + self-heal al cargar para los
   candados huérfanos que ya quedaron de antes. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zH = ex('function _recetaRecalcularCandadoEtapa(');
ok('helper PURO en la zona RECETA-PURE', !!zH && html.indexOf('function _recetaRecalcularCandadoEtapa(') < html.indexOf('===RECETA-PURE-END==='));
let fH = null;
try { fH = new Function('return (' + zH + ')')(); } catch(e){}
if (fH) {
  const mkP = (pedidos, locks) => ({ materiales: { pedidos, etapasPedidas: locks } });
  const p1 = mkP([], { l2: [true,false,false,false,false,false] });
  ok('sin pedidos vivos → LIBERA la etapa', fH(p1, 'l2', 0) === true && p1.materiales.etapasPedidas.l2[0] === false);
  const p2 = mkP([{ id:'a', esDeReceta:true, recetaLevelId:'l2', recetaEtapaIdx:0 }], { l2: [true,false,false,false,false,false] });
  ok('con pedido de NIVEL vivo → el candado se queda', fH(p2, 'l2', 0) === false && p2.materiales.etapasPedidas.l2[0] === true);
  const p3 = mkP([{ id:'b', esDeReceta:true, recetaAptoId:'apX', recetaLevelId:'l2', recetaEtapaIdx:0 }], { l2: [true,false,false,false,false,false] });
  ok('solo pedidos POR APTO → libera (la etapa no está cerrada a nivel)', fH(p3, 'l2', 0) === true && p3.materiales.etapasPedidas.l2[0] === false);
} else ok('helper evaluable', false);

const zDel = ex('function _doDeletePedido(');
ok('_doDeletePedido libera el candado del pedido eliminado', /_recetaRecalcularCandadoEtapa\(p, pd\.recetaLevelId, pd\.recetaEtapaIdx\)/.test(zDel));
ok('_doDeletePedido suelta el id en metalMedidaPedida', /metalMedidaPedida\[pd\.recetaLevelId\]\.filter\(/.test(zDel));
ok('self-heal al cargar: candados huérfanos de pedidos ya eliminados', /v979 self-heal/.test(html) && /_recetaRecalcularCandadoEtapa\(p, lid, ei\)/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
