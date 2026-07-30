/* v1083 — DASHBOARD DE RENTABILIDAD · Fase 2: la vista.
   El dashboard ejecutivo (renderDashboard, L12058) mostraba SOLO ingreso y avance: nunca un
   número de costo. Acá entra la rentabilidad: una tabla por obra con venta, costo, margen,
   CPI y semáforo, más el consolidado de la empresa.
   Gate: _puedeVerGastos() — el mismo que ya protege los montos de gasto en el resto de la
   app; sin él, quien entra al dashboard sigue viendo lo de siempre y ni se entera. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. el consolidado de TODA la empresa —');
const zT = ex('function _rentTotales(');
let tot = null;
try { tot = new Function('_rentDatosProyecto', 'return (' + zT + ')'); } catch(e){}
ok('existe _rentTotales y es pura', !!tot && zT.length > 250);
if (tot) {
  const filas = {
    a: { id:'a', nombre:'OBRA A', ventaContratadaCI: 1120000, ventaEjecutadaSI: 300000, costoRealSI: 200000, cobradoCI: 400000, porCobrarCI: 100000, margenHoySI: 100000, margenHoyPct: 0.33, cpi: 1.2, semaforo: 'verde', avancePct: 0.4 },
    b: { id:'b', nombre:'OBRA B', ventaContratadaCI: 560000,  ventaEjecutadaSI: 200000, costoRealSI: 250000, cobradoCI: 150000, porCobrarCI: 50000,  margenHoySI: -50000, margenHoyPct: -0.25, cpi: 0.7, semaforo: 'rojo',  avancePct: 0.3 }
  };
  const f = tot(p => filas[p.id]);
  const r = f([{ id:'a' }, { id:'b' }]);
  ok('suma la venta ejecutada de todas las obras', r.ventaEjecutadaSI === 500000);
  ok('suma el costo real', r.costoRealSI === 450000);
  ok('el margen consolidado sale de los totales', Math.abs(r.margenSI - 50000) < 0.01);
  ok('y su porcentaje también', Math.abs(r.margenPct - (50000 / 500000)) < 0.0001);
  ok('cuenta las obras en rojo (para la alerta)', r.enRojo === 1);
  ok('trae la lista de obras para pintar', r.obras.length === 2);
  ok('las ordena por margen: la peor primero', r.obras[0].id === 'b');
  ok('sin obras no revienta ni divide entre cero', f([]).margenPct === null && f([]).ventaEjecutadaSI === 0);
}

console.log('\n— 2. la tabla por obra —');
const zH = ex('function _rentTablaHTML(');
ok('existe _rentTablaHTML', zH.length > 400);
ok('gatea por el permiso de ver gastos (no filtra costos a cualquiera)', /_puedeVerGastos\(\)/.test(zH));
ok('usa el motor (no recalcula por su cuenta)', /_rentTotales\(|_rentDatosProyecto\(/.test(zH));
/* las 4 columnas: lo vendido se rotula CONTRATADO (es el lenguaje de la app) */
ok('muestra contratado, costo, margen y CPI', /MARGEN/.test(zH) && /CPI/.test(zH) && /COSTO/.test(zH) && /CONTRATADO/.test(zH));
ok('el semáforo se ve como color, no solo como número', /semaforo/.test(zH) && /(#166534|#16A34A)/.test(zH) && /(#B91C1C|#DC2626)/.test(zH));
ok('los montos se pintan con el formato de la app', /fmtQ\(/.test(zH));
ok('escapa lo que viene de datos (nombres de obra)', /_rentEsc\(|escapeHtml\(/.test(zH));
ok('avisa cuando una obra aún no tiene costo cargado', /SIN DATOS|sin-datos/.test(zH));
ok('explica que el margen va sin IVA (para que nadie lo malinterprete)', /SIN IVA/.test(zH));

console.log('\n— 3. enganchado en el dashboard ejecutivo —');
const zD = ex('function renderDashboard(');
ok('el dashboard lo pinta', /_rentTablaHTML\(\)/.test(zD));
ok('va después del resumen por proyecto', zD.indexOf('_rentTablaHTML') > zD.indexOf('dashProjects'));
ok('tiene su propio contenedor en el HTML', /id="dashRent"/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
