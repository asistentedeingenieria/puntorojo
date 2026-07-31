/* v1087 — EL INVENTARIO SUMA EL MISMO MATERIAL EN VEZ DE DUPLICARLO (Antonio, 30-jul):
   "si en el nivel dos hay un canal y se registra, después cuando en el nivel tres se
   encuentra otro canal, se haga la suma automática y no se duplique... está poniendo dos
   veces canal, en vez de hacer la suma en solo un renglón".
   CAUSA RAÍZ: _invReporteMatriz agrupaba con `String(ln.material).toUpperCase()` — el
   nombre crudo. CANAL DE 2 1/2" y CANAL DE 2 ½" son el MISMO material pero dos claves
   distintas, así que salían en dos filas. La app ya tiene el normalizador que resuelve
   exactamente eso (_ocItemMemKey: comillas tipográficas ≡ rectas, '2 ½' ≡ '2½', espacios).
   FIX: agrupar con esa clave, mostrando el primer nombre encontrado como etiqueta. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. la matriz agrupa con la clave normalizada —');
const zM = ex('function _invReporteMatriz(');
ok('ya NO agrupa por el nombre crudo', !/var mk = String\(ln\.material\)\.toUpperCase\(\);/.test(zM));
ok('usa el normalizador del catálogo', /_invMatKey\(|_ocItemMemKey\(/.test(zM));
const zK = ex('function _invMatKey(');
let k = null;
try { k = new Function('_ocItemMemKey', 'return (' + zK + ')'); } catch(e){}
ok('existe _invMatKey y es pura', !!k && zK.length > 60);
if (k) {
  /* con el normalizador real de la app disponible, lo usa; si no, cae a mayúsculas */
  const norm = n => String(n).toUpperCase().replace(/\s+/g, ' ').replace(/[""]/g, '"').replace(/2 ½/g, '2½').trim();
  const f = k(norm);
  ok('EL CASO DE ANTONIO: las dos escrituras del canal dan la MISMA clave',
    f('CANAL DE 2 ½" X 10\'') === f('canal de 2 ½"  x 10\''));
  ok('materiales distintos siguen separados', f('CANAL DE 2½"') !== f('CANAL DE 3 5/8"'));
  ok('sin normalizador disponible no revienta', k(null)('CANAL') === 'CANAL');
  ok('vacío no rompe', f('') === '' && k(null)(null) === '');
}

console.log('\n— 2. el nombre que se muestra sigue siendo legible —');
ok('guarda el nombre original como etiqueta, no la clave', /material: ln\.material|material: String\(ln\.material\)/.test(zM));

console.log('\n— 3. el consolidado global usa la MISMA clave (o volvería a partir filas) —');
const zC = ex('function _invConsolidado(');
ok('el total global agrupa igual que la matriz', /_invMatKey\(/.test(zC));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
