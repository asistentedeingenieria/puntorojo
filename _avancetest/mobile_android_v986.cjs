/* v986 (fotos Android de Antonio 27-jul, madrugada):
   1. La barra de sub-pestañas de PEDIDOS era un flex SIN overflow — en celular recortaba
      y LISTA DE PEDIDOS + BODEGA CENTRAL quedaban INALCANZABLES ("no puedo hacer scroll",
      "no veo la bodega central"). En celular la barra envuelve: las 3 pestañas siempre
      visibles y BODEGA CENTRAL baja a su propia fila a lo ancho. Desktop intacto.
   2. Modal de OCs en celular: las columnas apiladas eran bloques grises sin nombre —
      cada campo lleva su etiqueta (CANTIDAD/PROVEEDOR/PRECIO U/TOTAL) vía ::before y
      nada se sale del ancho (min-width:0 + width:100%).
   3. Toma de inventario: MATERIAL a lo ancho; UNIDAD/CANTIDAD/AGREGAR acomodados. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const i0 = html.indexOf('<style id="v976-mobile-usable">');
const z = html.slice(i0, html.indexOf('</style>', i0));

// ── 1. sub-pestañas de pedidos ──
ok('la barra tiene clase ped-tabs-bar', /class="ped-tabs-bar"/.test(html));
ok('en celular la barra envuelve (nada queda inalcanzable)', /\.ped-tabs-bar\{flex-wrap:wrap\}/.test(z));
ok('BODEGA CENTRAL baja a su propia fila a lo ancho', /\.ped-tabs-bar > \.btn\{flex:1 1 100%/.test(z));

// ── 2. modal de OCs ──
ok('celdas con min-width:0 (no se salen del ancho)', /\.oc-item-row\.multi > div\{min-width:0/.test(z));
ok('etiquetas CANTIDAD/PROVEEDOR/PRECIO U/TOTAL en celular', /content:'CANTIDAD/.test(z) && /content:'PROVEEDOR'/.test(z) && /content:'PRECIO U'/.test(z) && /content:'TOTAL/.test(z));
ok('controles a lo ancho dentro de la fila', /\.oc-item-row\.multi button, \.oc-item-row\.multi input/.test(z));
ok('el precio bloqueado se lee (no bloque gris vacío)', /\.oc-item-row\.multi input\[disabled\]/.test(z));

// ── 3. toma de inventario ──
ok('el form de la toma tiene clase inv-form-row', /class="inv-form-row"/.test(html));
ok('MATERIAL a lo ancho en celular', /\.inv-form-row > div:first-child\{flex:1 1 100%/.test(z));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
