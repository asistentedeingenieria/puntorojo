/* v1131 — CAMBIAR LA FECHA DE ENTREGA DE UNA ORDEN YA EMITIDA (Antonio, 4-ago):
   "no sé qué hacer con esta OC que ya generaste de la OP. Necesito que con esta OC ya pueda
    poner de alguna manera la fecha de entrega."

   v1130 arregló las órdenes NUEVAS (el modal pregunta la entrega al derivarlas), pero la OC 5
   ya estaba emitida y no había forma de tocarle la fecha: _ocEditarBorrador exige status
   PENDIENTE_AUTORIZACION y esa orden nace AUTORIZADA (hereda la firma de la producción).

   Y no es un caso puntual: las entregas se mueven todo el tiempo — el proveedor atrasa, la obra
   pide adelantar. Una orden emitida tiene que poder actualizar SU FECHA DE ENTREGA sin volver a
   pasar por finanzas, porque no cambia ni el monto ni el material ni quién autorizó.

   LÍMITE DELIBERADO: solo la fecha de ENTREGA. La fecha de EMISIÓN del documento no se toca
   desde acá — es el día en que se emitió, dato histórico de un papel que ya circuló. (La de la
   OC 5 quedó mal por el bug de v1130 y se corrige aparte, por comando, no con una función que
   invite a reescribir fechas de documentos viejos.) */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const z = ex(code, 'window._ocCambiarEntrega = async function(');
ok('existe la acción', z.length > 400);

console.log('\n— lo que pide y lo que guarda —');
ok('abre un campo de fecha', /type="date"/.test(z));
ok('precargado con la entrega actual',
  /value="'\s*\+\s*_e\(_ini\)/.test(z) && /oc\.fechaEntrega/.test(z));
ok('capturado por onchange (prConfirm destruye el modal antes del await)', /_ocEntForm\.f = this\.value/.test(z));
ok('guarda en fechaEntrega', /fechaEntrega =/.test(z));
ok('convierte del formato del input al del documento', /_fechaInputALatam\(/.test(z));
ok('deja vaciarla (una entrega sin fecha acordada es un dato válido)', /: ''/.test(z));

console.log('\n— seguridad y sync —');
ok('solo compras o admin', /compras\.autorizar/.test(z) && /users\.manage/.test(z));
ok('re-lee la orden después del modal (patrón v769/v940)',
  z.indexOf('_bodegaFindOc') !== z.lastIndexOf('_bodegaFindOc'));
ok('sella _ts (el contenedor viaja por union-merge)', /_ts = /.test(z));
ok('sube el cambio de inmediato', /forceUploadNow/.test(z));
ok('deja rastro de quién la movió', /logActivity/.test(z));
ok('repinta la lista al terminar', /renderOrdenesList/.test(z));

console.log('\n— NO toca lo que no debe —');
ok('no cambia la fecha de emisión del documento', !/\.fecha\s*=[^=]/.test(z));
ok('no cambia el monto', !/\.total\s*=[^=]/.test(z));
ok('no cambia el estado ni la autorización', !/\.status\s*=[^=]/.test(z) && !/autorizadoPor\s*=/.test(z));

console.log('\n— dónde se ve —');
const zR = ex(code, 'function renderOrdenesList(');
ok('hay botón en la fila de la orden', /_ocCambiarEntrega\(/.test(zR));
ok('el rótulo dice de qué se trata', /ENTREGA/.test(zR));
/* una orden cancelada no tiene entrega que mover */
ok('no sale en las canceladas', /CANCELADA/.test(zR));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
