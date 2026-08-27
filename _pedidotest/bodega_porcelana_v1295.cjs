/* v1295 · FASE C del vestíbulo — pulido PORCELANA (el estilo que Antonio eligió del
   muestrario, 27-ago): blanco de precisión, filos de color arriba de cada tarjeta de
   sección, números grandes estilo tablero (Oswald, la misma letra de las hojas v1292),
   subrayado rojo quirúrgico en la cabecera y hover fino en las filas del hub.
   TODO es CSS + clases — cero cambios de datos ni de lógica. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* ── 1. la fuente de los números ── */
ok('Oswald viaja en el link de fuentes del head', /fonts\.googleapis\.com\/css2\?[^"]*family=Oswald/.test(html));
ok('regla .bvest-num con Oswald y respaldo', /\.bvest-num\{[^}]*Oswald[^}]*\}/.test(html));

/* ── 2. las filas del hub ── */
const iHub = html.indexOf('function _bodegaHubHTML(');
const zHub = html.slice(iHub, iHub + 8000);
ok('el número de cada fila usa .bvest-num', /class="bvest-num"/.test(zHub));
ok('las filas llevan .bvfila (hover fino)', /class="bvfila"/.test(zHub) || /bvfila/.test(zHub));
ok('regla hover de la fila', /\.bvfila:hover\{[^}]*var\(--red\)[^}]*\}/.test(html));

/* ── 3. filos de color por sección ── */
ok('reglas de filo', ['bcard-r','bcard-a','bcard-c','bcard-v','bcard-g'].every(c => new RegExp('\\.' + c + '\\{border-top:3px solid').test(html)));
const iPanel = html.indexOf('function _abrirPanelBodega(');
const zPanel = html.slice(iPanel, iPanel + 32000);
ok('existencias con filo rojo', /class="card bcard-r"/.test(zPanel));
ok('herramientas con filo azul', /class="card bcard-a"/.test(zPanel));
ok('abastecimiento con filo café', /class="card bcard-c"/.test(zPanel));
ok('por recibir con filo verde', /class="card bcard-v"/.test(zPanel));
ok('movimientos con filo gris', /class="card bcard-g"/.test(zPanel));

/* ── 4. cabecera con subrayado rojo ── */
const iHd = zPanel.indexOf('class="bodega-hd"');
ok('la cabecera lleva el subrayado quirúrgico', iHd > 0 && /border-bottom:2px solid var\(--red\)/.test(zPanel.slice(iHd, iHd + 300)));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
