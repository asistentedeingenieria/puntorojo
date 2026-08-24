/* v1272 (Antonio, 24-ago: "en los avances físicos de TODOS los proyectos los porcentajes
   me los des con dos decimales"): los PROMEDIOS de torre y nivel se mostraban redondeados
   a entero (Math.round) — una torre podía pasar semanas clavada en "3%" aunque la obra
   avanzara. Ahora el display va con DOS decimales (helper _pct2); el número CRUDO sigue
   alimentando umbrales y cuadritos (etapasFromPct compara floats sin problema). El % del
   APTO no cambia: es un UMBRAL exacto (15/30/45...), no un promedio — no pierde nada. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* 1. helper puro */
const srcP = ex('function _pct2(');
let f = null;
try { f = new Function(srcP + '; return _pct2;')(); } catch(e){}
ok('_pct2 existe y evalúa', typeof f === 'function');
if (f) {
  ok('22.91666 → "22.92"', f(22.91666) === '22.92');
  ok('0 → "0.00"', f(0) === '0.00');
  ok('100 → "100.00"', f(100) === '100.00');
  ok('3.0949 → "3.09"', f(3.0949) === '3.09');
  ok('basura → "0.00"', f(undefined) === '0.00' && f('x') === '0.00');
}

/* 2. vista principal: torre y nivel muestran con _pct2 y ya no redondean a entero */
const zTorre = ex('function renderTowerSummary(');
ok('torre: display con _pct2', /\$\{_pct2\(avg\)\}%/.test(zTorre) && !/Math\.round\(towerAvgStages/.test(zTorre));
const zNivel = ex('function renderLevelRow(');
ok('nivel: display con _pct2', /\$\{_pct2\(avg\)\}%/.test(zNivel) && !/Math\.round\(levelAvgStages/.test(zNivel));

/* 3. vista de cuadritos (físico por apto): torre y nivel también */
const iCuad = html.indexOf('// Grilla por torre y nivel');
const zCuad = html.slice(iCuad, iCuad + 3000);
ok('cuadritos: pctT con _pct2', /_pct2\(pctT\)/.test(zCuad) && !/Math\.round\(termT/.test(zCuad));
ok('cuadritos: pctL con _pct2', /_pct2\(pctL\)/.test(zCuad) && !/Math\.round\(termL/.test(zCuad));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
