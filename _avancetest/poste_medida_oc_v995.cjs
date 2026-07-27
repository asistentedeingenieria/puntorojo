/* v995 (bug reportado por Antonio 27-jul con fotos): pidió 434 postes
   "POSTE DE 2½" X 9.19' (0.35) CAL. 26 (MEDIDA ESPECIAL 2.8 M)" y al abrir GENERAR OC
   el material salía como "POSTE DE 2½" X 10' (0.35) CAL. 26" — la OC le pedía al
   proveedor una medida que NO es la que necesita la obra.

   CAUSA: buildPedidoOcItems reescribía el nombre con el del catálogo de compras
   (_ncDeCompra). Ese lookup usa _ocItemMemKey, que a propósito COLAPSA los postes a
   medida al de 10' (v968) para heredar proveedor y precio del producto base — pero ese
   colapso es para BUSCAR, nunca para MOSTRAR.

   FIX: el nombre que se imprime conserva la medida especial; la resolución automática
   (bodega / proveedor / precio / memoria) sigue usando el nombre BASE, en it.matchName,
   así que el proveedor y el precio salen igual que antes. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const ESP = 'POSTE DE 2½" X 9.19\' (0.35) CAL. 26 (MEDIDA ESPECIAL 2.8 M)';
const BASE = 'POSTE DE 2½" X 10\' (0.35) CAL. 26';

// ── el nombre base para buscar ──
const zB = ex('function _ocNombreBaseMedida(');
ok('existe _ocNombreBaseMedida', !!zB);
let fB = null;
try { fB = new Function('return (' + zB + ')')(); } catch(e){}
if (fB) {
  ok('el poste a medida colapsa al base de 10 pies', fB(ESP) === BASE);
  ok('un material normal no se toca', fB('CLAVO CON ROLDANA 1"') === 'CLAVO CON ROLDANA 1"');
  ok('un poste ESTÁNDAR tampoco se toca', fB(BASE) === BASE);
} else ok('_ocNombreBaseMedida evaluable', false);

// ── buildPedidoOcItems: nombre real para el proveedor, base para resolver ──
const zBuild = ex('function buildPedidoOcItems(');
ok('el nombre de un poste a medida NO se reemplaza por el del catálogo', /_ocMedidaEspecialMetros\(name\)/.test(zBuild));
ok('se guarda matchName para la resolución automática', /matchName/.test(zBuild));
let fBuild = null;
try {
  // v997: además consulta las VARIANTES de compra — stubs neutros (sin variantes)
  fBuild = new Function('_pedidoKeyParts', '_ncDeCompra', '_ocMedidaEspecialMetros', '_ocNombreBaseMedida', '_variantesDeCompra', '_varianteRecordada', 'activeProj',
                        'return (' + zBuild + ')');
} catch(e){}
if (fBuild) {
  const f = fBuild(
    k => ({ cat: 'PERFILERÍA', name: k }),                       // clave = nombre en el test
    n => (n === BASE ? 'POSTE 2½" 10 PIES CAL 26 (NOMBRE DEL EXCEL)' : null),
    n => { const m = String(n).match(/\(MEDIDA ESPECIAL\s+([\d.]+)\s*M\)/i); return m ? Number(m[1]) : null; },
    fB || (n => n),
    () => [], () => '', () => ({})
  );
  const outEsp = f({ items: { [ESP]: 434 } })[0];
  ok('la OC muestra la medida REAL que pidió la obra', outEsp && outEsp.name === ESP);
  ok('pero resuelve proveedor/precio con el nombre de compra del base', outEsp && outEsp.matchName === 'POSTE 2½" 10 PIES CAL 26 (NOMBRE DEL EXCEL)');
  const outNorm = f({ items: { [BASE]: 10 } })[0];
  ok('un material estándar sigue saliendo con el nombre del catálogo', outNorm && outNorm.name === 'POSTE 2½" 10 PIES CAL 26 (NOMBRE DEL EXCEL)');
} else ok('buildPedidoOcItems evaluable', false);

// ── la resolución automática usa matchName ──
const zAuto = ex('function autoAssignOcProviders(');
ok('la auto-asignación de proveedor usa matchName', /matchName \|\| it\.name/.test(zAuto));
ok('el despacho de bodega también', /_esItemBodega\(_mn\)|_esItemBodega\(it\.matchName \|\| it\.name\)/.test(zAuto));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
