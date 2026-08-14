/* v1209 — GASTOS DE PROYECTOS VARIOS EN COMPRAS (Antonio, 14-ago): "que me salga también
   los gastos de los proyectos varios, desglosado por cada uno, y que se vaya actualizando
   con los proyectos nuevos que vayan entrando... ordenado y visiblemente bien con gráficas."

   TODO DERIVADO, cero escritura (regla v1042): _variosGastosDatos() agrupa en vivo desde
   el store de varios (v1002) por proyectito — gasto = órdenes AUTORIZADAS (OP no es gasto,
   v1017), split COMPRA/DESPACHO con los colores de la casa — y suma los DPP/TRAS cuyo
   destino es un proyectito (viven en el contenedor de la madre). Un proyectito nuevo
   aparece SOLO en el próximo render. El bloque además entra como fila agregada
   "PROYECTOS VARIOS (n)" al dashboard de empresa para que el total no mienta. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— la derivación (funcional, con stubs) —');
const z = ex(code, 'function _variosGastosDatos(');
ok('existe', !!z);
try {
  const mk = new Function('_variosMatStore', '_dppOrdenesGlobal', '_ocSerieDe', 'return (' + z + ')');
  const f = mk(
    () => ({ ordenes: [
      { status: 'AUTORIZADA', total: 100, proyecto: 'CASA X', numero: 'X-OC 1', proveedorNombre: 'P' },
      { status: 'AUTORIZADA', total: 50, esDespacho: true, proyecto: 'CASA X', numero: 'X-DESP 1' },
      { status: 'PENDIENTE_AUTORIZACION', total: 999, proyecto: 'CASA X', numero: 'X-OC 2' },
      { status: 'AUTORIZADA', total: 70, proyecto: 'CASA Y', numero: 'Y-OC 1' },
      { status: 'AUTORIZADA', total: 500, proyecto: 'CASA X', numero: 'X-OP 1', esProduccion: true }
    ], pedidos: [] }),
    () => [ { status: 'AUTORIZADA', total: 30, esPrepago: true, esDespacho: true, destinoProyectoNombre: 'CASA Y', numero: 'DPP 9' } ],
    (o) => (o && o.esProduccion) ? 'OP' : ((o && o.esDespacho) ? 'DESP' : 'OC')
  );
  const d = f();
  ok('solo AUTORIZADAS (la pendiente de Q999 queda fuera)', d.total === 250);
  ok('la OP no es gasto (v1017)', !d.proys.some(x => x.ordenes.some(o => /OP/.test(String(o.numero)))));
  ok('agrupa por proyectito y ordena por total desc', d.proys[0].nombre === 'CASA X' && d.proys[0].total === 150);
  ok('split compra/despacho', d.proys[0].compra === 100 && d.proys[0].despacho === 50);
  ok('los DPP hacia un proyectito entran como despacho', d.proys[1].nombre === 'CASA Y' && d.proys[1].despacho === 30 && d.proys[1].total === 100);
} catch(e){ ok('evalúa con stubs', false); console.log('   ', e.message); }

console.log('\n— el bloque visual y su enganche —');
const h = ex(code, 'function _variosGastosHTML(');
ok('el bloque existe con los colores de la casa (COMPRA azul / DESPACHO verde)', /1D4ED8/.test(h) && /166534/.test(h));
ok('cada proyectito se puede expandir para ver sus órdenes', /_vgd/.test(h));
ok('enganchado en el render de la pestaña GASTOS (los DOS sitios)', (code.match(/_comprasGastosDashHTML\(\) \+ _variosGastosHTML\(\)/g) || []).length >= 2);
ok('los varios entran al total de empresa como fila agregada', /PROYECTOS VARIOS \(/.test(ex(code, 'function _comprasGastosDashDatos(')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
