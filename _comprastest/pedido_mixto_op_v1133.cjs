/* v1133 — LOS POSTES A MEDIDA SIEMPRE SALEN COMO ORDEN DE PRODUCCIÓN (Antonio, 4-ago):
   "cuando en un pedido hay varias cosas, con el tema de los postes a la medida, que son ÓRDENES
    DE PRODUCCIÓN, necesito que me lo generes por aparte y no como ahorita que lo contempla
    dentro de la OC de Sistegua... el poste a la medida SIEMPRE debe de ser una orden de
    producción."

   CAUSA EXACTA (generarOrdenCompra):
       const groups = {};
       ocWorkingItems.forEach(it => { groups[it.proveedorId].push(it); });   ← solo por proveedor
       ...
       const esProduccion = !esBodega && items.length > 0 && items.every(it => it.aMedida);
   La app SÍ sabe emitir órdenes de producción y cada material ya trae su marca `aMedida` (la
   etiqueta "A MEDIDA · PRECIO MANUAL" que se ve en el modal). Pero exige que TODOS los del grupo
   sean a medida, y como agrupa solo por proveedor, el grupo de Sistegua queda con el poste MÁS
   canal y tornillos ⇒ every() da false ⇒ sale orden de compra con el poste adentro.
   Por eso el flujo "SOLO POSTES A MEDIDA" sí funciona: ese pedido trae únicamente postes.

   EL ARREGLO: agrupar por PROVEEDOR + TIPO. Cada grupo queda homogéneo y cae solo en su serie.
   Una sola función decide la clave, y la usan LOS DOS lugares que agrupan (el modal que muestra
   la vista previa y el generador). Si cada uno agrupara por su cuenta, el modal podría mostrar
   un reparto distinto del que se emite — y Antonio pidió expresamente ver el reparto antes de
   generar, así que la vista previa no puede mentir.

   DECISIONES DE ANTONIO (consultadas antes de escribir):
   · separación AUTOMÁTICA y visible en el modal antes de generar;
   · cada documento con su PROPIA fecha de entrega (el poste se fabrica, tarda distinto). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zK = ex(code, 'function _ocGrupoKey(');
ok('existe la clave de agrupación', zK.length > 80);
ok('es PURA (no toca el DOM ni el state)', !/document\.|state\./.test(zK));

let K = null;
try { K = new Function('OC_NO_PROVIDER', zK + '\nreturn _ocGrupoKey;')('__SIN__'); }
catch(e){ console.log('   (no compiló: ' + e.message + ')'); }

if (K) {
  console.log('\n— el caso real de Antonio (pedido VLA-9) —');
  const poste  = { proveedorId:'sistegua', aMedida:true,  name:'POSTE DE 2½" X 9.19\' (MEDIDA ESPECIAL 2.8 M)' };
  const canal  = { proveedorId:'sistegua', aMedida:false, name:'CANAL DE 2 ½" X 10\'' };
  const torn1  = { proveedorId:'sistegua', aMedida:false, name:'CIENTO DE TORNILLO DE 1"' };
  const fulmi  = { proveedorId:'ferretera', aMedida:false, name:'FULMINANTE TIRA CAL. 27' };

  ok('el poste a medida NO cae en el mismo grupo que el canal', K(poste) !== K(canal));
  ok('canal y tornillo del mismo proveedor SÍ van juntos', K(canal) === K(torn1));
  ok('el otro proveedor sigue en su propio grupo', K(fulmi) !== K(canal));
  ok('la clave del grupo de compra no cambia (no rompe lo que ya funcionaba)', K(canal) === 'sistegua');
  ok('la de producción se distingue', /OP/.test(K(poste)));

  console.log('\n— dos proveedores distintos, ambos con postes —');
  ok('cada proveedor tiene su propia producción',
    K({ proveedorId:'A', aMedida:true }) !== K({ proveedorId:'B', aMedida:true }));

  console.log('\n— los pseudo-proveedores no se parten —');
  /* bodega, pre-pago y trasiego ya son documentos de otra especie: partirlos por "a medida"
     los sacaría de su propio circuito */
  ok('BODEGA no se parte', K({ proveedorId:'_bodega', aMedida:true }) === '_bodega');
  ok('COMPRA PRE-PAGO no se parte', K({ proveedorId:'_dpp:m1', aMedida:true }) === '_dpp:m1');
  ok('TRASIEGO no se parte', K({ proveedorId:'_tras:vla', aMedida:true }) === '_tras:vla');

  console.log('\n— bordes —');
  ok('sin proveedor cae en el grupo de siempre', K({ aMedida:false }) === '__SIN__');
  ok('sin proveedor pero a medida también se separa', K({ aMedida:true }) !== K({ aMedida:false }));
  ok('un item vacío no lo tumba', typeof K({}) === 'string');
  ok('null no lo tumba', typeof K(null) === 'string');
}

console.log('\n— LOS DOS lugares agrupan con la MISMA función —');
/* si el modal y el generador agruparan distinto, la vista previa mostraría un reparto y se
   emitiría otro */
const zGen = ex(code, 'async function generarOrdenCompra(') || ex(code, 'function generarOrdenCompra(');
const zRen = ex(code, 'function renderOcItems(');
ok('el generador usa la clave', /_ocGrupoKey\(/.test(zGen));
ok('el modal (vista previa) usa la misma', /_ocGrupoKey\(/.test(zRen));
ok('ya nadie agrupa por proveedorId pelado',
  !/groups\[it\.proveedorId\]/.test(code));

console.log('\n— la serie que sale de cada grupo —');
ok('el grupo homogéneo de postes da ORDEN DE PRODUCCIÓN', /esProduccion/.test(zGen));
ok('y el resto sigue dando ORDEN DE COMPRA', /'OC'/.test(zGen));
ok('el proveedor real se extrae de la clave compuesta', /_provIdReal|split\('\|'\)/.test(zGen));

console.log('\n— cada documento con su fecha (lo que pidió Antonio) —');
ok('la fecha por grupo se guarda con la clave del grupo', /_ocPorProv/.test(zRen));
ok('el generador lee la fecha con la misma clave', /_ocPorProv \|\| \{\}\)\[/.test(zGen));

console.log('\n— se ve antes de generar —');
ok('el modal rotula el grupo de producción', /PRODUCCIÓN/.test(zRen));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
