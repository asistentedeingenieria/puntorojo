/* v1290 (Antonio, 26-ago: "en ABASTECIMIENTO y PROYECTOS VARIOS, en pedidos y órdenes,
   NO deja ver el historial de ambas"): las listas en modo especial se pintan con el
   PROXY del contenedor (id '_abasto' / '_varios', v1193) y la llave del historial sale
   de ese id — pero los TOGGLES (togglePedidosHistorial / toggleOcHistorial /
   toggleOcHistorialAut) calculaban la llave con activeProj(): el clic prendía la
   bandera de la OBRA activa y el render leía la del CONTENEDOR — MOSTRAR no hacía nada.
   FIX: _histCtxId() — UNA sola resolución de contexto (proxy especial si el panel está
   en ABASTECIMIENTO/VARIOS, si no la obra activa) usada por los 3 toggles Y los renders.
   REGLA (prima de v1252/v972): quien PRENDE una bandera y quien la LEE calculan la
   llave con la MISMA función, jamás con dos caminos distintos. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* ── 1. el helper, FUNCIONAL en sus dos modos ── */
const zH = ex('function _histCtxId(');
ok('_histCtxId existe', zH.length > 60);
if (zH.length > 60) {
  try {
    const mk = (esp, proj) => new Function('_comprasFuenteEspecial', 'activeProj', zH + '\nreturn _histCtxId();')(
      function(){ return esp; }, function(){ return proj; });
    ok('modo especial: manda el contenedor', mk({ modo: '_abasto', proxy: { id: '_abasto' } }, { id: 'essenza-f2' }) === '_abasto');
    ok('modo normal: manda la obra activa', mk(null, { id: 'essenza-f2' }) === 'essenza-f2');
    ok('sin nada: def', mk(null, null) === 'def');
  } catch(e){ ok('helper evaluable', false); console.log('  ' + e.message); }
}

/* ── 2. los 3 toggles y los renders usan la MISMA resolución ── */
ok('togglePedidosHistorial', /_histCtxId\(\)/.test(ex('window.togglePedidosHistorial = function')));
ok('toggleOcHistorial', /_histCtxId\(\)/.test(ex('window.toggleOcHistorial = function')));
ok('toggleOcHistorialAut', /_histCtxId\(\)/.test(ex('window.toggleOcHistorialAut = function')));
const iPed = html.indexOf("'pedidos_historial_visible_' + _histCtxId()");
const iOc = html.indexOf("'oc_historial_visible_' + _histCtxId()");
const iOcA = html.indexOf("'oc_hist_aut_visible_' + _histCtxId()");
ok('el render de pedidos lee la misma llave', iPed >= 0 && html.indexOf("'pedidos_historial_visible_' + _histCtxId()", iPed + 1) > 0);
ok('los renders de órdenes leen las mismas llaves', iOc >= 0 && html.indexOf("'oc_historial_visible_' + _histCtxId()", iOc + 1) > 0 && iOcA >= 0 && html.indexOf("'oc_hist_aut_visible_' + _histCtxId()", iOcA + 1) > 0);
ok('no quedó NINGUNA llave de historial calculada a mano con p.id', !/historial_visible_' \+ \(\(p && p\.id\) \|\| 'def'\)/.test(html) && !/hist_aut_visible_' \+ \(\(p && p\.id\) \|\| 'def'\)/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
