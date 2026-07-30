/* v1084 — DASHBOARD DE RENTABILIDAD · Fase 3: flujo de caja + captura de los 2 datos.
   1. FLUJO DE CAJA: lo que ENTRA (estimaciones presentadas y aún no cobradas, ya netas de
      amortización y retención — es lo que el cliente realmente deposita) contra lo que SALE
      (cuentas por pagar a proveedores con su vencimiento). Todo derivado, nada capturado.
   2. CAPTURA: margen objetivo y % de indirectos por obra. Antonio: "los indirectos te los
      doy después" — así que el campo existe, arranca en 0 y no inventa costo. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. flujo de caja: lo que entra contra lo que sale —');
const zF = ex('function _rentFlujoCaja(');
let fc = null;
try { fc = new Function('_rentDatosProyecto','_cuentasPorPagar','return (' + zF + ')'); } catch(e){}
ok('existe _rentFlujoCaja y es pura', !!fc && zF.length > 300);
if (fc) {
  const datos = { a: { id:'a', nombre:'OBRA A', porCobrarCI: 300000, cobradoCI: 500000 },
                  b: { id:'b', nombre:'OBRA B', porCobrarCI: 100000, cobradoCI: 200000 } };
  const cxp = { total: 250000, totalVencido: 40000, cuentas: [
    { numero:'OC 1', proveedorNombre:'X', saldo: 150000, vence:'05/08/2026', vencida:false, destinoProyectoId:'a' },
    { numero:'OC 2', proveedorNombre:'Y', saldo: 60000,  vence:'25/07/2026', vencida:true,  destinoProyectoId:'a' },
    { numero:'OC 3', proveedorNombre:'Z', saldo: 40000,  vence:'',           vencida:false, destinoProyectoId:'b' }
  ] };
  const f = fc(p => datos[p.id], () => cxp);
  const r = f([{ id:'a' }, { id:'b' }]);
  ok('lo por cobrar suma las obras', r.porCobrarCI === 400000);
  ok('lo por pagar viene de cuentas por pagar', r.porPagar === 250000);
  ok('el saldo es la diferencia', r.saldo === 150000);
  ok('separa lo YA VENCIDO (lo urgente)', r.vencido === 40000);
  ok('trae las cuentas próximas a vencer, las vencidas primero', r.proximas.length === 3 && r.proximas[0].vencida === true);
  ok('las que no tienen fecha van al final', r.proximas[r.proximas.length - 1].vence === '');
  ok('sin datos no revienta ni inventa', fc(() => ({ porCobrarCI: 0, cobradoCI: 0 }), () => ({ total: 0, totalVencido: 0, cuentas: [] }))([]).saldo === 0);
}

console.log('\n— 2. los 2 datos que Antonio captura por obra —');
const zG = ex('window._rentGuardarConfig = function');
let g = null;
try { g = new Function('state','saveState','showToast','renderDashboard','return (' + zG.replace('window._rentGuardarConfig = ', '') + ')'); } catch(e){}
ok('existe _rentGuardarConfig', !!g && zG.length > 200);
if (g) {
  const st = { projects: [{ id: 'p1' }] };
  let guardado = 0;
  const f = g(st, () => { guardado++; }, () => {}, () => {});
  f('p1', '25', '8');
  ok('guarda el margen objetivo como fracción (25 → 0.25)', st.projects[0].rentMargenObjetivo === 0.25);
  ok('y los indirectos igual (8 → 0.08)', st.projects[0].rentIndirectosPct === 0.08);
  ok('persiste', guardado > 0);
  f('p1', '150', '-5');
  ok('un margen absurdo se acota a 0..100', st.projects[0].rentMargenObjetivo <= 1);
  ok('un indirecto negativo se acota a 0', st.projects[0].rentIndirectosPct >= 0);
  f('p1', '', '');
  ok('vacío = sin dato, no rompe', typeof st.projects[0].rentIndirectosPct === 'number');
  ok('proyecto inexistente no revienta', (function(){ try { f('nope', '10', '2'); return true; } catch(e){ return false; } })());
}

console.log('\n— 3. se ve y se puede editar —');
const zH = ex('function _rentTablaHTML(');
ok('cada obra tiene su botón de ajustes', /_rentAbrirConfig\(/.test(zH));
ok('el bloque de flujo de caja se pinta', /_rentFlujoHTML\(\)|_rentFlujoCaja\(/.test(html));
const zFH = ex('function _rentFlujoHTML(');
ok('el flujo muestra por cobrar, por pagar y el saldo', /POR COBRAR/.test(zFH) && /POR PAGAR/.test(zFH) && /SALDO/.test(zFH));
ok('resalta lo vencido', /VENCID/.test(zFH));
ok('respeta el permiso de ver gastos', /_puedeVerGastos\(\)/.test(zFH));
ok('el modal de ajustes solo lo abre quien puede', /_puedeVerGastos\(\)|users\.manage/.test(ex('window._rentAbrirConfig = ')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
