/* v1085 — DASHBOARD DE RENTABILIDAD · Fase 4: la CURVA S (avance acumulado en el tiempo).
   Se reconstruye del historial que la app YA guarda: a.stagesTs[i] es el sello del momento
   en que se marcó cada paso del avance. La etapa económica i se da por cerrada con el sello
   del ÚLTIMO paso que la compone (RENT_ETAPAS[i].pasos - 1).
   HONESTIDAD: no existe fecha de fin planificada en el proyecto, así que NO se dibuja una
   "curva planificada" inventada. Se grafica el avance REAL acumulado; si el proyecto tiene
   fecha de inicio, se muestra el ritmo. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
const _mRE = html.match(/const RENT_ETAPAS = \[[\s\S]*?\];/);
const RENT_ETAPAS = _mRE ? new Function('return ' + _mRE[0].replace(/^const RENT_ETAPAS = /, '').replace(/;$/, ''))() : [];
const YM = (y, m) => new Date(y, m - 1, 15).getTime();

console.log('\n— 1. la serie de avance acumulado por mes —');
const zS = ex('function _rentSerieAvance(');
let s = null;
try { s = new Function('RENT_ETAPAS', 'return (' + zS + ')'); } catch(e){}
ok('existe _rentSerieAvance y es pura', !!s && zS.length > 400);
if (s) {
  const f = s(RENT_ETAPAS);
  /* 2 aptos. El A cerró sus 4 etapas entre mayo y agosto; el B solo la 1RA en junio.
     stagesTs tiene 6 posiciones; las etapas económicas cierran en los índices 1,3,4,5. */
  const p = { towers: [{ levels: [{ aptos: [
    { stagesTs: [YM(2026,5), YM(2026,5), YM(2026,6), YM(2026,6), YM(2026,7), YM(2026,8)] },
    { stagesTs: [YM(2026,6), YM(2026,6), 0, 0, 0, 0] }
  ] }] }] };
  const serie = f(p, YM(2026, 8));
  ok('devuelve puntos con mes y porcentaje', Array.isArray(serie) && serie.length >= 3 && serie[0].ym && typeof serie[0].pct === 'number');
  ok('arranca en el primer mes con movimiento', serie[0].ym === '2026-05');
  ok('termina en el mes de corte', serie[serie.length - 1].ym === '2026-08');
  /* mayo: el apto A cerró la 1RA (1 de 8 etapas posibles entre los 2 aptos) = 12.5% */
  ok('mayo: 1 de 8 etapas = 12.5%', Math.abs(serie[0].pct - 0.125) < 0.001);
  /* junio: A suma la 2DA y B la 1RA → 3 de 8 = 37.5% */
  ok('junio acumula: 3 de 8 = 37.5%', Math.abs(serie[1].pct - 0.375) < 0.001);
  /* julio: A cierra la 3RA → 4 de 8 = 50% */
  ok('julio: 50%', Math.abs(serie[2].pct - 0.5) < 0.001);
  /* agosto: A termina → 5 de 8 = 62.5% */
  ok('agosto: 62.5%', Math.abs(serie[3].pct - 0.625) < 0.001);
  ok('la curva NUNCA baja (es acumulada)', serie.every((x, i) => i === 0 || x.pct >= serie[i - 1].pct));
  ok('proyecto sin avance devuelve serie vacía, no inventa', f({ towers: [] }, YM(2026,8)).length === 0);
  /* sellos legacy: v948 usa 1 como centinela de "foto vieja sin fecha" — no debe aparecer en 1970 */
  const p2 = { towers: [{ levels: [{ aptos: [{ stagesTs: [1, 1, 0, 0, 0, 0] }] }] }] };
  ok('ignora los sellos centinela (no dibuja 1970)', f(p2, YM(2026,8)).every(x => x.ym > '2000'));
}

console.log('\n— 2. el dibujo —');
const zH = ex('function _rentCurvaHTML(');
ok('existe _rentCurvaHTML', zH.length > 300);
ok('dibuja con SVG (la app no carga librería de gráficas)', /<svg/.test(zH) && /polyline|path/.test(zH));
ok('usa la serie, no recalcula', /_rentSerieAvance\(/.test(zH));
ok('NO inventa una curva planificada (no hay fecha de fin en el proyecto)', !/planificad|planPct/i.test(zH));
ok('si no hay historial, no dibuja nada', /length\s*<\s*2|!serie\.length/.test(zH));
ok('etiqueta los extremos para que se entienda', /pct/.test(zH) && /%/.test(zH));

console.log('\n— 3. enganchada en la ficha de la obra —');
const zT = ex('function _rentTablaHTML(');
ok('cada obra muestra su curva', /_rentCurvaHTML\(/.test(zT));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
