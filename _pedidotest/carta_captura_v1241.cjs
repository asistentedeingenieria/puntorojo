/* v1241 (Antonio, 17-ago, con el pedido EF2-17 compartido en hoja CHAPARRA):
   "NECESITO QUE TODOS LOS PEDIDOS QUE SE COMPARTAN SIEMPRE SEA EN FORMATO CARTA SIN
   IMPORTAR EL DISPOSITIVO... PARA QUE ESTE UNIFORME TODO!"

   La imagen compartida media lo que midiera el CONTENIDO (html2canvas captura .wrap):
   un pedido corto salia en hoja ancha y chaparra. Ahora, SOLO en modo captura
   (paraCaptura=true), .wrap se estira a proporcion CARTA — min-height 1031px para que
   (2*780+144)/(2*1031+144) = 8.5/11 con los margenes de 72px del canvas — y el pie
   GUATEMALA ancla abajo (flex column + margin-top:auto). La IMPRESION no se toca:
   un min-height alto partiria la hoja en dos paginas (@page letter margin:10mm).

   La OC se une al formato: compartirOcImg captura .oc-sheet (que ya mide 780x272mm ≈
   carta con los margenes) en vez del body de 920px que la hacia chaparra. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— la solicitud compartida SIEMPRE en carta —');
const zSol = ex('function _solicitudDocHTML(');
ok('en modo captura .wrap se estira a proporción carta (1031px)',
  /paraCaptura \? ';box-sizing:border-box;min-height:1031px;display:flex;flex-direction:column' : ''/.test(zSol));
ok('el pie GUATEMALA ancla abajo SOLO en captura',
  /paraCaptura \? '\.wrap>\.foot\{margin-top:auto\}' : ''/.test(zSol));
ok('la IMPRESIÓN no carga el min-height (no parte la hoja en dos páginas)',
  (function(){ const i = zSol.indexOf('.wrap{max-width:780px'); if (i < 0) return false;
    return !/min-height:1031px/.test(zSol.slice(i, i + 60)); })());

console.log('— la OC compartida también en carta —');
const zOc = ex('window.compartirOcImg = async function');
ok('captura .oc-sheet (780×272mm ≈ carta con los márgenes) y no el body de 920px',
  /querySelector\('\.oc-sheet'\)/.test(zOc) && /\|\| idoc\.body/.test(zOc));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
