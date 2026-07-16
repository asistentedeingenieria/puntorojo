/* v943 (pedido de Antonio con print del diálogo de impresión):
   (1) Firmas HASTA ABAJO de la carta SIEMPRE: el hueco aparecía porque la hoja se
       dimensionaba para caber dentro de los márgenes de @page, y al elegir
       "Márgenes: Ninguno" en el diálogo sobraban ~47mm abajo. Fix: @page margin:0 y
       los márgenes viven ADENTRO de la hoja (padding en mm + border-box) — el ancla
       de las firmas pasa a ser el borde físico real, elija lo que elija el usuario.
   (2) Sello REVISADO al costado DERECHO de la firma, un poco abajo, SIN taparla
       (position:absolute dentro de .oc-firma; antes iba en el flujo, arriba). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const src = extractFn('printOrdenCompra');

// ── 1. firmas al fondo físico de la carta ──
ok('@page carta SIN margen (los márgenes viven en la hoja)', /@page \{ size: letter; margin: 0/.test(src));
ok('la hoja carga sus márgenes adentro (padding en mm + border-box)', /\.oc-sheet\{[^}]*padding:10mm 12mm 6mm[^}]*box-sizing:border-box/.test(src) || /\.oc-sheet\{[^}]*box-sizing:border-box[^}]*padding:10mm 12mm 6mm/.test(src));
ok('alto de hoja casi completo (272mm)', /\.oc-sheet\{[^}]*min-height:272mm/.test(src));
ok('las firmas siguen ancladas abajo (margin-top:auto, v929)', /\.oc-firmas\{[^}]*margin-top:auto/.test(src));

// ── 2. sello REVISADO al costado derecho, sin tapar la firma ──
// (v943 lo puso absoluto; v944 lo pasó a FILA junto a la firma — el invariante es que
// acompañe a la firma SIN taparla, no la técnica exacta)
ok('el sello ya no va en el flujo ARRIBA de la firma', !/margin-bottom:4px;transform:rotate\(-1\.5deg\)/.test(src));
ok('sigue siendo el recuadro rojo del sello físico', /border:2px solid #D0151C/.test(src) && /rotate\(-\d+deg\)/.test(src));
ok('conserva la fecha corta (v927)', /_fechaSelloCorta/.test(src));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
