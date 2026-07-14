/* v929 (pedido de Antonio con print del borrador):
   (1) FIRMAS AL FONDO de la hoja tamaño carta: .oc-sheet es columna flex con
       min-height en mm y .oc-firmas se ancla con margin-top:auto (@page letter ya existía).
   (2) Firmas MÁS PEQUEÑAS y JUSTO ARRIBA de su línea: la línea ahora es un elemento
       propio (.firma-linea) DEBAJO de la firma (antes era border-top del bloque y la
       cursiva de 28px flotaba con margin-top:-42px); cursiva a 19px; firma dibujada a 38px.
   (3) Registro de firmas más fácil: entrada "Mi firma digital" en el menú ⋮ (kebab),
       además del botón del modal de OC y la oferta automática (v926). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const src = extractFn('printOrdenCompra');

// ── 1. firmas al fondo de la hoja carta ──
ok('hoja carta (@page letter ya estaba)', /@page \{ size: letter/.test(src));
ok('.oc-sheet es columna con alto de hoja', /\.oc-sheet\{[^}]*flex-direction:column[^}]*min-height:\d+mm/.test(src));
ok('.oc-firmas ancladas abajo (margin-top:auto)', /\.oc-firmas\{[^}]*margin-top:auto/.test(src));

// ── 2. firmas pequeñas sobre su línea ──
ok('la línea es elemento propio (.firma-linea)', /\.firma-linea\{border-top:1px solid #222/.test(src));
ok('.oc-firma ya no dibuja la línea arriba', !/\.oc-firma\{[^}]*border-top/.test(src));
ok('cursiva reducida (19px, sin flotar -42px)', /firma-script\{[^}]*font-size:19px/.test(src) && !/margin-top:-42px/.test(src));
ok('firma dibujada a 38px', (src.match(/height:38px;max-width:2\d\dpx;object-fit:contain/g) || []).length >= 2);
ok('las dos columnas ponen la línea bajo la firma', (src.match(/<div class="firma-linea"><\/div>/g) || []).length >= 3);

// ── 3. registro accesible ──
ok('entrada Mi firma digital en el menú ⋮', /kebabAction\(_abrirFirmaModal\)/.test(html) && /Mi firma digital/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
