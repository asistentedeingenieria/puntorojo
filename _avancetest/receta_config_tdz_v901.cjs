/* v901: bug latente de PRIMER ARRANQUE (visto 08-jul en un origen virgen):
   "ReferenceError: Cannot access 'RECETA_DEFAULT_CONFIG' before initialization"
   dentro de loadState → migrateData → ensureDataV9. La migración corre al CARGAR
   (arriba del archivo) y la const vivía en la línea ~25610: `typeof X` NO protege
   contra una const declarada después en el MISMO scope (TDZ) — el propio typeof
   truena. Fix: const → var (hoisted como undefined → el typeof devuelve
   'undefined' y usa el fallback inline, que trae los mismos valores). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. demostración del mecanismo (documenta POR QUÉ el typeof no salvaba) ──
const conConst = new Function('try { var g = (typeof FOO !== "undefined"); } catch(e){ return "TDZ"; } const FOO = 1; return "OK";');
ok('const + typeof truena (el bug real)', conConst() === 'TDZ');
const conVar = new Function('var g = (typeof FOO !== "undefined"); var FOO = 1; return g ? "definida" : "undefined";');
ok('var + typeof es seguro (el fix)', conVar() === 'undefined');

// ── 2. el fix aplicado ──
ok('RECETA_DEFAULT_CONFIG ahora es var (hoisted)', /var RECETA_DEFAULT_CONFIG = \{/.test(html));
ok('ya no queda ninguna const RECETA_DEFAULT_CONFIG', !/const RECETA_DEFAULT_CONFIG/.test(html));

// ── 3. la migración conserva su guard + fallback inline (mismos valores) ──
ok('guard typeof intacto en la migración', /typeof RECETA_DEFAULT_CONFIG !== 'undefined'/.test(html));
ok('fallback inline intacto', /separacionPostes: \{ ULTRALIGHT:0\.61/.test(html));

// ── 4. no quedan más minas EN LA RUTA DE CARGA: solo cuentan las funciones que corren
//      al cargar (loadState → migrateData → ensureDataV9); las diferidas (saveState etc.)
//      se ejecutan cuando las consts ya existen y no son riesgo ──
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
const rutaCarga = extractFn('loadState') + extractFn('migrateData') + extractFn('ensureDataV9');
const invocacion = html.indexOf('loadState()');           // dónde arranca la carga
const guards = [...new Set((rutaCarga.match(/typeof ([A-Z_][A-Za-z0-9_]*)/g)||[]).map(s=>s.replace('typeof ','')))];
const minas = guards.filter(g => { const ci = html.search(new RegExp('const '+g+' =')); return ci >= 0 && ci > invocacion; });
ok('sin otras const-TDZ en la ruta de carga', minas.length === 0);
if (minas.length) console.log('  minas:', minas.join(', '));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
