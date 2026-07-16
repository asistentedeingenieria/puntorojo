/* v946 (pedido de Antonio con print de las firmas):
   (1) Las DOS líneas de firma a la MISMA altura siempre: .oc-firma tenía
       justify-content:flex-end (alineaba por ABAJO) y la columna del revisor, con más
       filas de texto bajo la línea, empujaba su línea hacia ARRIBA. Fix: alinear por
       arriba + zona de firma de ALTURA FIJA (70px) en ambas columnas → las líneas caen
       exactamente a la misma altura, tenga las filas que tenga cada lado.
   (2) La firma SIEMPRE al centro de su línea: en el revisor, el sello empujaba la firma
       a la izquierda (iban centrados como PAR). Ahora la zona es una grilla de 3 celdas
       (1fr | firma | 1fr): la firma queda en la celda CENTRAL (centrada en la línea) y
       el sello en la celda derecha, pegado a la firma — sin tocarla nunca. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const src = extractFn('printOrdenCompra');

// ── 1. líneas a la misma altura ──
ok('.oc-firma alinea por ARRIBA (ya no flex-end)', /\.oc-firma\{[^}]*justify-content:flex-start/.test(src) && !/\.oc-firma\{[^}]*justify-content:flex-end/.test(src));
ok('zona de firma de ALTURA FIJA en ambas columnas', (src.match(/height:70px;display:(flex|grid)/g) || []).length >= 2);
ok('la columna pendiente usa la misma altura (70px)', !/<div style="height:40px"><\/div>/.test(src));

// ── 2. firma centrada en su línea, sello en celda propia ──
ok('zona del revisor = grilla de 3 celdas (1fr | firma | 1fr)', /height:70px;display:grid;grid-template-columns:1fr auto 1fr/.test(src));
ok('el sello vive en la celda derecha, pegado a la firma', /justify-self:start[^"]*"|"[^"]*justify-self:start/.test(src.slice(src.indexOf('grid-template-columns:1fr auto 1fr'))) && /REVISADO/.test(src));
ok('la firma del generador también va centrada y anclada abajo', /height:70px;display:flex;align-items:flex-end;justify-content:center/.test(src));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
