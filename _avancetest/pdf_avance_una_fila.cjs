/* v847: en TODOS los PDFs de AVANCE POR APARTAMENTO, los aptos de cada nivel deben caber en UNA
   sola fila (no una y media). Antes cellW=72 fijo (~7/fila) → niveles con más aptos se partían.
   Fix: cellW se ajusta al nivel MÁS ANCHO de la torre → perRow = maxAptos. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractAt(startIdx){ let i=html.indexOf('{',startIdx),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(startIdx,i+1); } } return ''; }
function extractFn(name){ const m=html.indexOf('function '+name+'('); return m<0?'':extractAt(m); }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const src = extractFn('_pdfAvanceReporteTorreDoc');
ok('_pdfAvanceReporteTorreDoc existe', !!src);
ok('ya NO usa el ancho fijo cellW=72', src.indexOf('cellW=72')<0 && src.indexOf('cellW = 72')<0);
ok('calcula el nivel más ancho (maxAptos)', src.indexOf('maxAptos')>=0);
ok('itera los niveles para el max', /t\.niveles[\s\S]{0,120}aptos[\s\S]{0,80}maxAptos/.test(src) || /niveles\|\|\[\]\)\.forEach/.test(src));
ok('perRow = maxAptos (todos en una fila)', /perRow\s*=\s*maxAptos/.test(src));
ok('cellW se ajusta al ancho disponible', /cellW\s*=\s*\(pageW-2\*M\)\/(perRow|maxAptos)/.test(src));

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail ? 1 : 0);
