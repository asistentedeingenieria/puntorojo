/* v928 (ajuste de Antonio con print del PDF): el "APP" junto al logo de la OC va más
   chiquito, color NEGRO y SIN negrita (antes 15px, bold 800, rojo marca). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const src = extractFn('printOrdenCompra');
const m = src.match(/<span style="([^"]*)">APP<\/span>/);
ok('el span APP existe en el PDF de la OC', !!m);
if (m) {
  const st = m[1];
  ok('chiquito (10px o menos)', /font-size:(10px|9px|8px)/.test(st));
  ok('negro', /color:#(222|000|111|333)/.test(st));
  ok('sin negrita', /font-weight:(400|normal)/.test(st) || !/font-weight/.test(st));
}

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
