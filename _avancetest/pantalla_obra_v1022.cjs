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
/* v1026: renderAll ya no la llama directo — usa el insistidor, porque en el primer render
   los proyectos todavía no llegaron de la nube y esa única oportunidad se perdía */
ok('sale al arrancar la app', /_asegurarMenuInicial\(\)/.test(ex('function renderAll(')));

console.log('\n— 2. NO se repite la fricción que hizo quitar el gate de v961 —');
ok('solo aparece la primera vez de la sesión', /_yaEligioObra\(\)/.test(zP));
ok('recuerda la última obra entre sesiones', /pr_ultima_obra_/.test(html));
ok('y la marca para que elegir sea un clic', /LA ÚLTIMA DONDE TRABAJASTE/.test(zP));
ok('se puede volver a ella a propósito', /_abrirPantallaObra\(true\)/.test(html));

console.log('\n— 3. adentro, la obra se ve —');
ok('la barra dice TRABAJANDO EN', /<span class="lbl">TRABAJANDO EN<\/span>/.test(html));
/* v1029: Antonio pidió lo contrario de "grande" — la letra del nombre unificada con la de
   TRABAJANDO EN, misma tipografía y sin negritas ("lo quiero todo unificado") */
ok('el nombre comparte tipografía con la etiqueta', /\.proj-switcher \.lbl,\s*\r?\n\.proj-switcher \.pr-proj-btn\{[^}]*font-weight:400/.test(html));
/* v1028: la caja volvió a UNA línea y más delgada, con el volver como botón aparte
   (Antonio: "no me gusta cómo se ve, más delgado") */
ok('la caja es compacta, de una línea', /\.proj-switcher\{flex-direction:row/.test(html));

console.log('\n— 4. no rompe lo que asume que hay proyecto —');
const zE = ex('window._elegirObraYEntrar = function');
ok('elegir una obra la activa de verdad', /setActiveProject\(id\)/.test(zE));
/* la trampa de v961 al revés: si se pusiera el proyecto en null para "no tener default",
   reventarían todas las pantallas que hacen activeProj() sin guarda */
ok('nunca pone el proyecto activo en null', !/activeProjectId = null/.test(zP) && !/activeProjectId = null/.test(zE));
/* ⚠️ v1025 — ACÁ ESTABA EL BUG de "recargo y no me sale el menú". El primer render corre
   ANTES de que lleguen los proyectos de la nube, así que la lista está vacía; la versión
   anterior marcaba "ya eligió" en ese momento y se rendía PARA SIEMPRE: cuando llegaban los
   datos, el menú ya se creía mostrado. REGLA: nunca marcar como elegido algo que el usuario
   no eligió. */
ok('con la lista vacía sale SIN marcar', /if \(!proys\.length\) return;/.test(zP));
ok('y no se rinde para siempre', !/proys\.length\) \{ _marcarObraElegida/.test(zP));
ok('solo se marca al elegir de verdad', (html.match(/_marcarObraElegida\(\)/g) || []).length === 3);
ok('entrar a una ubicación de empresa también cuenta como elegir', /_marcarObraElegida\(\)/.test(ex('window._entrarA = function')));

console.log('\n— 5. los nombres de obra se escapan —');
ok('el nombre pasa por escape', /_esc\(p\.name\)/.test(zP));
ok('y el id también (va en un onclick)', /_esc\(p\.id\)/.test(zP));

console.log('\n— 6. EL ARRANQUE ES ASÍNCRONO: no basta con intentarlo una vez —');
/* v1026, tercer intento sobre lo mismo. Los dos anteriores asumían que renderAll correría en
   el momento justo, con los proyectos ya cargados. El arranque real es asíncrono — login,
   caché local, applyRemote de la nube — y nadie garantiza en qué render aparecen las obras:
   la única oportunidad se perdía y el menú no salía nunca. Ahora se INSISTE. */
const zA = ex('function _asegurarMenuInicial(');
ok('existe el insistidor', zA.length > 100);
ok('reintenta hasta que haya obras', /setTimeout\(_asegurarMenuInicial/.test(zA));
ok('con tope, para no insistir para siempre', /_menuIntentos > 40/.test(zA));
ok('se rinde si el usuario ya eligió', /_menuYaMostradoEstaCarga\) return/.test(zA));
ok('y si el menú ya está abierto', /_pantallaObra'\)\) return/.test(zA));
ok('renderAll usa el insistidor, no la llamada directa', /_asegurarMenuInicial\(\)/.test(ex('function renderAll(')));
ok('y también se engancha al arranque tras el login', (html.match(/_asegurarMenuInicial\(\)/g) || []).length >= 3);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
