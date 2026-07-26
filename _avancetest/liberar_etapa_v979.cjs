/* v979/v981 BUG (Antonio 26-jul, dos rondas): eliminó un pedido de receta y la etapa
   quedó trabada "ETAPA 1 · PEDIDA".
   v979 usó la regla "¿queda pedido a escala de nivel?" — INSUFICIENTE: un pedido
   SOLO POSTES vivo (escala nivel) mantenía trabada la etapa ENTERA aunque solo
   cubría postes (caso real: VLA nivel 02).
   v981: la VERDAD del candado es la MISMA regla _todoPedido (v909): la etapa está
   PEDIDA solo si NO queda nada disponible para pedir (_etapaItemsParaPedir vacío).
   _recetaLiberarCandadoEtapa la aplica al ELIMINAR un pedido y en el self-heal de
   carga (solo LIBERA; nunca traba). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zH = ex('function _recetaLiberarCandadoEtapa(');
ok('_recetaLiberarCandadoEtapa existe', !!zH);
let fH = null;
try { fH = new Function('_etapaItemsParaPedir', 'return (' + zH + ')'); } catch(e){}
if (fH) {
  const mkP = locks => ({ towers: [{ levels: [{ id:'l2', name:'NIVEL 02' }] }], materiales: { etapasPedidas: locks } });
  // caso Antonio: quedan ítems disponibles (el SOLO POSTES vivo no cubre la etapa) → LIBERA
  const p1 = mkP({ l2: [true,false,false,false,false,false] });
  ok('con ítems disponibles → LIBERA la etapa', fH(() => [{k:1},{k:2}])(p1, 'l2', 0) === true && p1.materiales.etapasPedidas.l2[0] === false);
  // etapa realmente completa (nada disponible) → el candado SE QUEDA
  const p2 = mkP({ l2: [true,false,false,false,false,false] });
  ok('sin nada disponible → el candado se queda', fH(() => [])(p2, 'l2', 0) === false && p2.materiales.etapasPedidas.l2[0] === true);
  // sin candado puesto → no hace nada
  const p3 = mkP({ l2: [false,false,false,false,false,false] });
  ok('sin candado no toca nada', fH(() => [{k:1}])(p3, 'l2', 0) === false && p3.materiales.etapasPedidas.l2[0] === false);
} else ok('helper evaluable', false);

const zDel = ex('function _doDeletePedido(');
ok('_doDeletePedido libera con la regla REAL (_etapaItemsParaPedir)', /_recetaLiberarCandadoEtapa\(p, pd\.recetaLevelId, pd\.recetaEtapaIdx\)/.test(zDel));
ok('_doDeletePedido suelta el id en metalMedidaPedida ANTES de recalcular', zDel.indexOf('metalMedidaPedida[pd.recetaLevelId].filter(') < zDel.indexOf('_recetaLiberarCandadoEtapa(p, pd.recetaLevelId'));
ok('self-heal al cargar usa la misma regla', /self-heal/.test(html) && /_recetaLiberarCandadoEtapa\(p, lid, ei\)/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
