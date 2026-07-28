/* v1017 — FLUJO ORDEN DE PRODUCCIÓN → ORDEN DE COMPRA.
   Antonio definió el circuito: "Las ordenes de produccion son para notificar al proveedor y
   despues de eso cuando ellos confirman que ya estan listo el material solicitado ya se genera
   una orden de compra con exactamente la misma informacion que tiene la orden de produccion
   solo que como orden de compra para ahora si descontarlo y agregar el gasto en el proyecto."

   DECISIONES QUE TOMÓ ÉL:
   - La OC nace COPIA EXACTA de la OP, bloqueada, heredando la autorización de finanzas.
   - El despacho de bodega se valoriza al precio con que entró (ya está, v1014).

   POR QUÉ NACE UNA OC NUEVA Y LA OP NO SE CONVIERTE:
   1. El papel de la OP ya salió firmado al proveedor: mutarle el tipo falsifica un documento
      ya emitido.
   2. Cada serie tiene su correlativo propio, así que la OP 1 no bloquea a la OC 1.
   3. El sync es union por id: crear un objeto nuevo es aditivo y sobrevive; mutar el tipo de
      uno existente se puede perder en un merge. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. "el proveedor confirmó que está listo" —');
/* Es un CAMPO, no un status nuevo: un status rompería todos los filtros que comparan
   status === 'AUTORIZADA' (el botón de recibir, el avance, allPedidoOcsAuthorized). */
ok('se marca con un campo, no con un status nuevo', /produccionLista/.test(html) && !/'LISTA_PRODUCCION'|"LISTA_PRODUCCION"/.test(html));
const zM = ex('window._ocMarcarProduccionLista = async function');
ok('existe la acción', zM.length > 100);
ok('sella quién y cuándo', /ts:/.test(zM) && /por:/.test(zM));
ok('sella _ts de la orden (union-merge)', /_ts = Date\.now\(\)/.test(zM));
ok('el primero gana: no se sobrescribe', /produccionLista[\s\S]{0,200}return/.test(zM));
ok('lo marca quien habla con el proveedor, no finanzas', /compras\.autorizar|materiales\.bodega/.test(zM));

console.log('\n— 2. de la OP nace la OC —');
const zD = ex('window._ocDerivarDeOp = async function');
ok('existe el constructor propio', zD.length > 200);
/* NO se reusa generarOrdenCompra: re-arma todo desde el pedido, borra los borradores
   pendientes y choca con el candado v927 de tres puertas */
ok('no pasa por generarOrdenCompra', !/generarOrdenCompra\(/.test(zD));
ok('la OC nace con serie OC', /serie: 'OC'/.test(zD));
ok('con id propio', /id: 'oc-'/.test(zD));
ok('y su folio de la serie OC', /_primerNumeroLibre|_usadosSerie|folio/.test(zD));
/* copia exacta: Object.assign parte de la OP entera, así que items, precios, proveedor,
   entrega y forma de pago viajan tal cual; solo se pisa lo que DEBE cambiar */
ok('copia exacta desde la OP', /Object\.assign\(\{\}, op2/.test(zD));
ok('y limpia lo que no se hereda', /impreso: false/.test(zD) && /factura: null/.test(zD));
ok('no arrastra la marca de producción', /esProduccion: false/.test(zD));
ok('hereda la autorización de la OP', /AUTORIZADA/.test(zD));
ok('deja el rastro de dónde vino', /opOrigenId/.test(zD));
ok('y la OP queda marcada como ya convertida', /ocDerivadaId/.test(zD));
ok('sella _ts en las dos', /_ts/.test(zD));
/* la trampa del sync: dos personas derivando a la vez crearían dos OCs y el gasto se
   duplicaría. Hay que re-leer del state vivo DESPUÉS del await (regla v769/v940). */
ok('guarda contra doble derivación', /ocDerivadaId[\s\S]{0,300}return/.test(zD));
ok('re-lee del state vivo después del await', /_bodegaFindOc|_findPedidoGlobal/.test(zD));

console.log('\n— 3. la OP deja de contaminar el circuito —');
/* Con la OC derivada, el mismo material pediría DOS firmas de recepción si la OP siguiera
   contando como entrega viva. Y el avance por apartamento la daba por despachada. */
const zEnt = ex('function _pedidoEntregas(');
ok('la OP no cuenta como entrega por recibir', /esProduccion|serie === 'OP'|_ocSerieDe/.test(zEnt));
const zDesp = ex('function _itemsDespachadosEtapa(');
ok('la OP no cuenta como material despachado', /esProduccion|'OP'/.test(zDesp));

console.log('\n— 4. sigue sin ser gasto —');
ok('el motor de gastos excluye la producción', /serie === 'OP'/.test(ex('function _gastosDeProyecto(')));
ok('y las cuentas por pagar también', /serie === 'OP'/.test(ex('function _cuentasPorPagar(')));

console.log('\n— 5. se ve en la pantalla —');
ok('la orden dice si espera al proveedor o ya está lista', /ESPERANDO PROVEEDOR|LISTA PARA COMPRA/.test(html));
ok('hay botón para marcar que el proveedor confirmó', /_ocMarcarProduccionLista\(/.test(html));
ok('y para generar la OC de esa OP', /_ocDerivarDeOp\(/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
