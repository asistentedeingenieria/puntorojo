/* v924 (pedido de Antonio con print de la receta de SÓTANOS): los títulos U/TOTAL/P.U./
   SUBTOTAL y sus números deben quedar alineados y centrados. Causa: los th no tenían
   ancho fijo y las celdas usaban text-align/padding distintos a los títulos.
   Fix en renderRecetaV2: anchos fijos por columna + título y celda con el MISMO
   text-align:center y el MISMO padding. MATERIAL queda a la izquierda. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
function extractFn(name){ let m=html.indexOf(name); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
const src = extractFn('window.renderRecetaV2 = function');
ok('renderRecetaV2 extraída', src.length > 500);

// encabezados con ancho fijo y centrados
ok('th U centrado con ancho', /width:70px;text-align:center[^>]*>U</.test(src));
ok('th TOTAL/CANT centrado con ancho', /width:100px;text-align:center[^>]*>'\+\(esTotal\?'TOTAL':'CANT'\)\+'</.test(src));
ok('th P.U. centrado con ancho', /width:120px;text-align:center[^>]*>P\.U\.</.test(src));
ok('th SUBTOTAL centrado con ancho', /width:130px;text-align:center[^>]*>SUBTOTAL</.test(src));

// celdas con la MISMA alineación centrada
ok('celda cantidad centrada', /text-align:center;font-variant-numeric:tabular-nums;padding:6px 8px">'\+qty\.toLocaleString/.test(src));
ok('celda P.U. centrada', /text-align:center;padding:6px 8px;color:'\+\(tienePrecio/.test(src));
ok('celda subtotal centrada', /text-align:center;font-variant-numeric:tabular-nums;padding:6px 8px">'\+\(tienePrecio\?money\(sub\)/.test(src));
ok('sin celdas numéricas alineadas a la derecha (desalineadas del título)', !/text-align:right;font-variant-numeric/.test(src));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
