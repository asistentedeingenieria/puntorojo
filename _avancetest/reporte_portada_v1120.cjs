/* v1120 — LA PORTADA Y LAS HOJAS DE TORRE LLEVAN EL RENDER DEL PROYECTO (Antonio):
   "mira la foto que te mandé: la primera slide Y SEGUNDA debe de tener la foto del proyecto y
   no una foto random de avance."
   En el reporte real, la portada y cada hoja de torre llevan el render del edificio — una
   imagen FIJA de la obra que no sale del avance físico. Yo estaba usando la primera foto de
   avance que encontraba, y por eso la portada mostraba un cuarto en obra gris.
   Se guarda UNA por proyecto (p.repFotoPortada) como dataURL comprimido a 1400px: es una sola
   imagen por obra, no justifica Storage ni un contenedor nuevo. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. se puede cargar la foto del proyecto —');
const zS = ex('window._repSubirPortada = function(');
ok('existe el cargador', zS.length > 300);
ok('acepta imágenes', /accept = 'image\/\*'/.test(zS));
ok('la comprime antes de guardar', /compressImage\(file, 1400/.test(zS));
ok('la guarda en el proyecto', /repFotoPortada = data/.test(zS));
ok('sella _ts y sube', /_ts = Date\.now\(\)/.test(zS) && /forceUploadNow/.test(zS));
ok('re-lee el proyecto tras el await (v769/v770)', /activeProj\(\) : null;\s*\/\* re-leer/.test(zS));

console.log('\n— 2. el PDF la usa —');
const zP = ex('window._repGenerarPDF = async function(');
ok('lee la foto del proyecto', /var portada = p\.repFotoPortada/.test(zP));
ok('la portada la prefiere', /imgPortada = portada \|\| primeraFoto/.test(zP));
ok('la hoja de torre también', /var ft = portada \|\| f\.fotos\[0\]/.test(zP));
ok('si no hay, no deja la hoja vacía (cae a una foto de avance)', /portada \|\| primeraFoto/.test(zP));

console.log('\n— 3. la vista previa avisa si falta —');
const zR = ex('window._repRender = function(');
ok('hay botón para cargarla', /_repSubirPortada\(\)/.test(zR));
ok('muestra la que ya está', /p\.repFotoPortada \?/.test(zR));
ok('avisa cuando falta', /FALTA LA FOTO DEL PROYECTO/.test(zR));
ok('explica dónde se usa', /PORTADA Y EN CADA HOJA DE TORRE/.test(zR));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
