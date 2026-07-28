/* v1022 — ELEGIR DÓNDE TRABAJAR AL ENTRAR (lo que Antonio aprobó con el modelo y faltaba).

   El gate de v961 se quitó el mismo día. Antonio explicó por qué: "sí funcionaba, pero cuando
   se entraba se convertía en lo mismo que antes; si se quería cambiar de proyecto se volvía a
   seleccionar donde siempre". El mapeo confirmó la causa: ese gate era un overlay COSMÉTICO —
   nunca ponía el proyecto en null y elegir no cambiaba nada después. Fricción sin ganancia.

   Lo que cambia esta vez, en las dos puntas:
   - Se entra eligiendo, con las obras como tarjetas y sus pendientes a la vista.
   - Una vez adentro, la obra queda ARRIBA a la vista ("TRABAJANDO EN" + nombre grande) con su
     propio camino para cambiarla, en vez de perderse en un desplegable del mismo tamaño.

   ⚠️ El proyecto activo SIGUE existiendo mientras se elige: ponerlo en null rompería todas las
   pantallas que llaman activeProj() sin guarda. Lo que se guarda es si esta persona ya eligió
   en esta sesión. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. la pantalla de entrada —');
const zP = ex('window._abrirPantallaObra = function');
ok('existe', zP.length > 400);
ok('lista las obras como tarjetas', /proys\.map\(tarjeta\)/.test(zP));
/* v1023: los subtitulos van en MAYUSCULA (pedido de Antonio) */
ok('con sus pendientes a la vista', /PEDIDO\$\{|SIN PENDIENTES/.test(zP));
ok('y las ubicaciones de empresa', /BODEGA CENTRAL/.test(zP) && /PROYECTOS VARIOS/.test(zP) && /ADMINISTRACIÓN/.test(zP));
ok('cada una respeta su permiso', /_puedeVerBodega\(\)/.test(zP) && /_puedeVerVarios\(\)/.test(zP) && /_puedeVerAdmin\(\)/.test(zP));
ok('sale al arrancar la app', /_abrirPantallaObra\(\)/.test(ex('function renderAll(')));

console.log('\n— 2. NO se repite la fricción que hizo quitar el gate de v961 —');
ok('solo aparece la primera vez de la sesión', /_yaEligioObra\(\)/.test(zP));
ok('recuerda la última obra entre sesiones', /pr_ultima_obra_/.test(html));
ok('y la marca para que elegir sea un clic', /LA ÚLTIMA DONDE TRABAJASTE/.test(zP));
ok('se puede volver a ella a propósito', /_abrirPantallaObra\(true\)/.test(html));

console.log('\n— 3. adentro, la obra se ve —');
ok('la barra dice TRABAJANDO EN', /<span class="lbl">TRABAJANDO EN<\/span>/.test(html));
ok('el nombre de la obra es grande', /\.proj-switcher \.pr-proj-btn\{font-size:15px/.test(html));
ok('y va en su propia línea, no perdido al lado', /\.proj-switcher\{flex-direction:column/.test(html));

console.log('\n— 4. no rompe lo que asume que hay proyecto —');
const zE = ex('window._elegirObraYEntrar = function');
ok('elegir una obra la activa de verdad', /setActiveProject\(id\)/.test(zE));
/* la trampa de v961 al revés: si se pusiera el proyecto en null para "no tener default",
   reventarían todas las pantallas que hacen activeProj() sin guarda */
ok('nunca pone el proyecto activo en null', !/activeProjectId = null/.test(zP) && !/activeProjectId = null/.test(zE));
ok('sin obras cargadas no se interpone', /proys\.length/.test(zP) && /_marcarObraElegida\(\); return;/.test(zP));
ok('entrar a una ubicación de empresa también cuenta como elegir', /_marcarObraElegida\(\)/.test(ex('window._entrarA = function')));

console.log('\n— 5. los nombres de obra se escapan —');
ok('el nombre pasa por escape', /_esc\(p\.name\)/.test(zP));
ok('y el id también (va en un onclick)', /_esc\(p\.id\)/.test(zP));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
