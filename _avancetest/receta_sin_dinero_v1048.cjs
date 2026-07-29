/* v1048 — LA RECETA DE LA OBRA ES SOLO DE CANTIDADES.
   Antonio (con foto de la receta mostrando P.U. y SUBTOTAL): "NO QUIERO que haya dinero ahí.
   Solo la receta de cantidades, que se pueda ver y editar así como está, sin nada de dinero
   PARA NADIE." El costo de la receta vive en COMPRAS → COSTO DE LA RECETA (v1041/v1044). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. la llave del dinero está APAGADA para todos —');
/* todo el dinero de la vista (P.U., SUBTOTAL, subtotal etapa, total nivel/apto) pasa por la
   única const puedeVerPrecios — apagarla lo quita todo sin tocar nada más */
ok('puedeVerPrecios es false fijo', /const puedeVerPrecios = false;/.test(html));
ok('ya no depende del permiso', !/puedeVerPrecios = can\('receta\.verPrecios'\)/.test(html));

console.log('\n— 2. la edición de cantidades queda EXACTAMENTE igual —');
ok('el admin sigue aplicando directo', /esAdminReceta = can\('users\.manage'\)/.test(html));
ok('quien tiene receta.edit sigue proponiendo', /puedeProponer = can\('receta\.edit'\)/.test(html));
ok('los controles no dependen de los precios', /puedeVerControles = esAdminReceta \|\| puedeProponer/.test(html));

console.log('\n— 3. el costo con dinero SIGUE en COMPRAS —');
const zC = ex('function _comprasRecetaCostoHTML(');
ok('COSTO DE LA RECETA conserva sus montos', /P\.U\./.test(zC) && /fmtQ/.test(zC));

console.log('\n— 4. el permiso no queda como casilla muerta (lección v1034) —');
/* receta.verPrecios ya no controla la receta — sigue controlando GASTOS y el inventario
   valorizado; la etiqueta tiene que decir lo que HACE hoy */
ok('la clave se conserva', /key: 'receta\.verPrecios'/.test(html));
ok('con etiqueta honesta (ya no promete la receta)', !/label: 'Ver PRECIOS de la receta de materiales \(P\.U\. y subtotales\)'/.test(html));
ok('GASTOS lo sigue usando', /can\('receta\.verPrecios'\)/.test(ex('function _puedeVerGastos(')));
ok('el inventario valorizado también', /can\('receta\.verPrecios'\)/.test(ex('function _invHistDetalle(')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
