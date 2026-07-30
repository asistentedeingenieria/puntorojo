/* v1072 — FORMA DE PAGO solo cuando hay algo que PAGAR (Antonio, 30-jul):
   "cuando es trasiego la forma de pago debe de quitarse y NO aparecer porque esto fue algo
   que ya se pagó anteriormente para otra obra".
   Mismo argumento que v1015 con BODEGA (ya comprado) y que la COMPRA PRE-PAGO (ya pagada).
   Regla: se esconde solo si NINGÚN material del pedido es una compra real — si el pedido es
   MIXTO (un proveedor de verdad + un trasiego), la forma de pago se necesita para esa OC. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. ¿hay algo que pagar? —');
const zT = ex('function _ocTodoDeBodega(');
let f = null;
try { f = new Function('ocWorkingItems','return (' + zT + ')'); } catch(e){}
ok('sigue siendo pura sobre ocWorkingItems', !!f && zT.length > 100);
if (f) {
  const de = arr => f(arr)();
  ok('todo de bodega: sin forma de pago (v1015 intacto)', de([{ proveedorId: '_bodega' }, { proveedorId: '_bodega' }]) === true);
  ok('EL PEDIDO DE ANTONIO: todo TRASIEGO → sin forma de pago', de([{ proveedorId: '_tras:p9' }]) === true);
  ok('todo COMPRA PRE-PAGO → sin forma de pago (ya se pagó)', de([{ proveedorId: '_dpp:m1' }]) === true);
  ok('mezcla de fuentes ya pagadas → sin forma de pago', de([{ proveedorId: '_bodega' }, { proveedorId: '_tras:p9' }, { proveedorId: '_dpp:m1' }]) === true);
  /* el caso que NO debe romperse: pedido MIXTO — la OC del proveedor real sí necesita pago */
  ok('MIXTO (proveedor real + trasiego): la forma de pago SIGUE', de([{ proveedorId: 'prv-1' }, { proveedorId: '_tras:p9' }]) === false);
  ok('compra normal: la forma de pago sigue', de([{ proveedorId: 'prv-1' }]) === false);
  ok('sin material asignado no esconde nada', de([]) === false && de([{ proveedorId: '' }]) === false);
}

console.log('\n— 2. el formulario lo aplica —');
const zS = ex('function _ocSyncFormaPagoVisible(');
ok('el wrap se esconde con la misma regla', /_ocTodoDeBodega\(\)/.test(zS) && /ocFormaPagoWrap/.test(zS));
ok('se re-evalúa al cambiar el proveedor de un ítem (renderOcItems)', /_ocSyncFormaPagoVisible\(\)/.test(ex('function renderOcItems(')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
