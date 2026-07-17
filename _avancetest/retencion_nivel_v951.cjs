/* v951 (rechazo de Lessy 17-jul, planilla TORELO): las líneas de retención decían
   "(-) RETENCIÓN 10% - TORRE ÚNICA - C" SIN el nivel. En TORELO los aptos se llaman
   solo por letra (A/C/D), así que sin nivel no se distingue 8C de 3C. Fix: el rótulo
   de retención incluye el NIVEL en los 3 generadores (PDF por persona, Excel por
   persona, y _aptoTitulo del Excel completo — donde además el nivel evita que 8C y 3C
   se AGRUPEN juntos), y _retencionDesc (vista in-app v268) antepone el nivel cuando
   el apto no tiene dígitos ("Apto 9A" en vez de "Apto A"). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. las DOS definiciones de aptoT (PDF y Excel por persona) incluyen el nivel ──
const defs = [...html.matchAll(/const aptoT = ([^\n]+)/g)].map(m => m[1]);
ok('hay 2 definiciones de aptoT', defs.length === 2);
ok('ambas incluyen pg.levelName', defs.length === 2 && defs.every(d => /pg\.levelName/.test(d)));

// ── 2. _aptoTitulo (agrupador del Excel completo) incluye el nivel ──
const tit = extractFn('_aptoTitulo');
ok('_aptoTitulo incluye levelName', /levelName/.test(tit));

// ── 3. _retencionDesc: nivel antepuesto cuando el apto es solo letra ──
const src = extractFn('_retencionDesc');
ok('_retencionDesc considera el nivel', /levelName/.test(src));
let fn = null;
try { fn = new Function('return (' + src + ')')(); } catch(e){}
ok('_retencionDesc evaluable', typeof fn === 'function');
if (typeof fn === 'function') {
  ok('TORELO: apto por letra lleva nivel', /9A/.test(fn({ towerName:'TORRE ÚNICA', levelName:'NIVEL 9', aptoName:'A' })));
  ok('ESSENZA: apto numerado queda igual', /Apto 1104 T4/.test(fn({ towerName:'TORRE 4', levelName:'NIVEL 11', aptoName:'APARTAMENTO 1104' })));
  ok('sin nivel no truena', typeof fn({ towerName:'TORRE 1', aptoName:'B' }) === 'string');
}

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
