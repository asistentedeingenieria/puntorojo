/* v1096 — DENTRO DE LA OBRA, LA LISTA DE PEDIDOS NO APRUEBA NI GENERA OC (Antonio, 31-jul):
   "en la pestaña donde se selecciona el proyecto y NO compras quiero que aquí solo en la lista
   de pedidos tenga la opción de marcar YA RECIBÍ EL MATERIAL y VER DETALLE. No quiero que se
   pueda generar la OC desde aquí dentro de la obra. Eso solo se debe de poder hacer en la
   pestaña de COMPRAS."

   renderPedidoCard se usa ÚNICAMENTE desde renderPedidosList, que es la lista de la obra
   (activeProj + #pedKpis). COMPRAS tiene su propio circuito (generarOrdenCompra). Así que el
   corte va acá y no afecta a compras.

   Antes: la tarjeta ofrecía el avance de estado genérico — con permiso compras.autorizar salía
   APROBAR Y GENERAR OC, que es justo lo que Antonio quiere sacar de la obra.
   Después: en la obra la única acción es RECIBIR (y VER DETALLE). El resto del circuito de
   compra vive en COMPRAS.

   El guard de advancePedido NO se toca: es la defensa real (quitar un botón no es un permiso).
   Si alguien llama la función igual, sigue rebotando. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zC = ex('function renderPedidoCard(');
ok('renderPedidoCard existe', zC.length > 500);

console.log('\n— 1. en la obra ya NO se aprueba ni se genera OC —');
ok('no queda el botón genérico de avance de estado', !/nextLabel\.toUpperCase\(\)/.test(zC));
/* v1151: reapareció UNA mención de compras.autorizar — pero para lo CONTRARIO: excluir a
   compras del botón de recepción (_esSoloCompras). El invariante v1096 se conserva: ninguna
   rama HABILITA a compras a avanzar estado desde la obra. */
ok('compras.autorizar solo aparece para EXCLUIR (v1151), nunca para habilitar',
  (zC.match(/compras\.autorizar/g) || []).length === 1 && /_esSoloCompras/.test(zC) && /!_esSoloCompras/.test(zC));
ok('no queda el avance por rol de oficina', !/pedidos\.advance/.test(zC));

console.log('\n— 2. lo que Antonio SÍ quiere que quede —');
ok('YA RECIBÍ EL MATERIAL sigue', /YA RECIBÍ EL MATERIAL/.test(zC));
ok('la recepción por proveedor (v996) sigue', /RECIBÍ DE/.test(zC));
ok('VER DETALLE sigue', /VER DETALLE/i.test(zC));
ok('sigue avisando cuando falta autorizar la OC', /pedidoOcsResumen/.test(zC));
ok('el permiso de recibir sigue mandando', /_puedeRecibirEntrega/.test(zC));

console.log('\n— 3. COMPRAS conserva su circuito (no se rompió el otro lado) —');
ok('generarOrdenCompra sigue existiendo', ex('async function generarOrdenCompra(').length > 200);
ok('el botón de generar OC sigue en el modal de compras', /GENERAR OC POR PROVEEDOR/.test(html));
ok('compras sigue pudiendo marcar recibido por proveedor', /MARCAR RECIBIDO/.test(html));

console.log('\n— 4. la defensa real NO es el botón —');
const zA = ex('async function advancePedido(');
ok('advancePedido conserva su guard de autorización', /SOLO QUIEN AUTORIZA OC PUEDE APROBAR/.test(zA));
ok('el guard sigue mirando el permiso, no la UI', /compras\.autorizar/.test(zA));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
