/* v1261 (Antonio, 18-ago: "a mí SÍ me sale BODEGA DE HERRAMIENTA pero a compras NO"):
   el candado v978/v992 (_ocProvLocked = !users.manage) recorta el picker para todos menos
   el admin, y sus DOS ramas recortadas (multi-proveedor y proveedor-auto) son ANTERIORES
   a la opción de herramienta (v1187) — nunca se les agregó. El propósito del candado
   ("compras no inventa proveedores") no pelea con la herramienta: v1198 nació justo
   porque compras no veía esa opción (la pistola de calafateo comprada por error).
   FIX: las dos ramas ofrecen _herrOpcionPicker (con la regla v1198: coincidencias
   ARRIBA) y rutean '_herr' a _ocElegirHerramienta, igual que el picker completo. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zP = ex('function _abrirPickerProveedor(');
ok('el candado ganó su helper de herramienta (_herrLk) y las DOS ramas lo usan',
  /const _herrLk = function/.test(zP) && (zP.match(/items: _herrLk\(/g) || []).length === 2
  && /_herrOpcionPicker\(it\.name\)/.test(zP));
ok('las dos ramas rutean _herr con _pickLk y la completa con su propio onPick',
  /const _pickLk = function/.test(zP) && (zP.match(/onPick: _pickLk/g) || []).length === 2
  && (zP.match(/window\._ocElegirHerramienta\(btn, idx\)/g) || []).length >= 2);
ok('con coincidencias de nombre la opción sube ARRIBA también con candado',
  (zP.match(/COINCIDE/g) || []).length >= 2);
ok('la conversión a herramienta NO exige ser admin (compras.autorizar o bodega bastan)',
  /compras\.autorizar/.test(ex('window._ocElegirHerramienta = function')) && /_puedeGestionarBodega/.test(ex('window._ocElegirHerramienta = function')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
