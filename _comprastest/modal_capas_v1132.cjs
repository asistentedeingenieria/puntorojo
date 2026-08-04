/* v1132 — "ABRE HASTA ABAJO DE TODAS LAS PESTAÑAS ENTONCES NO LO VEO" (Antonio, 4-ago)

   Tocaba PEDIR NIVEL COMPLETO y el modal de confirmar el pedido no aparecía. No era un error:
   el diagnóstico en su navegador (app v1131, al día) devolvió

       posición en pantalla → top: 0  left: 0  alto: 730 | display: flex fixed | z: 100
       padre directo: BODY
       ningún ancestro rompe el fixed
       panel receta z: 100070
       style inline del modal:            ← VACÍO

   O sea: el modal se abría perfecto, centrado y a pantalla completa, pero con z-index 100 —
   DEBAJO del panel PEDIR DE RECETA (100070), que ocupa toda la pantalla. Quedaba tapado.

   POR QUÉ: su capa vivía en un `style="z-index:100090"` escrito a mano en el markup. El HTML
   que sirve el dominio SÍ lo trae (verificado con curl), pero en el DOM vivo el atributo
   llegó vacío. Nada en la app lo borra (no hay removeAttribute ni bucles sobre .modal-bg), así
   que lo más probable es una extensión del navegador tocando el documento.

   Da igual quién lo vació: el defecto es que la capa dependa de un atributo del markup. Un
   atributo se puede vaciar, y nadie se entera hasta que un modal se vuelve invisible en
   producción. La capa va en la HOJA DE ESTILOS, que es donde se declaran las capas, y con
   !important para que sobreviva a que el inline desaparezca.

   LA REGLA QUE ESTE TEST FIJA: todo modal que se abra ENCIMA de un panel debe declarar su capa
   en el CSS, por arriba de la del panel. Las capas en juego:
       panel PEDIR DE RECETA .... 100070
       menú de modos ............ 100080
       modal confirmar pedido ... 100090   ← tiene que ganarle a los dos */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* solo el contenido de los <style>: hay <script> en el head ANTES de la hoja de estilos, así
   que cortar por el primer <script> dejaba el CSS afuera y las aserciones fallaban por el
   arnés, no por el código */
const css = (html.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []).join('\n');

console.log('— la capa se declara en la hoja de estilos, no en el markup —');
const regla = css.match(/#modalConfirmarPedido\s*\{[^}]*z-index:\s*(\d+)\s*!important/);
ok('existe la regla CSS del modal de confirmar', !!regla);
ok('y no depende de que el markup traiga el estilo', /!important/.test((regla||[])[0] || ''));

const Z_MODAL = regla ? Number(regla[1]) : 0;
const Z_PANEL = 100070;   /* _modalPedirReceta */
const Z_MENU  = 100080;   /* menú de modos de pedido */

console.log('\n— el orden de las capas —');
ok('el modal queda por encima del panel PEDIR DE RECETA', Z_MODAL > Z_PANEL);
ok('y por encima del menú de modos', Z_MODAL > Z_MENU);
ok('la capa base de .modal-bg sigue siendo baja (no se subió a lo bruto)',
  /\.modal-bg\{[^}]*z-index:100[;}]/.test(css));

console.log('\n— las capas de referencia no se movieron —');
ok('el panel de receta sigue en 100070', html.indexOf('z-index:100070') > 0);
ok('el menú de modos sigue en 100080', html.indexOf('100080') > 0);

console.log('\n— el markup puede conservar su estilo, pero ya no es lo que decide —');
const tag = (html.match(/<div class="modal-bg" id="modalConfirmarPedido"[^>]*>/) || [''])[0];
ok('el modal sigue existiendo en el markup', tag.length > 20);
ok('sigue siendo .modal-bg (hereda posición fija y centrado)', /class="modal-bg"/.test(tag));

console.log('\n— los otros dos modales con capa en el markup —');
/* mismo patrón frágil: si un día su inline se vacía, quedan bajo cualquier panel.
   No se tocan acá (viven sobre el login, sin paneles encima), pero quedan anotados. */
ok('modalForcePassword sigue declarado', /id="modalForcePassword"/.test(html));
ok('modalForgotPass sigue declarado', /id="modalForgotPass"/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
