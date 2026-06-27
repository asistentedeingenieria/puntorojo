/* v858 #4: alarma de tamaño por PROYECTO. Firestore rechaza docs > 1MB; ya había alarma para la
   asistencia, pero los docs de proyecto (proj_<id>) no la tenían → un proyecto que crece podía
   romper el guardado en silencio al pasar 1MB. _docSizeAlarm(bytes) decide warn/hold/clear con
   histéresis (avisa >900KB, se limpia <800KB) para no parpadear. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const src = extractFn('_docSizeAlarm');
ok('_docSizeAlarm existe', !!src);
if (src) {
  const fn = new Function(src + '\nreturn _docSizeAlarm;')();
  ok('>900KB → warn', fn(950000) === 'warn');
  ok('<800KB → clear', fn(700000) === 'clear');
  ok('zona muerta (800-900KB) → hold (sin parpadeo)', fn(850000) === 'hold');
  ok('1MB → warn', fn(1048576) === 'warn');
}

// Estructural: el loop de subida de proyectos usa la alarma.
ok('uploadCurrent alarma el tamaño por proyecto', /_docSizeAlarm\(json\.length\)/.test(html));
ok('avisa con el nombre del proyecto', /proyecto[\s\S]{0,80}p\.name/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
