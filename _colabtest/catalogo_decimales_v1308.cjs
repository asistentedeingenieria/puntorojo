/* v1308 (Antonio, 28-ago, sobre v1306): "dame chance de poner hasta 5 decimales en dado
   caso aplique... si solo tiene dos decimales dejalo así... una vez colocado ya no se
   modifique". El toFixed(2) fijo de v1306 ESCONDÍA los decimales reales — y si el admin
   editaba ese campo, guardaba el valor recortado (destrucción silenciosa de precisión).
   FIX: _catPrecioDisplay (PURA) — mínimo 2 decimales, hasta 5 si el valor los tiene; el
   input acepta 5 decimales (step="any") y lo tecleado se guarda EXACTO. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* 1) helper puro: extraer y evaluar */
const m = html.match(/function _catPrecioDisplay\(v\)\{[\s\S]*?\n\}/);
ok('helper _catPrecioDisplay existe', !!m);
if (m) {
  const f = new Function(m[0] + '; return _catPrecioDisplay;')();
  ok('2 decimales se quedan igual', f(234.93) === '234.93' && f('20.25') === '20.25');
  ok('completa a 2 mínimos', f(14.2) === '14.20' && f(587.8) === '587.80');
  ok('muestra hasta 5 decimales reales', f(123.771875) === '123.77187' && f(20.25397436) === '20.25397');
  ok('3 decimales se respetan sin rellenar', f(1.125) === '1.125');
  ok('vacío/0/basura → vacío', f('') === '' && f(null) === '' && f(0) === '' && f('abc') === '');
} else { fail += 5; }

/* 2) las celdas usan el helper y aceptan 5 decimales */
const row = html.slice(html.indexOf('function renderCatProvProductos'), html.indexOf('function _prodRentaInfo'));
ok('precio usa _catPrecioDisplay', row.includes('value="${_catPrecioDisplay(prod.precio)}"'));
ok('precioRecoge usa _catPrecioDisplay', row.includes('value="${_catPrecioDisplay(prod.precioRecoge)}"'));
ok('toFixed(2) fijo eliminado', !row.includes('.toFixed(2)'));
ok('step=any en ambos precios (5 decimales válidos)', (row.match(/step="any"[^>]*class="precio"/g) || []).length === 2);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
