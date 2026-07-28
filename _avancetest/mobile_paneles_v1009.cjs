/* v1009 — USABILIDAD EN CELULAR DE LAS PANTALLAS NUEVAS (revisión propia, 27-jul-2026).
   Antonio: "Revisá vos las pantallas nuevas en el celular y arreglá lo que encontrés mal
   y encima de cosas."

   Hallazgo: los paneles de BODEGA CENTRAL y PROYECTOS VARIOS se arman con estilos EN LÍNEA
   y CERO clases, así que el bloque <style id="v976-mobile-usable"> (≤820px) — el que arregló
   el celular en v976 y v986-v987 — NO las alcanzaba. A 375px la columna derecha de botones
   (hasta 4: VER BORRADOR / EDITAR / ELIMINAR / AUTORIZAR Y FIRMAR) aplastaba el nombre del
   proveedor contra el borde: exactamente el "todo encima de todo" que ya reportó antes. */
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
let pass = 0, fail = 0;
function ok(msg, cond) { if (cond) { pass++; console.log('  ok  ' + msg); } else { fail++; console.log('  FAIL ' + msg); } }

function ex(marker) {
  const i = html.indexOf(marker); if (i < 0) return '';
  let j = html.indexOf('{', i), d = 0;
  for (let k = j; k < html.length; k++) { if (html[k] === '{') d++; else if (html[k] === '}') { d--; if (!d) return html.slice(i, k + 1); } }
  return '';
}
const zVar = ex('window._abrirPanelVarios = function');
const zBod = ex('function _abrirPanelBodega()');
const mobile = html.slice(html.indexOf('<style id="v976-mobile-usable">'), html.indexOf('</style>', html.indexOf('<style id="v976-mobile-usable">')));

console.log('\n— las filas de los paneles son alcanzables desde CSS —');
ok('el panel de varios existe', zVar.length > 500);
ok('el panel de bodega existe', zBod.length > 500);
ok('las filas de varios llevan clase', (zVar.match(/pr-fila-panel/g) || []).length >= 2);
ok('las filas de bodega llevan clase', (zBod.match(/pr-fila-panel/g) || []).length >= 3);
/* la trampa: una fila nueva que nazca sin clase vuelve a quedar fuera del alcance del CSS */
const sinClase = (zVar + zBod).split('grid-template-columns:minmax(0,1fr) auto')
  .slice(1).length - ((zVar + zBod).match(/pr-fila-panel" style="display:grid;grid-template-columns:minmax\(0,1fr\) auto/g) || []).length;
ok('NINGUNA fila de 2 columnas quedó sin clase', sinClase === 0);

console.log('\n— en celular la fila se parte en dos renglones —');
ok('la regla vive en el bloque de celular (≤820px)', mobile.indexOf('.pr-fila-panel') > 0);
ok('una sola columna', /\.pr-fila-panel\{[^}]*grid-template-columns:1fr!important/.test(mobile));
ok('los botones bajan y envuelven', /\.pr-fila-panel > \*:last-child\{[^}]*flex-wrap:wrap!important/.test(mobile));
ok('los botones se alinean a la izquierda (no pegados al borde)', /\.pr-fila-panel > \*:last-child\{[^}]*justify-content:flex-start!important/.test(mobile));
ok('los nombres largos de proveedor cortan en vez de desbordar', /\.pr-fila-panel[^{]*\{[^}]*overflow-wrap:anywhere/.test(mobile));

console.log('\n— el ✕ de ELIMINAR no se toca por accidente —');
/* mide 28x22px pegado al botón rojo de AUTORIZAR: en el dedo es una ruleta. En celular
   se va al extremo derecho de la fila y crece a tamaño táctil. */
ok('se separa de los botones de acción', /\.pr-fila-panel \.btn-icon\{[^}]*margin-left:auto/.test(mobile));
ok('crece a tamaño de dedo', /\.pr-fila-panel \.btn-icon\{[^}]*min-width:44px/.test(mobile));
ok('y no se estira como los demás', /\.pr-fila-panel \.btn-icon\{[^}]*flex:0 0 auto/.test(mobile));

console.log('\n— el libro de movimientos de bodega cabe —');
ok('las filas de movimiento están marcadas', zBod.includes('data-bmov'));
ok('en celular van en dos renglones', /\[data-bmov\]\{[^}]*grid-template-columns:[^}]*!important/.test(mobile));

console.log('\n— bodega vacía: el aviso se lee entero —');
/* el "SIN MATERIALES TODAVÍA" se inyectaba DENTRO de .bodega-tabla-min, el contenedor de
   ancho mínimo que scrollea de lado (v987): en celular el texto salía cortado por el borde
   derecho y había que arrastrar para leerlo. Va afuera. */
const iMin = zBod.indexOf('bodega-tabla-min');
const iVacio = zBod.indexOf('SIN MATERIALES TODAVÍA');
ok('el aviso existe', iVacio > 0);
ok('el aviso NO cuelga de la variable de filas', !/\)\.join\(''\)\s*\|\|\s*'<div[^']*SIN MATERIALES TODAVÍA/.test(zBod));
ok('la tabla con scroll solo se pinta si hay materiales', /lista\.length \?\s*`?\s*<div class="bodega-tabla-scroll"/.test(zBod.replace(/\s+/g, ' ')));
ok('el aviso queda después del bloque que scrollea', iVacio > iMin);

console.log('\n— lo que ya funcionaba sigue en pie —');
ok('la tabla de 5 columnas conserva su scroll lateral (v987)', zBod.includes('bodega-tabla-scroll'));
ok('la cabecera del panel ya envolvía sola', zVar.includes('flex-wrap:wrap'));
ok('la barra de resumen no queda flotando dentro del panel (v1008)', html.includes('#_variosFormHost .pedido-summary-bar{position:static'));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
