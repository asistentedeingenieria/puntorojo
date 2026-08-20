/* v1264 (Antonio, 18-ago: "selecciono la madera y NO me cambia a la que es — se queda
   pegada la del desplegable"): al ADOPTAR un producto del catálogo maestro (v1263), el
   renglón conservaba la maquinaria de presentaciones del Excel (it.variante elegida
   antes, it.variantes, varianteBase/varianteSpec) — el desplegable seguía mostrando la
   vieja y updateOcItemVariante re-armaba el nombre desde la base VIEJA.
   FIX: adoptar del maestro LIMPIA esa maquinaria — la identidad adoptada es exacta;
   el desplegable pasa a "— CAMBIAR EL PRODUCTO —" (v1263) por si hay que re-elegir. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const z = ex('window._ocOfrecerProductoCatalogo = function');
const i = z.indexOf('it.name = pr.nombre');
const zAdopt = i > 0 ? z.slice(i, i + 700) : '';
ok('adoptar limpia la variante elegida', /it\.variante = ''/.test(zAdopt));
ok('y la lista de presentaciones del Excel', /it\.variantes = \[\]/.test(zAdopt));
ok('y la base con la que se re-armaba el nombre viejo', /varianteBase = ''/.test(zAdopt) && /varianteSpec = ''/.test(zAdopt));
ok('todo ANTES del repintado', (function(){ const r = zAdopt.indexOf('renderOcItems()'); const v = zAdopt.indexOf("it.variantes = []"); return r > 0 && v > 0 && v < r; })());

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
