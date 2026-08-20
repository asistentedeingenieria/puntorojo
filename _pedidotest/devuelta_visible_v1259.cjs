/* v1259 (Antonio, 18-ago: "ya le di RETIRAR pero NO me sale en PEDIDOS para volver a
   hacerla"): el pedido EF2-19 estaba RECIBIDO ⇒ su tarjeta vivía en el historial
   colapsado, y el badge DEVUELTA·CORREGIR (v1235) quedaba escondido ahí.
   REGLA: un pedido con una orden DEVUELTA es TRABAJO PENDIENTE — sale del historial a
   la vista activa aunque esté RECIBIDO o con solicitud atendida (v1256). El CANCELADO
   se queda en historial (no puede tener órdenes vivas). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zR = ex('function renderPedidosList(');
ok('se calcula qué pedidos tienen una orden DEVUELTA', /_conDevuelta/.test(zR) && /'DEVUELTA'/.test(zR));
ok('el pedido con devuelta entra a ACTIVOS aunque esté RECIBIDO',
  (function(){ const i = zR.indexOf('const _act0'); if (i < 0) return false; return /_conDevuelta/.test(zR.slice(i, i + 400)); })());
ok('y sale del historial', (function(){ const i = zR.indexOf('const _hist ='); if (i < 0) return false; return /_conDevuelta/.test(zR.slice(i, i + 400)); })());
ok('el CANCELADO se queda en historial', /pd\.status === 'CANCELADO'/.test(zR.slice(zR.indexOf('const _hist ='), zR.indexOf('const _hist =') + 400)));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
