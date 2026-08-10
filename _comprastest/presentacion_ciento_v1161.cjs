/* v1161 — PRESENTACIONES (CIENTO / CAJA / MILLAR): la OC pide 5 CIENTOS, no 500 CIENTOS

   Antonio (10-ago, con la captura donde Susana tuvo que quitar dos líneas a mano):
   "pidieron tornillo de 1 punta fina y en unidad pusieron 500 pero a la hora de hacer la
   OC sale como cientos, entonces eran 500 cientos pero el solo queria 5 cientos."

   HOY: el nombre cambia (TORNILLO… → CIENTO DE TORNILLO…) pero la CANTIDAD viaja intacta
   desde el pedido hasta el ledger de bodega. 500 unidades se vuelven 500 cientos = 50,000
   tornillos.

   ⚠️ POR QUÉ NO ALCANZA CON DIVIDIR (verificación adversarial ANTES de tocar nada): la
   cantidad de la OC la leen la RECEPCIÓN (escribe recetaRecibido, que _pedidoCubre usa
   para SOBRESCRIBIR la cobertura de la receta — sobre-compra silenciosa, la misma falla
   que v1036 cerró), el LEDGER de bodega (partiría el tornillo en dos productos con claves
   distintas y saldo −495) y el gasto de despacho. Convertir a secas rompe los tres.

   EL DISEÑO SEGURO: la línea RECUERDA el factor.
   · _presFactor(nombreCompra) PURA: CIENTO=100, MILLAR=1000, CAJA/BOLSA DE N=N. null si no.
   · buildPedidoOcItems convierte qty = ceil(unidades / factor) y sella it.factorPres y
     it.qtyUnidades (las unidades REALES que pidió el supervisor).
   · El PRECIO no se toca: el catálogo ya lo tiene POR PRESENTACIÓN (Q10.50 el ciento).
   · La RECEPCIÓN des-convierte (× factor) antes de escribir recetaRecibido ⇒ la cobertura
     de la receta sigue en unidades y no se reabre nada.
   · El LEDGER de bodega entra en UNIDADES con el nombre BASE ⇒ una sola clave por material.
   · Sin factor (todo el resto del catálogo) NADA cambia — el camino viejo intacto. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* ══ 1. el detector de presentación — PURO ══ */
console.log('— el factor de presentación —');
const zF = ex(html, 'function _presFactor(');
ok('existe _presFactor', !!zF);
let fac = null;
try { fac = new Function('return (' + zF + ')')(); } catch(e){}
ok('evalúa', typeof fac === 'function');
if (fac) {
  ok('CIENTO = 100', (fac('CIENTO DE TORNILLO DE 1" PUNTA DE BROCA') || {}).factor === 100);
  ok('MILLAR = 1000', (fac('MILLAR DE CLAVO') || {}).factor === 1000);
  ok('CAJA DE N usa la N del nombre', (fac('GRAPA ½" PARA PISTOLA (CAJA 1,000U) TRUPER') || {}).factor === 1000);
  ok('BOLSA DE N también', (fac('MASCARILLA KN-95 BOLSA DE 12 UNIDADES') || {}).factor === 12);
  ok('la etiqueta acompaña', /CIENTO/.test((fac('CIENTO DE TORNILLO') || {}).etiqueta || ''));
  ok('un material suelto NO tiene factor', fac('TORNILLO DE 1" PUNTA DE BROCA') === null && fac('POSTE DE 2½" X 10\' CAL. 26') === null);
  ok('CAJA sin número NO inventa factor (no se adivina)', fac('PASTA REDIMIX USG CAJA 21.8 KG') === null);
  ok('basura ⇒ null', fac('') === null && fac(null) === null);
}

/* ══ 2. la conversión al armar la OC ══ */
console.log('\n— la línea de la OC se convierte y RECUERDA ══');
const zB = ex(code, 'function buildPedidoOcItems(');
ok('convierte con ceil (nunca se pide de menos)', /_presFactor\(/.test(zB) && /Math\.ceil\(/.test(zB));
ok('sella el factor y las unidades REALES en la línea', /factorPres/.test(zB) && /qtyUnidades/.test(zB));
ok('la conversión usa el nombre de COMPRA (el que trae la presentación)', /_presFactor\(base\)|_presFactor\(fullName\)|_presFactor\(_nomPres\)/.test(zB));

/* ══ 3. la recepción DES-convierte (el agujero de la cobertura) ══ */
console.log('\n— la recepción devuelve unidades a la receta —');
/* el factor se cuelga de la línea al ARMAR el modal (otra función) y se aplica al
   confirmar — por eso se verifican los dos lados por separado */
ok('las líneas del modal llevan el factor de cada ítem',
  /\{ k: x\.name, q: Number\(x\.qty\) \|\| 0, src: x\.sourceKey, fac: Number\(x\.factorPres\) \|\| 1 \}/.test(code));
const zR = ex(code, 'window._recepcionConfirmar = async function(');
ok('el mapa por línea guarda las UNIDADES (q × factor), no la presentación',
  /_recQtyPorLinea\[ln\.src\] = q \* \(Number\(ln\.fac\) \|\| 1\)/.test(zR) && /recetaRecibido/.test(zR));

/* ══ 4. el ledger de bodega entra en unidades y con una sola clave ══ */
console.log('\n— el inventario no se parte en dos —');
const zE = ex(code, 'window._bodegaMovsEntradaDeOc = function');
ok('la ENTRADA usa unidades reales (q × factor)', /factorPres/.test(zE));
ok('y el nombre BASE (una sola clave por material)', /_presNombreBase\(/.test(zE));
ok('el precio se des-convierte con el factor (el inventario no se multiplica ×100)', /\/ _fp/.test(zE));

/* ══ 5. la UI lo muestra explícito ══ */
console.log('\n— compras ve la conversión —');
const zRO = ex(code, 'function renderOcItems(');
ok('la celda de cantidad muestra la conversión (500 UND = 5 CIENTO)', /factorPres/.test(zRO) && /qtyUnidades/.test(zRO));

/* ══ 6. lo que NO cambia ══ */
console.log('\n— lo que no cambia —');
ok('el precio NO se toca (el catálogo ya lo tiene por presentación)', !/precio[\s\S]{0,40}factorPres|factorPres[\s\S]{0,40}it\.precio =/.test(zB));
ok('sin factor, la cantidad viaja intacta (camino viejo)', /if \(_pf/.test(zB) || /_pf &&/.test(zB));
ok('la cobertura de la receta sigue leyendo el PEDIDO', /pd\.recetaQty|base = \(pd && pd\.recetaQty\)/.test(code));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
