/* v1305 (Antonio, 28-ago): en el CATÁLOGO MAESTRO el nombre del producto vivía en un
   <input> de una línea — "REGLA MADERA…" cortado, imposible saber cuál es cuál.
   FIX: el campo nombre pasa a <textarea> de auto-altura que ENVUELVE la descripción
   completa. Mismo onchange, Enter=guardar (blur, sin salto de línea), disabled para
   no-admin igual. El CSS de la fila cubre textarea y el foco post-agregar lo apunta. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* 1) el campo nombre es textarea (no input) con el contenido escapado */
const row = html.slice(html.indexOf('function renderCatProvProductos'), html.indexOf('function _prodRentaInfo'));
ok('nombre = textarea', /<textarea[^>]*data-cat-nombre/.test(row));
ok('input de nombre eliminado', !/<input type="text" value="\$\{\(prod\.nombre/.test(row));
ok('contenido escapado con esc()', row.includes('>${esc(prod.nombre || \'\')}</textarea>'));
ok('mismo onchange (updateCatProvProducto nombre)', /data-cat-nombre[^>]*onchange="updateCatProvProducto\(\$\{origIdx\}, 'nombre', this\.value\)"/.test(row));
ok('Enter guarda, no hace salto de línea', /data-cat-nombre[^>]*Enter[^>]*preventDefault[^>]*blur/.test(row));
ok('respeta disabled para no-admin', /data-cat-nombre[^>]*\$\{_esAdminCat \? '' : ' disabled'\}/.test(row));

/* 2) auto-altura: al render y al tipear */
ok('autosize tras el render', /querySelectorAll\('textarea\[data-cat-nombre\]'\)/.test(row) && /scrollHeight/.test(row));
ok('autosize al tipear (oninput)', /data-cat-nombre[^>]*oninput="[^"]*scrollHeight/.test(row));

/* 3) CSS: la fila estiliza textarea igual que input (claro, focus y dark) */
ok('CSS fila cubre textarea', html.includes('.cat-prov-producto-row input,.cat-prov-producto-row textarea{'));
ok('CSS focus cubre textarea', html.includes('.cat-prov-producto-row input:focus,.cat-prov-producto-row textarea:focus{'));
ok('CSS dark cubre textarea', /pr-dark \.cat-prov-producto-row input,\s*body\.pr-dark \.cat-prov-producto-row textarea\{/.test(html));
ok('textarea sin resize manual y sin scrollbar propia', /\.cat-prov-producto-row textarea\{[^}]*resize:none[^}]*overflow:hidden/.test(html));

/* 4) foco tras + AGREGAR PRODUCTO va al campo nombre (ahora textarea) */
ok('foco post-agregar apunta al textarea', html.includes("querySelector('#catProvProductos .cat-prov-producto-row textarea')"));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
