/* v976 (pedido de Antonio 26-jul): "NO SE VE PARA NADA BIEN NI FÁCIL DE USAR EN CELULAR
   Y TABLETS". Primer paquete de usabilidad móvil (aditivo, desktop intacto):
   1. Pestañas (nav principal .tabs y sub-pestañas .mat-tabs) se ENVUELVEN en celular:
      todo visible, nada cortado con scroll escondido.
   2. Inputs/selects a 16px en celular — iOS deja de hacer zoom automático al enfocar.
   3. Botones con altura táctil mínima.
   4. La tabla de la receta scrollea (min-width 640) en vez de aplastar las columnas. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const i0 = html.indexOf('<style id="v976-mobile-usable">');
ok('bloque de estilos v976 existe', i0 > 0);
const iEnd = html.indexOf('</style>', i0);
const z = (i0 > 0 && iEnd > i0) ? html.slice(i0, iEnd) : '';
ok('el bloque vive en el <head>', i0 > 0 && i0 < html.indexOf('</head>'));

ok('pestañas principales se envuelven en celular', /\.tabs\{[^}]*flex-wrap:wrap/.test(z) && /\.tabs\{[^}]*overflow-x:visible/.test(z));
ok('sub-pestañas .mat-tabs se envuelven (sin máscara de fade)', /\.mat-tabs\{[^}]*flex-wrap:wrap/.test(z) && /mask-image:none/.test(z));
ok('inputs a 16px (iOS no hace zoom al enfocar)', /select,\s*textarea\{font-size:16px!important\}/.test(z.replace(/\n\s*/g,'')));
ok('botones con altura táctil', /\.btn\{[^}]*min-height/.test(z));
ok('todo dentro de @media (desktop intacto)', /@media \(max-width:820px\)/.test(z));

ok('tabla de receta scrollea en vez de aplastarse', /min-width:640px;border-collapse:collapse;font-size:11\.5px/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
