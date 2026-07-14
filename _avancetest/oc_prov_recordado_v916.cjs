/* v916 (pedido de Antonio, con foto de la OC): en las OCs de pedidos DE RECETA el
   proveedor se selecciona AUTOMÁTICAMENTE. Mecanismo: memoria por material —
   p.materiales.ocProvPorItem[clave] = proveedorId se guarda al GENERAR la OC de un
   pedido de receta, y autoAssignOcProviders(pd) lo pre-selecciona la próxima vez
   (cuando el catálogo de precios no matchea, que es el caso de los nombres reales
   y los postes a medida). La clave ignora el sufijo "(MEDIDA ESPECIAL N m)" para
   sobrevivir cambios de medida. Los pedidos manuales (no receta) no cambian. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. clave de memoria por material ──
const deps = extractFn('normOcName') + '\n' + extractFn('_ocItemMemKey') + '\n';
ok('_ocItemMemKey existe', /_ocItemMemKey/.test(deps) && deps.length > 80);
if (/_ocItemMemKey/.test(deps)) {
  const f = new Function(deps + 'return _ocItemMemKey;')();
  ok('la clave ignora la medida especial',
    f("POSTE DE 2½\" X 9.19' (0.35) CAL. 26 (MEDIDA ESPECIAL 2.8 m)") === f("POSTE DE 2½\" X 7.87' (0.35) CAL. 26 (MEDIDA ESPECIAL 2.4 m)")
    || f("POSTE X 10' (MEDIDA ESPECIAL 2.8 m)") === f("POSTE X 10'"));
  ok('materiales distintos → claves distintas', f('CANAL DE 2 ½" X 10\'') !== f('TABLAYESO 12.7mm'));
}

// ── 2. autoAssignOcProviders(pd) pre-selecciona el proveedor recordado ──
const srcAuto = extractFn('autoAssignOcProviders');
ok('autoAssignOcProviders recibe el pedido', /function autoAssignOcProviders\(pd\)/.test(html));
ok('usa la memoria ocProvPorItem', /ocProvPorItem/.test(srcAuto));
ok('solo aplica a pedidos DE RECETA', /esDeReceta/.test(srcAuto));
if (srcAuto) {
  const env = deps
    + extractFn('_ocMedidaEspecialMetros') + '\n'
    + extractFn('findCatalogProductForProvider') + '\n'
    + extractFn('findBestProviderForItem') + '\n'
    + 'var PROVS=[{id:"pr1",nombre:"SISTEGUA",productos:[]}];\n'
    + 'function _getProveedores(){ return PROVS; }\n'
    + 'var P={materiales:{ocProvPorItem:{},postesPrecioMedida:{}}};\n'
    + 'function activeProj(){ return P; }\n';
  const run = new Function(env + srcAuto
    + '\nreturn function(items, pd, mem){ P.materiales.ocProvPorItem = mem || {}; ocWorkingItems = items; autoAssignOcProviders(pd); return items; };\nvar ocWorkingItems;')();
  const key = new Function(deps + 'return _ocItemMemKey;')()("POSTE DE 2½\" X 9.19' (0.35) CAL. 26 (MEDIDA ESPECIAL 2.8 m)");
  const items1 = run(
    [{ name: "POSTE DE 2½\" X 9.19' (0.35) CAL. 26 (MEDIDA ESPECIAL 2.8 m)", qty: 424, precio: 0, proveedorId: '', autoAssigned: false }],
    { esDeReceta: true }, { [key]: 'pr1' });
  ok('pedido de receta: proveedor recordado pre-seleccionado', items1[0].proveedorId === 'pr1' && items1[0].eventual === false && items1[0].provRecordado === true);
  const items2 = run(
    [{ name: "POSTE DE 2½\" X 9.19' (0.35) CAL. 26 (MEDIDA ESPECIAL 2.8 m)", qty: 424, precio: 0, proveedorId: '', autoAssigned: false }],
    { esDeReceta: false }, { [key]: 'pr1' });
  ok('pedido manual: NO se auto-selecciona (comportamiento intacto)', items2[0].proveedorId === '' && items2[0].eventual === true);
  const items3 = run(
    [{ name: 'MATERIAL SIN MEMORIA', qty: 1, precio: 0, proveedorId: '', autoAssigned: false }],
    { esDeReceta: true }, {});
  ok('sin memoria → queda eventual como antes', items3[0].proveedorId === '' && items3[0].eventual === true);
}

// ── 3. generarOrdenCompra guarda la memoria ──
const srcGen = extractFn('generarOrdenCompra');
ok('al generar OC de pedido de receta guarda ocProvPorItem', /ocProvPorItem/.test(srcGen) && /esDeReceta/.test(srcGen));

// ── 4. la UI avisa que vino recordado ──
ok('renderOcItems muestra PROVEEDOR RECORDADO', /PROVEEDOR RECORDADO/.test(extractFn('renderOcItems')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
