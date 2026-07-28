/* v1015 — CAUSA RAÍZ de "le doy ENVIAR A COMPRAS y no pasa nada".

   Antonio, por tercera vez (v996, v1013 y ahora): "ya le di enviar a compras y NO me llega el
   mensaje... no se limpia el talonario". Las dos veces anteriores se arreglaron SÍNTOMAS: v996
   repintó el catálogo, v1013 cambió el toast por un aviso que hay que cerrar. El pedido igual
   se creaba y en pantalla no pasaba nada.

   LA CAUSA REAL: submitPedido hacía `await _notifyByPerm('compras.autorizar', ...)` DESPUÉS de
   guardar el pedido y ANTES de limpiar y avisar. Esa promesa habla con la red. Si tarda o
   queda colgada, el await nunca continúa: el pedido queda guardado pero la limpieza, el aviso
   y el cambio de pestaña NUNCA se ejecutan. El try/catch no salva de eso — atrapa un rechazo,
   no una promesa que nunca resuelve. Por eso pasaba "a veces": depende de la red.

   Avisarle a compras es un efecto secundario. El usuario no puede quedarse esperándolo. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zSub = ex('async function submitPedido(');
ok('submitPedido existe', zSub.length > 500);

console.log('\n— 1. la notificación ya no bloquea el cierre —');
ok('no se espera a la notificación', !/await _notifyByPerm/.test(zSub));
ok('la notificación se sigue mandando', /_notifyByPerm\(/.test(zSub));
ok('y sus errores no rompen nada', /_notifyByPerm\([\s\S]{0,400}?\.catch\(/.test(zSub));

console.log('\n— 2. el orden correcto: primero el usuario, después la red —');
const iLimpia = zSub.indexOf('renderPedidoForm()');
const iAviso  = zSub.indexOf('PEDIDO ENVIADO A COMPRAS');
const iNotif  = zSub.indexOf('_notifyByPerm(');
ok('el talonario se limpia antes de tocar la red', iLimpia > 0 && iNotif > 0 && iLimpia < iNotif);
ok('el aviso también', iAviso > 0 && iAviso < iNotif);
ok('el pedido ya está guardado para entonces', zSub.indexOf('pedidos.push') < iLimpia);

console.log('\n— 3. lo que ya se había pedido, sigue —');
ok('el aviso hay que cerrarlo', /prAlert\(\{[\s\S]{0,200}PEDIDO ENVIADO A COMPRAS/.test(zSub));
ok('dice el número del pedido', /_numLimpio\(numero\)/.test(zSub));
ok('redirige a la lista de pedidos', /setPedidoTab\('lista'\)/.test(zSub));
ok('el de abastecimiento va a BODEGA CENTRAL', /_abrirPanelBodega\(\)/.test(zSub));

console.log('\n— 4. el despacho de bodega no muestra forma de pago —');
/* Antonio: "si sale de la bodega central la orden de despacho NO TIENE QUE DECIR NADA DE FORMA
   DE PAGO porque ese pago ya se solicitó". v1013 arregló lo que se GUARDA en la orden, pero el
   modal seguía mostrando el campo — que es lo que él estaba viendo. */
ok('el modal esconde el campo cuando todo sale de bodega', /_ocTodoDeBodega\(/.test(html));
const zTodo = ex('function _ocTodoDeBodega(');
ok('el criterio es que TODOS los items sean de bodega', /every\(/.test(zTodo));
ok('con items mezclados el campo se queda (hay compra real)', /length/.test(zTodo));
ok('el bloque de forma de pago tiene id para poder esconderlo', /id="ocFormaPagoWrap"/.test(html));
ok('renderOcItems lo actualiza al cambiar de proveedor', /_ocSyncFormaPagoVisible\(\)/.test(ex('function renderOcItems(')));
ok('y al abrir el modal ya sale bien', /_ocSyncFormaPagoVisible\(\)/.test(ex('function openOrdenCompra(')));
ok('la orden generada sigue diciendo NO APLICA', /NO APLICA · DESPACHO DE BODEGA/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
