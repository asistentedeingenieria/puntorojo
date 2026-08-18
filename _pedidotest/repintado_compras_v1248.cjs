/* v1248 (reporte de compras, 17-ago: "finanzas autoriza las OC y a ella aún NO le sale
   la autorización"): los datos SÍ llegan (el panel COMPRAS está EXCLUIDO de isUserBusy a
   propósito, v961), pero renderAll — lo que corre applyRemote al terminar — NUNCA repinta
   el panel abierto. Susana veía PENDIENTE FINANZAS hasta cerrar y reabrir el panel.
   MISMO agujero que inventarios (v1058) y pre-pago (v1068), mismo remedio: repintado
   dirigido en applyRemote — ÓRDENES y PEDIDOS si están a la vista y sin input enfocado
   (no matar lo que se escribe ni el select de proyecto). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const iA = html.indexOf('applyRemote(remoteData, opts = {})');
const iR = html.indexOf('flushPendingRender()', iA);
const zA = (iA > 0 && iR > iA) ? html.slice(iA, iR) : '';
ok('extrae applyRemote', zA.length > 5000);

console.log('— el panel COMPRAS se repinta al llegar datos —');
ok('ÓRDENES se repinta si el contenedor está a la vista',
  /getElementById\('ordenesListContainer'\)[\s\S]{0,120}renderOrdenesList\(\)/.test(zA));
ok('PEDIDOS también', /getElementById\('pedidosList'\)[\s\S]{0,120}renderPedidosList\(\)/.test(zA));
ok('sin input enfocado (no matar lo que se escribe)', (function(){
  const i = zA.indexOf('ordenesListContainer'); if (i < 0) return false;
  return /INPUT\|TEXTAREA\|SELECT/.test(zA.slice(i - 600, i)); })());
ok('documenta el linaje v1058/v1068', /v1248/.test(zA) && /v1058/.test(zA.slice(zA.indexOf('v1248') - 400, zA.indexOf('v1248') + 400)));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
