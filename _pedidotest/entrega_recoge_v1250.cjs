/* v1250 (Antonio, 17-ago, con la OC de SISTEGUA bloqueada por "falta LA DIRECCIÓN"):
   "a veces alguien de mi empresa va al proveedor a recoger el material" — la entrega
   tipo RECOGEMOS no lleva dirección. Tres toques:
   1. Opción fija "RECOGEMOS EN EL PROVEEDOR" en el desplegable de ENTREGAR A — al
      elegirla, el campo se siembra con "RECOGE: " listo para el nombre.
   2. _ocEntregaFalta reconoce el modo RECOGE: pide solo QUIÉN RECOGE (nombre; el
      teléfono es opcional), nada de dirección. El aviso muestra el ejemplo correcto.
   3. La hoja imprime "*RETIRA EN EL PROVEEDOR:" en vez de "*ENTREGAR A:". */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— 1. la opción en el desplegable —');
ok('existe RECOGEMOS EN EL PROVEEDOR con valor _recoge', /_recoge">RECOGEMOS EN EL PROVEEDOR/.test(html));
const zA = ex('function applyOcDireccion(');
ok('elegirla siembra el campo con RECOGE:', /_recoge/.test(zA) && /RECOGE: /.test(zA));

console.log('— 2. la validación entiende el modo RECOGE —');
const zF = ex('function _ocEntregaFalta(');
let f = null;
try { f = new Function('return (' + zF + ')')(); } catch(e){}
if (f) {
  ok('RECOGE + nombre pasa sin dirección', f('RECOGE: RONAL PÉREZ').length === 0);
  ok('el caso real de Antonio pasa', f('RECOGE RONAL').length === 0);
  ok('RECOGE solo (sin nombre) pide quién', f('RECOGE:').some(x => /QUIÉN RECOGE/.test(x)));
  ok('una entrega normal sigue exigiendo dirección y contacto', f('OBRA TIFFANY').length === 2);
  ok('la dirección completa de siempre sigue pasando', f('4TA CALLE 5-20 ZONA 3, MIXCO — CONTACTO: JULIO CHARVAC 5555-1234').length === 0);
} else ok('_ocEntregaFalta evaluable', false);
const zAv = ex('window._ocAvisoEntrega = function');
ok('el aviso muestra el ejemplo del modo correcto', /RECOGE: RONAL/.test(zAv));

console.log('— 3. la hoja imprime el rótulo correcto —');
const zP = ex('function printOrdenCompra(');
ok('RETIRA EN EL PROVEEDOR cuando el texto empieza con RECOGE', /RETIRA EN EL PROVEEDOR/.test(zP) && /ENTREGAR A:/.test(zP));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
