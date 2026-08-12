/* v987 (fotos de Antonio 27-jul: "no me gusta cómo se ve la bodega central", "todo está
   encima de todo"):
   1. MODALES en celular: el pie (.modal-actions) se pegaba al flujo y el contenido se
      leía DEBAJO de los botones — ahora es sticky al fondo con fondo propio y los
      botones reparten el ancho; .oc-grid-2 y el resumen por proveedor pasan a 1 columna.
   2. BODEGA CENTRAL: los 3 botones del header en su fila (a lo ancho), las 4 tarjetitas
      explicativas colapsadas tras "CÓMO FUNCIONA" (comían la primera pantalla) y la
      tabla de 5 columnas con scroll lateral propio.
   3. Modal CARGAR EXISTENCIAS: filas en DOS líneas (nombre arriba; U · REGISTRADO ·
      TOTAL REAL abajo con sus etiquetas) — el nombre ya no se parte en 4 renglones. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const i0 = html.indexOf('<style id="v976-mobile-usable">');
const z = html.slice(i0, html.indexOf('</style>', i0));

// ── 1. modales ──
ok('el pie del modal queda pegado abajo (sticky) con fondo propio', /\.modal-actions\{position:sticky;bottom:0/.test(z) && /background:var\(--white\)/.test(z));
ok('los botones del pie reparten el ancho', /\.modal-actions \.btn\{flex:1/.test(z));
ok('las 2 columnas del modal de OC pasan a 1', /\.oc-grid-2\{grid-template-columns:1fr/.test(z));
ok('el resumen por proveedor también', /\.oc-multi-summary\{grid-template-columns:1fr/.test(z));

// ── 2. bodega central ──
/* v1192 (Antonio): las tarjetas de info y su toggle CÓMO FUNCIONA se ELIMINARON del todo
   (markup y CSS) — lo mobile que v987 protege ahora es solo header + tabla con scroll. */
ok('marcado: header y tabla con scroll (las tarjetas ya no existen)', /class="bodega-hd"/.test(html) && /class="bodega-tabla-scroll"/.test(html) && !/id="_bodegaInfoGrid"/.test(html));
ok('el CSS de las tarjetas se fue con ellas (sin reglas huérfanas)', !/\.bodega-info-toggle\{display/.test(html) && !/\.bodega-info-grid\{display/.test(html));
ok('los botones del header van a lo ancho en su fila', /\.bodega-hd \.btn\{flex:1 1 100%/.test(z));
ok('la tabla de bodega scrollea de lado', /\.bodega-tabla-scroll\{overflow-x:auto/.test(z) && /\.bodega-tabla-min\{min-width:560px\}/.test(z));

// ── 3. modal CARGAR EXISTENCIAS ──
ok('marcado: encabezado y fila libre con clase', /class="carga-hd"/.test(html) && /class="carga-libre"/.test(html));
ok('el encabezado de columnas se oculta en celular', /\.carga-hd\{display:none!important\}/.test(z));
ok('las filas pasan a DOS líneas', /\[data-cfila\]\{grid-template-columns:56px 1fr 96px!important/.test(z) && /grid-template-areas/.test(z));
ok('con etiquetas REGISTRADO / TOTAL REAL', /content:'REGISTRADO/.test(z) && /content:'TOTAL REAL/.test(z));
ok('OTRO MATERIAL en 1 columna', /\.carga-libre\{grid-template-columns:1fr!important/.test(z));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
