/* v1265 (Antonio, 20-ago, con la OC3-000026: "NO me gusta la descripción entre corchetes
   — es innecesario porque ya a la izquierda está la medida exacta"): cuando el renglón
   resolvió a un producto EXACTO del catálogo (nc/elegida en buildPedidoOcItems, o una
   variante elegida en updateOcItemVariante), el corchete [spec] del pedido NO se imprime
   — la identidad del catálogo ya dice la medida. La spec solo sobrevive en renglones SIN
   identidad de catálogo (eventuales) cuando además agrega algo (v1249: _specRedundante). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zB = ex('function buildPedidoOcItems(');
ok('con identidad de catálogo (elegida/nc) el corchete NO se arma',
  (function(){ const i = zB.indexOf('const fullName'); if (i < 0) return false;
    const z = zB.slice(i, i + 300);
    return /elegida \|\| nc/.test(z) && /_specRedundante/.test(z); })());
const zV = ex('window.updateOcItemVariante = function');
ok('elegir una variante deja el nombre LIMPIO (sin corchete)',
  (function(){ const i = zV.indexOf('const _spec'); if (i < 0) return false;
    return /!item\.variante/.test(zV.slice(i, i + 200)); })());

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
