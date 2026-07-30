/* v1078 — DOS PRECIOS POR PRODUCTO SEGÚN QUIÉN TRANSPORTA (Antonio, 30-jul):
   "en este proveedor este producto tenemos 2 precios: si lo llevan ellos cuesta Q58 y
   cuando nosotros vamos a recoger nos cuesta Q55".
   Decisión de Antonio (AskUserQuestion): la modalidad se elige UNA VEZ POR PROVEEDOR en la
   orden (el flete es del viaje), no producto por producto.
   Modelo: el producto del catálogo gana un campo OPCIONAL precioRecoge. Vacío = ese
   producto no tiene modalidad alternativa y todo sigue como siempre. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. el precio que toca, según la modalidad —');
const zP = ex('function _precioSegunTransporte(');
let f = null;
try { f = new Function('return (' + zP + ')')(); } catch(e){}
ok('existe _precioSegunTransporte y es pura', !!f && zP.length > 120);
if (f) {
  const prod = { nombre: 'TABLAYESO', precio: 58, precioRecoge: 55 };
  ok('lo trae el proveedor → Q58', f(prod, 'PROVEEDOR') === 58);
  ok('lo recogemos nosotros → Q55', f(prod, 'NOSOTROS') === 55);
  ok('sin modalidad, el precio normal', f(prod, '') === 58 && f(prod, null) === 58);
  /* si el producto NO tiene segundo precio, recoger no lo abarata: se queda el normal */
  ok('producto sin precio de recoger no cambia', f({ precio: 40 }, 'NOSOTROS') === 40 && f({ precio: 40, precioRecoge: 0 }, 'NOSOTROS') === 40);
  ok('no revienta con producto vacío', f(null, 'NOSOTROS') === 0 && f({}, 'PROVEEDOR') === 0);
}

console.log('\n— 2. el catálogo guarda el segundo precio —');
ok('la ficha del producto tiene el campo', /updateCatProvProducto\(\$\{origIdx\}, 'precioRecoge'/.test(html));
ok('el encabezado lo nombra', /RECOGEMOS/.test(html));
const zU = ex('function updateCatProvProducto(');
ok('se guarda como número, no como texto', /field === 'precioRecoge'|'precio' \|\| field === 'precioRecoge'/.test(zU));
ok('pasa por el mismo candado que el precio (quien no autoriza, propone)', /field === 'precio' && !_puedeAutorizar|\['precio','precioRecoge'\]/.test(zU));
ok('sella _ts como toda mutación del catálogo (v1070)', /_ts = Date\.now\(\)/.test(zU));

console.log('\n— 3. la orden: se elige por proveedor y se aplica a sus materiales —');
const zR = ex('function renderOcItems(');
ok('la tarjeta del proveedor ofrece la modalidad', /_ocPorProvSet\('\$\{gid\}','transporte'|transporte/.test(zR));
ok('solo aparece si algún material de ESE proveedor tiene el segundo precio', /_provTieneRecoge|precioRecoge/.test(zR));
const zA = ex('window._ocAplicarTransporte = function');
ok('al elegir la modalidad se recalculan los precios de ese proveedor', zA.length > 150 && /_precioSegunTransporte\(/.test(zA) && /renderOcItems\(\)/.test(zA));
ok('solo toca los materiales de ese proveedor', /it\.proveedorId === provId|proveedorId !== provId/.test(zA));

console.log('\n— 4. queda constancia en la orden y en el papel —');
const zG = ex('async function generarOrdenCompra(');
ok('la OC guarda quién transporta', /transporte: /.test(zG));
const zPr = ex('function printOrdenCompra(');
ok('el impreso lo dice (para no discutir con el proveedor)', /RECOGEMOS|LO RECOGE/.test(zPr) && /oc\.transporte/.test(zPr));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
