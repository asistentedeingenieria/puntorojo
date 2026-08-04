/* v1130 — TRES COSAS DEL PASO PRODUCCIÓN → ORDEN DE COMPRA (Antonio, 4-ago, ya con v1129
   funcionando: la OC 5 salió de la OP 1):

   1. "antes de generarla, siempre que se genera una OC de una orden de producción, necesito que
      pida la opción de poder cambiar la fecha de entrega"
      La OP se emite semanas antes: el proveedor fabrica y recién después se acuerda cuándo
      entrega. Heredar la fecha de la OP a ciegas imprime un compromiso que ya venció.

   2. "la fecha de esta OC quiero que sea la fecha del día que se generó la OC y no la OP como
      está ahorita"
      La OC 5 salió fechada 27/07/2026 — el día de la OP — cuando se generó el 4 de agosto. La
      fecha del documento es la fecha en que se emite; es lo que mira el proveedor y contabilidad.

   3. "cuando ya la OP se le genera su OC quiero que la OP pase al historial"
      Una producción ya convertida no es trabajo pendiente: ocupa el lugar de lo que sí falta.
      Sigue existiendo como respaldo, pero dentro del historial colapsable. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zD = ex(code, 'window._ocDerivarDeOp = async function(');
ok('existe el derivador OP → OC', zD.length > 800);

console.log('\n— (1) pregunta la fecha de entrega antes de generar —');
ok('el modal trae un campo de fecha', /type="date"/.test(zD));
ok('lo rotula como fecha de entrega', /FECHA DE ENTREGA/i.test(zD));
ok('se captura por onchange (prConfirm destruye el modal antes del await, patrón v813)',
  /_opDerivarForm\.entrega = this\.value/.test(zD));
ok('el formulario se declara antes de abrir el modal', /_opDerivarForm\s*=\s*\{/.test(zD));
ok('viene prellenado con la fecha que traía la producción', /_fechaLatamAInput|value="\$\{/.test(zD));
ok('es opcional: sin tocarla la orden se genera igual',
  !/if\s*\(\s*!\s*(_opDerivarForm|form)\.entrega\s*\)\s*return/.test(zD));

console.log('\n— (2) la orden lleva la fecha del día en que se emite —');
ok('la fecha se toma de hoy, no del clon', /fecha:\s*\(typeof _dateALatam/.test(zD));
ok('y la de entrega sale de lo que se eligió', /fechaEntrega:/.test(zD));
ok('si no eligieron nada, respeta la que traía la producción',
  /fechaEntrega:[^,]*\?[^,]*:\s*\(op2\.fechaEntrega/.test(zD));

console.log('\n— (3) la producción ya convertida pasa al historial —');
const zR = ex(code, 'function renderOrdenesList(');
ok('la lista distingue una OP que ya tiene su orden', /ocDerivadaId/.test(zR));
ok('y la manda al historial en vez de dejarla arriba', /ocDerivadaId[\s\S]{0,200}_ocRecib/.test(zR));
/* v1125: lo que espera firma de finanzas va arriba SIEMPRE — una OP pendiente no debe
   esconderse solo porque alguien le derivó una orden */
ok('lo pendiente de autorizar sigue yendo arriba', /PENDIENTE_AUTORIZACION[\s\S]{0,160}_ocPend/.test(zR));

console.log('\n— lo que no debe cambiar —');
ok('la orden sigue naciendo AUTORIZADA (hereda la firma de la producción)', /status: 'AUTORIZADA'/.test(zD));
ok('sigue apuntando a su producción de origen', /opOrigenId: op2\.id/.test(zD));
ok('y la producción queda marcada como convertida', /ocDerivadaId = oc\.id/.test(zD));
ok('re-lee el state después del modal (patrón v769/v940)',
  zD.indexOf('_bodegaFindOc') !== zD.lastIndexOf('_bodegaFindOc'));
ok('sella _ts para el union-merge', /_ts = Date\.now\(\)/.test(zD));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
