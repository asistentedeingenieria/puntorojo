/* v942 (pedido de Antonio con print del diálogo de impresión):
   (1) El botón IMPRIMIR/GUARDAR PDF salía EN EL PAPEL: tiene .no-print, pero
       .btn-print{display:block} está declarado DESPUÉS de la regla @media print con la
       misma especificidad → gana el block (y sin fondo por "gráficos en segundo plano"
       apagado, quedaba como texto gris arriba). Fix: display:none!important.
   (2) ENTREGAR A centrado en su cuadro (horizontal y vertical).
   (3) Firmas un poco más grandes: 52px → 64px.
   Los tres aplican SOLOS a las OC ya autorizadas: la hoja se regenera de la plantilla
   en cada impresión (no hay nada guardado por OC). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const src = extractFn('printOrdenCompra');

// ── 1. el botón NO sale en el papel ──
ok('.no-print gana con !important (el .btn-print venía después)', /@media print \{[^}]*\}[^@]*/.test(src) ? /\.no-print\{display:none!important\}/.test(src) : false);

// ── 2. ENTREGAR A centrado en el cuadro ──
ok('cuadro centrado horizontal', /\.oc-entregar-box\{[^}]*text-align:center/.test(src));
ok('cuadro centrado vertical (flex)', /\.oc-entregar-box\{[^}]*align-items:center/.test(src) && /\.oc-entregar-box\{[^}]*justify-content:center/.test(src));

// ── 3. firmas más grandes (64px), siempre sobre su línea ──
ok('firma a 64px en ambas columnas', (src.match(/height:64px;max-width:2\d\dpx;object-fit:contain/g) || []).length >= 2);
ok('ya no queda la de 52px', src.indexOf('height:52px') === -1);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
