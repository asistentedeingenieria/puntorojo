/* v1011 — FORMA DE PAGO HONESTA + CRÉDITO 15 DÍAS + limpieza del formulario de pedido.

   Pedido de Antonio: "ponme la opcion de credito de 15 dias" (dentro del pedido de cuentas
   por pagar) y "para proyectos ya fijos existentes quiero que elimines la opcion de CASA NO.
   porque son aptos" + "en el PROYECTO DEL PEDIDO automaticamente ese escrita la opcion del
   proyecto en el cual se esta trabajando".

   HALLAZGO QUE OBLIGA A HACER ESTO PRIMERO: hoy TODAS las órdenes de compra nacen con
   'TARJETA DE ABASTO' porque openOrdenCompra hace selectedIndex = 0 y nadie lee la forma de
   pago guardada en la ficha del proveedor (pv.pago.tipoCompra, que se guarda y no lo lee
   nadie). Si las cuentas por pagar se construyen sobre ese histórico, heredan basura — y
   cada día que pasa entra más. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. crédito de 15 días —');
ok('la opción existe en el select', /<option>CRÉDITO 15 DÍAS<\/option>/.test(html));
ok('va antes que la de 30', html.indexOf('CRÉDITO 15 DÍAS') < html.indexOf('CRÉDITO 30 DÍAS'));
/* el select por proveedor de v985 clona el innerHTML del original: hereda la opción sola */
ok('el select por proveedor la hereda solo', /_fpOpts/.test(html));

console.log('\n— 2. los días se guardan como NÚMERO, no como texto —');
/* "CRÉDITO 30 DÍAS" es un literal que hoy nadie parsea. Para vencer una cuenta por pagar
   hace falta el número. */
const zDias = ex('function _diasCredito(');
ok('existe _diasCredito', zDias.length > 40);
let fD = null;
try { fD = new Function('return (' + zDias + ')')(); } catch(e){}
if (fD) {
  ok('lee 15', fD('CRÉDITO 15 DÍAS') === 15);
  ok('lee 30', fD('CRÉDITO 30 DÍAS') === 30);
  ok('lee 60', fD('CRÉDITO 60 DÍAS') === 60);
  ok('CONTADO es 0', fD('CONTADO') === 0);
  ok('TRANSFERENCIA es 0', fD('TRANSFERENCIA BANCARIA') === 0);
  ok('TARJETA DE ABASTO es 0', fD('TARJETA DE ABASTO') === 0);
  ok('aguanta minúsculas y acentos perdidos', fD('credito 15 dias') === 15);
  ok('no confunde un número suelto del nombre', fD('CHEQUE') === 0);
  ok('vacío o basura es 0', fD('') === 0 && fD(null) === 0 && fD(undefined) === 0);
} else { ['15','30','60','contado','transfer','tarjeta','minúsculas','cheque','basura'].forEach(n => ok(n + ' (evaluable)', false)); }
ok('la OC guarda los días de crédito', /credito:\s*_diasCredito\(/.test(html));

console.log('\n— 3. la forma de pago sale de la ficha del proveedor —');
const zOpen = ex('function openOrdenCompra(');
ok('ya no se fuerza la primera opción', !/getElementById\('ocFormaPago'\)\.selectedIndex = 0/.test(zOpen));
ok('se siembra desde el proveedor', /tipoCompra/.test(zOpen) || /_formaPagoDeProveedor/.test(html));
const zFP = ex('function _formaPagoDeProveedor(');
ok('existe el resolutor', zFP.length > 40);
/* la función resuelve y devuelve vacío si no sabe; el DEFAULT lo pone quien la llama
   (selectedIndex = 0 antes de intentar sembrar), para no repartir la decisión en dos lados */
ok('devuelve vacío cuando el proveedor no la tiene', /return ''/.test(zFP));
ok('el default queda en el llamador', /selectedIndex = 0/.test(zOpen) && /_formaPagoDeProveedor\(/.test(zOpen));

console.log('\n— 4. el impreso muestra banco también en CRÉDITO —');
/* v985 solo imprimía el bloque bancario en CONTADO/TRANSFERENCIA; a crédito también hay que
   pagar y hace falta la cuenta */
ok('la condición del bloque bancario contempla el crédito',
   /if \(!\/CONTADO\|TRANSFERENCIA\|CR\[ÉE\]DITO\/i\.test\(String\(oc\.formaPago/.test(html));
ok('la tarjeta de abasto sigue sin imprimir cuenta', !/TARJETA/.test(html.slice(html.indexOf('CONTADO|TRANSFERENCIA|CR'), html.indexOf('CONTADO|TRANSFERENCIA|CR') + 200)));

console.log('\n— 5. formulario de pedido: sin CASA y sin rótulos huérfanos —');
ok('la etiqueta ya no dice CASA', !/<label>APTO \/ CASA N°<\/label>/.test(html));
ok('dice APTO', /<label>APTO N°<\/label>|<label>APTO<\/label>/.test(html));
/* el campo de texto libre SÍ conserva CASA en su ejemplo: ahí sirve, es para obras chicas */
ok('el modo manual conserva su ejemplo con casa', /pfAptoManual[^>]*placeholder="EJ: CASA/.test(html));
const zToggle = ex('function togglePedidoProyectoManual(');
ok('en modo OFICINA se esconde el bloque entero del apto, no solo el select', /pfAptoWrap/.test(zToggle));

console.log('\n— 6. PROYECTO DEL PEDIDO dice el nombre de la obra —');
ok('la opción se re-rotula con el proyecto activo', /_rotularProyectoPedido|PROYECTO ACTIVO'\]|opt\.textContent/.test(html));
const zRot = ex('function _rotularProyectoPedido(');
ok('existe la función', zRot.length > 40);
ok('cae a PROYECTO ACTIVO si no hay obra elegida', /PROYECTO ACTIVO/.test(zRot));
/* el value NO cambia: _pedidoEsAbastecimiento y togglePedidoProyectoManual comparan por él */
ok('el value sigue siendo ACTIVO (nadie compara por el texto)', !/value="\$\{/.test(zRot));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
