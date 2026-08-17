/* v1184 — COMPARTIR OC (Antonio: "en vez de imprimir mejor coloquemos el botón de COMPARTIR
   OC una vez la OC ya está autorizada por la de finanzas").

   REGLA v980 respetada: UN solo builder. printOrdenCompra gana el modo {soloHTML:true} que
   devuelve el documento REAL (con sellos, firmas, saldo a favor y formato OC2 - 000024) sin
   abrir ventana; compartirOcImg lo pinta en un iframe oculto, html2canvas lo captura adentro
   y sale por la escalera nativa de _imgCompartir (app Android → hoja del celular → descarga
   en computadora). Cero drift posible entre lo impreso y lo compartido. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— un solo builder (regla v980) —');
const prn = ex(code, 'function printOrdenCompra(');
ok('printOrdenCompra tiene el modo soloHTML', /_soloHTML/.test(prn) && /soloHTML/.test(prn));
ok('en soloHTML devuelve el documento SIN abrir ventana', /if \(_soloHTML\) return _docHTML;/.test(prn));
ok('el camino de imprimir sigue intacto (window.open + write)', /window\.open\('', '_blank'\)/.test(prn) && /w\.document\.write\(_docHTML\)/.test(prn));

console.log('\n— el compartir usa el documento real —');
const cmp = ex(code, 'window.compartirOcImg = async function(');
ok('existe compartirOcImg', !!cmp);
/* v1242: el compartir pide además sinMalla:true — al proveedor la hoja va limpia */
ok('pinta el builder real en el iframe', /printOrdenCompra\(ocId, false, \{ soloHTML: true, sinMalla: true \}\)/.test(cmp));
ok('sale por la escalera nativa de v980', /_imgCompartir\(/.test(cmp));
ok('los botones de la app no van en la foto', /no-print[\s\S]{0,80}remove/.test(cmp));
ok('el nombre del archivo lleva el número nuevo y el proveedor', /_numLimpio\(oc\.numero\)/.test(cmp) && /proveedorNombre/.test(cmp));
ok('si falla, avisa y limpia el iframe', /NO SE PUDO GENERAR/.test(cmp) && /finally/.test(cmp) && /fr\.remove\(\)/.test(cmp));

console.log('\n— el botón de la tarjeta —');
ok('la OC autorizada muestra COMPARTIR OC', /isAuth\s*\?\s*`<button[^`]*compartirOcImg\('\$\{oc\.id\}'\)[^`]*>COMPARTIR OC<\/button>`/.test(code));
ok('el IMPRIMIR directo salió de la tarjeta (pedido textual: "en vez de imprimir")',
  !/printOrdenCompra\('\$\{oc\.id\}'\)" title="Imprimir orden autorizada">IMPRIMIR</.test(code));
ok('los botones cortos de los pedidos siguen imprimiendo (no eran parte del pedido)',
  /printOrdenCompra\('\$\{o\.id\}'\)/.test(code));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
