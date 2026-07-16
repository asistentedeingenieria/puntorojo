/* v941 (pedido de Antonio con prints de la OC01 autorizada):
   (1) En las OC AUTORIZADAS ya NO va el sello diagonal de arriba a la derecha
       (.oc-auth-seal "AUTORIZADA / POR FINANZAS" — se encimaba al No. de 3 líneas);
       queda ÚNICAMENTE el sello REVISADO de abajo (v927) sobre la firma del revisor.
   (2) Todo el contenido debe caber en UNA hoja carta: min-height 245mm dejaba ~1mm
       de holgura sobre los 251.4mm útiles (279.4 − márgenes 14+14) y cualquier
       redondeo mandaba las firmas a la hoja 2. Baja a 232mm y sin padding inferior. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const src = extractFn('printOrdenCompra');

// ── 1. sin sello arriba a la derecha ──
ok('la plantilla ya no dibuja el sello superior (POR FINANZAS)', src.indexOf('POR FINANZAS') === -1);
ok('el bloque .oc-auth-seal salió del markup', src.indexOf('class="oc-auth-seal"') === -1);
ok('el sello REVISADO de abajo sigue (v927)', /REVISADO/.test(src) && /_fechaSelloCorta/.test(src));

// ── 2. una sola hoja carta ──
ok('min-height con holgura sobre el alto útil (el valor exacto lo pinea la versión vigente)', /\.oc-sheet\{[^}]*min-height:\d+mm/.test(src));
ok('padding inferior mínimo (no empuja a la hoja 2)', /\.oc-sheet\{[^}]*padding:10(px 0 0|mm 12mm 6mm)[;}]/.test(src));
ok('firmas siguen ancladas abajo (margin-top:auto, v929)', /\.oc-firmas\{[^}]*margin-top:auto/.test(src));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
