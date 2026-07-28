/* v1021 — EL BUSCADOR DEL CATÁLOGO DESAPARECIÓ (reporte de Antonio: "me quitaste el buscador").

   Lo rompí yo en v1020. La regla original es:

       input.pr-buscador, .pr-buscador{ ... }

   un selector de DOS partes separadas por coma. Al insertar la regla nueva del
   ::-webkit-search-cancel-button entre `input.pr-buscador,` y `.pr-buscador{`, la coma
   quedó colgando y unió `input.pr-buscador` al selector del pseudo-elemento — que lleva
   display:none. Resultado: el campo se ocultó en pantalla.

   La clase la comparten ~20 buscadores de toda la app: romper ese selector los apaga todos.
   REGLA: una regla nueva va COMPLETA y ANTES del selector, nunca partiéndolo al medio. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— el selector del buscador está entero —');
ok('input.pr-buscador y .pr-buscador siguen juntos', /input\.pr-buscador, \.pr-buscador\{/.test(html));
/* la trampa exacta: que `input.pr-buscador,` termine unido por la coma a un selector que
   oculta cosas */
/* la trampa exacta que rompió v1020: `input.pr-buscador,` seguido de un pseudo-elemento —
   la coma lo une a esa regla y el input hereda lo que declare (display:none) */
ok('la coma no cuelga hacia un pseudo-elemento', !/input\.pr-buscador,\s*\.pr-buscador::/.test(html));
ok('ninguna regla del buscador lleva display:none', !/(^|\n)\s*input\.pr-buscador[^{]*\{[^}]*display:\s*none/.test(html));

console.log('\n— la X nativa sí se apaga (que era el arreglo real) —');
ok('se apaga el botón nativo de search', /\.pr-buscador::-webkit-search-cancel-button/.test(html));
ok('y su decoración', /\.pr-buscador::-webkit-search-decoration/.test(html));
ok('esa regla es SOLO para los pseudo-elementos', /::-webkit-search-decoration\{[^}]*display:none \}/.test(html));

console.log('\n— el campo conserva lo que lo hace visible —');
const i = html.indexOf('input.pr-buscador, .pr-buscador{');
const bloque = html.slice(i, html.indexOf('}', i));
ok('tiene fondo', /background:#fff/.test(bloque));
ok('tiene borde', /border:1px solid var\(--line\)/.test(bloque));
ok('y su alto mínimo', /min-height:40px/.test(bloque));
/* v1020 le puso -webkit-appearance:none y height fijo; con la clase compartida por tantos
   buscadores, eso es superficie de riesgo que no compra nada */
ok('sin appearance forzado', !/appearance:\s*none/.test(bloque));
ok('sin alto fijo (lo da min-height)', !/[^-]height:40px/.test(bloque));

console.log('\n— la X propia quedó discreta —');
ok('sin la caja gris que la hacía pesada', !/id="catalogoSearchClear"[^>]*background:var\(--cream\)/.test(html));
ok('sigue existiendo y se puede limpiar', /id="catalogoSearchClear"/.test(html) && /clearCatalogoSearch\(\)/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
