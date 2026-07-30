/* v1013 — los dos prerrequisitos del control de gastos.

   1. EL AGUJERO DEL PRECIO 0 (bloque B8). A un material EXTRAORDINARIO se le podía asignar
      proveedor pero era imposible ponerle precio: el input nace disabled y updateOcPrecio lo
      rechaza salvo para postes a medida. Y la asimetría es peor de lo que parece: sin
      proveedor la generación se traba en seco, pero SIN PRECIO solo pregunta y deja pasar.
      Resultado: la orden sale con total 0. Cada orden en 0 que se cuele es una mentira
      permanente en el reporte de gasto que viene después — por eso se arregla ANTES.

   2. LA OBRA DESTINO DE LA ORDEN (bloque B1). Hoy oc.proyecto es TEXTO LIBRE escrito a mano
      en el modal: cualquiera escribe lo que quiera y una orden de la obra A puede mostrar el
      nombre de la B. El resumen "qué producto se fue a cada obra con su monto" apoyado en eso
      es arena. Se agrega oc.destinoProyectoId sembrado del pedido origen, SIN tocar
      oc.proyecto (no se pierde nada de lo ya escrito). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. el extraordinario puede llevar precio —');
const zPrecio = ex('function updateOcPrecio(');
ok('updateOcPrecio acepta el eventual, no solo el poste a medida', /eventual/.test(zPrecio));
ok('el que viene del catálogo sigue bloqueado', /CAT[ÁA]LOGO/.test(zPrecio));
ok('el input del eventual ya no nace disabled', /it\.aMedida \|\| it\.eventual/.test(html));

console.log('\n— 2. ninguna orden puede salir en Q 0 —');
const zGen = ex('function generarOrdenCompra(');
ok('la generación frena si un item quedó sin precio', /sinPrecio|precio <= 0|!\(.*precio > 0\)/.test(zGen));
ok('y lo dice con el nombre del material', /sinPrecio/.test(zGen));
/* antes solo PREGUNTABA: un confirm que se acepta sin leer dejaba pasar la orden en 0 */
ok('ya no alcanza con aceptar un aviso', !/confirm\([^)]*sin precio/i.test(zGen));

console.log('\n— 3. la orden sabe a qué obra fue —');
ok('la OC guarda el id de la obra destino', /destinoProyectoId/.test(zGen));
ok('sale del pedido origen, no del texto escrito a mano', /destinoProyectoId: [^,\n]*(pd|_pdOrigen|_ctx)/.test(zGen));
ok('oc.proyecto (el texto libre) se conserva intacto', /proyecto: proyectoOc/.test(zGen));
/* el pedido ya trae su proyectoId desde v1012; para bodega y varios no hay obra y queda vacío */
const zResolver = ex('function _destinoProyectoDePedido(');
ok('existe el resolutor', zResolver.length > 40);
let fR = null;
try { fR = new Function('return (' + zResolver + ')')(); } catch(e){}
if (fR) {
  ok('un pedido de obra devuelve su id', fR({ proyectoId: 'p1' }) === 'p1');
  ok('un pedido de bodega no tiene obra', fR({ esBodega: true, proyectoId: 'p1' }) === '');
  ok('uno de proyectos varios tampoco', fR({ esVarios: true }) === '');
  ok('un pedido viejo sin id no inventa uno', fR({ proyectoPedido: 'VICINIA' }) === '');
  ok('aguanta nulo', fR(null) === '');
} else { ['obra','bodega','varios','viejo','nulo'].forEach(n => ok(n + ' (evaluable)', false)); }

console.log('\n— 3b. el despacho de bodega no lleva forma de pago —');
/* Antonio: "si se selecciona proveedor como bodega central la forma de pago no aplicaría para
   la OC, ya que es algo que ya se compró y está en la bodega de la oficina". Es un traslado,
   no una compra: si llevara forma de pago entraría a cuentas por pagar como una deuda falsa. */
ok('la OC de despacho lo dice explícito', /NO APLICA · DESPACHO DE BODEGA/.test(zGen));
/* v1062 (Antonio: "¿por qué Q0 en cuentas por pagar si hay OCs de bodega al crédito?"):
   la bodega TAMBIÉN compra a crédito — el 0 forzado se quitó a propósito y los días se
   derivan del texto de la forma de pago (cxp_gastos_v1059.cjs sección 6) */
ok('y los días de crédito salen de la forma de pago', /credito: _diasCredito\(_pp\.formaPago \|\| formaPago\)/.test(zGen) && !/credito: esBodega \? 0 :/.test(zGen));

console.log('\n— 3c. ENVIAR A COMPRAS avisa de verdad —');
/* Antonio: "se envia a compras y solo no pasa nada... no se si se pidio". v996 ya limpiaba y
   redirigía, pero avisaba con un toast que se va solo. */
const zSub = ex('function submitPedido(');
ok('el aviso hay que cerrarlo (no es un toast que se va)', /prAlert\(\{[\s\S]{0,200}PEDIDO ENVIADO A COMPRAS/.test(zSub));
ok('dice el número del pedido', /_numLimpio\(numero\)/.test(zSub));
ok('y dice dónde verlo', /_dondeVerlo/.test(zSub));
ok('el de abastecimiento manda a BODEGA CENTRAL, no a la lista de la obra', /pedido\.esBodega\) \{[\s\S]{0,120}_abrirPanelBodega/.test(zSub));
ok('el formulario se limpia y se repinta (v996)', /renderPedidoForm\(\)/.test(zSub));

console.log('\n— 4. lo que no se rompe —');
ok('el poste a medida sigue siendo digitable', /aMedida/.test(zPrecio));
ok('no se toca el candado de precios del catálogo (v923)', /v923/.test(zPrecio));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
