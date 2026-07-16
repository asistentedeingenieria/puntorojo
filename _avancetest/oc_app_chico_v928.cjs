/* v928 (ajuste de Antonio con print del PDF): el "APP" junto al logo de la OC iba más
   chiquito, negro y sin negrita.
   SUPERSEDED por v948: Antonio pidió QUITAR el "APP" de al lado del logo y ponerlo en el
   bloque del No., abajo de la sigla del proyecto ("VLA - APP"). Este test ahora verifica
   esa nueva realidad para no volver a poner el span junto al logo. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const src = extractFn('printOrdenCompra');

// v948: ya NO hay un <span ...>APP</span> junto al logo
ok('el span APP junto al logo se eliminó (v948)', !/<span style="[^"]*">APP<\/span>/.test(src));
// el logo quedó solo en su div
const logoLine = (src.match(/<div[^>]*><img src="\$\{_LOGO_PR\}"[^>]*>[^\n]*/) || [''])[0];
ok('el div del logo ya no incluye "APP"', !!logoLine && !/>APP</.test(logoLine));
// "APP" vive ahora en el bloque del No., como "<sigla> - APP"
ok('APP se movió al bloque del No. como "- APP"', /_projSiglas\(_ocNumeroPartes\(oc\)\.proyecto\)\} - APP/.test(src));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
