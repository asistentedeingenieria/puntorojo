/* v1198 — HERRAMIENTA POR MATCH DE NOMBRE (Antonio, 12-ago): la PISTOLA DE CALAFATEO
   salió en la orden de despacho como material de BODEGA CENTRAL — nadie notó que había
   que elegir BODEGA DE HERRAMIENTA (v1187). "Necesito la opción de seleccionar con base
   a nombres que hagan match y poder escoger la presentación."

   EL FIX: _herrMatchesDeNombre(nombre) — fichas del nombre (sin DE/LA/PARA…, singular≈
   plural por prefijo) contra las herramientas CON SALDO. Si hay coincidencias: la opción
   del picker sube arriba (junto a — ASIGNAR —) y avisa "N COINCIDEN"; al elegirla, el
   selector lista las coincidencias PRIMERO (marcadas con ≈) y el resto abajo — elegir
   cuál ES la presentación (CUBETA 1GL vs 5GL). Nunca automático: siempre decide compras. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— el match (funcional, con bodega simulada) —');
const zF = ex(code, 'function _herrFichasNombre(');
const zM = ex(code, 'function _herrMatchesDeNombre(');
ok('las dos piezas existen', !!zF && !!zM);
try {
  const HERR = ['PISTOLA DE CALAFATEO USO PESADO', 'PISTOLA DE CALOR MARCA BLACK+DECKER', 'CUBETA PLASTICA MULTIUSOS 1GL', 'CUBETA PLASTICA MULTIUSOS 5GL', 'ESCALERA DE 8\' METÁLICA'];
  const f = new Function('var _herrDisponibles = function(){ return ' + JSON.stringify(HERR) + '; };\n' + zF + '\n' + zM + '\nreturn _herrMatchesDeNombre;')();
  const caso = f('PISTOLA DE CALAFATEO USO PESADO');
  ok('EL CASO REAL: la pistola de calafateo matchea y va primera', caso.length >= 1 && caso[0].name === 'PISTOLA DE CALAFATEO USO PESADO');
  ok('no arrastra la de calor (comparten solo PISTOLA)', !caso.some(x => /CALOR/.test(x.name)));
  const cub = f('CUBETA PLASTICA');
  ok('CUBETA PLASTICA trae las DOS presentaciones (1GL y 5GL) para escoger', cub.length === 2);
  ok('acentos y plural no estorban (escaleras metalicas ≈ ESCALERA METÁLICA)', f('ESCALERAS METALICAS').some(x => /ESCALERA/.test(x.name)));
  ok('un material cualquiera NO matchea (tornillo)', f('CIENTO DE TORNILLO DE 1" PUNTA FINA').length === 0);
  ok('vacío → vacío', f('').length === 0);
} catch(e){ ok('el match evalúa aislado: ' + e.message, false); }

console.log('\n— la opción del picker avisa y sube arriba —');
const opH = ex(code, 'function _herrOpcionPicker(');
ok('recibe el nombre del renglón y cuenta coincidencias', /_herrOpcionPicker\(nombreItem\)/.test(code) && /COINCIDE/.test(opH));
ok('el picker le pasa el nombre del renglón', /_herrOpcionPicker\(it\.name\)/.test(code));
ok('con match, la opción va ARRIBA (junto a ASIGNAR), no al fondo', /COINCIDE/.test(ex(code, 'function _abrirPickerProveedor(')) || /_hoArriba|_herrPickerLista/.test(code));

console.log('\n— elegir: las coincidencias primero, marcadas —');
const eleg = ex(code, 'window._ocElegirHerramienta = function(');
ok('ordena por match (coincidencias primero)', /_herrMatchesDeNombre\(it\.name\)/.test(eleg));
ok('las marca (≈) y el resto queda disponible abajo', /≈/.test(eleg));
ok('el circuito v1187 sigue intacto (convierte el renglón, tombstone, sella y sube)', /pd2\.herramientas\.push/.test(eleg) && /itemsQuitados\.push/.test(eleg) && /pd2\._ts = Date\.now\(\)/.test(eleg) && /forceUploadNow/.test(eleg));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
