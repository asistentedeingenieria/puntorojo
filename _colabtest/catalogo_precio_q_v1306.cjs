/* v1306 (Antonio, 28-ago, sobre v1305): "se ve apretado" — la descripción necesita MÁS
   ancho y las columnas de unidad/precios MENOS; el precio debe verse con la moneda (Q)
   y SOLO 2 decimales (123.771875 → 123.77). El redondeo es SOLO al mostrar: si no se
   toca el campo, el dato guardado queda intacto (onchange no dispara). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* 1) grid: descripción gana el espacio; unidad/precios/renta/✕ compactos */
ok('head desktop compacto', html.includes('.cat-prov-productos-head{display:grid;grid-template-columns:minmax(0,1fr) 64px 106px 106px 78px 32px'));
ok('fila desktop compacta', html.includes('.cat-prov-producto-row{display:grid;grid-template-columns:minmax(0,1fr) 64px 106px 106px 78px 32px'));
ok('mobile compacto', html.includes('grid-template-columns:minmax(0,1fr) 46px 86px 86px 56px 26px'));

/* 2) precio con 2 decimales SOLO al mostrar */
const row = html.slice(html.indexOf('function renderCatProvProductos'), html.indexOf('function _prodRentaInfo'));
ok('precio value toFixed(2)', row.includes("value=\"${(prod.precio && isFinite(+prod.precio)) ? (+prod.precio).toFixed(2) : ''}\""));
ok('precioRecoge value toFixed(2)', row.includes("value=\"${(prod.precioRecoge && isFinite(+prod.precioRecoge)) ? (+prod.precioRecoge).toFixed(2) : ''}\""));
ok('value crudo eliminado', !row.includes('value="${prod.precio || \'\'}"') && !row.includes('value="${prod.precioRecoge || \'\'}"'));

/* 3) moneda Q como prefijo dentro de la celda (en AMBOS precios) */
ok('celdas de precio con prefijo Q', (row.match(/<span class="cat-q"[^>]*>Q<\/span>/g) || []).length === 2);
ok('celdas envueltas', (row.match(/<div class="cat-precio-celda">/g) || []).length === 2);
ok('CSS celda relativa', /\.cat-precio-celda\{position:relative\}/.test(html));
ok('CSS Q absoluta y sin capturar clics', /\.cat-q\{[^}]*position:absolute[^}]*pointer-events:none/.test(html));
ok('input de precio con hueco para la Q', /\.cat-precio-celda input\{[^}]*padding-left/.test(html));

/* 4) encabezados sin "(Q)" — la Q ya vive en la celda */
ok('header PRECIO UNITARIO sin (Q)', html.includes('<div>PRECIO UNITARIO</div>') && !html.includes('<div>PRECIO UNITARIO (Q)</div>'));
ok('header SI LO RECOGEMOS sin (Q)', html.includes('<div>SI LO RECOGEMOS</div>') && !html.includes('<div>SI LO RECOGEMOS (Q)</div>'));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
