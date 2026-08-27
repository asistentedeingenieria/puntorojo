/* v1303 (Antonio, 27-ago: "NO ESTÁ ASÍ" — la barra de estados de pedidos v1299/v1302
   no aparecía en el panel COMPRAS): la sonda en su consola dio display:none con padre
   pedidosList — la ESCOBA es la regla CSS
   `#_bodegaPanelModal #mat-pedidos .ped-tabs-bar{display:none!important}`
   (puesta en su día para esconder la navegación interna del bloque PRESTADO de
   pedidos), que barría también la barra nueva por compartir la clase. En la vista de
   OBRA sí se veía — por eso los tests estructurales pasaban y en el panel no había nada.
   FIX: la barra de estados lleva clase propia `ped-estado-bar` y una excepción MÁS
   específica la enciende dentro del panel (display:grid, el mismo look de tarjetitas
   que las barras de ÓRDENES ahí adentro, v1059). La escoba original queda intacta para
   la navegación interna. REGLA: una clase compartida hereda las escobas de todos sus
   usos — lo nuevo que no deba barrerse necesita su propia clase. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

ok('la escoba original sigue (la nav interna del bloque prestado no vuelve)', /#_bodegaPanelModal #mat-pedidos \.ped-tabs-bar\{display:none!important\}/.test(html));
ok('la excepción enciende la barra de estados dentro del panel', /#_bodegaPanelModal #mat-pedidos \.ped-tabs-bar\.ped-estado-bar\{display:grid!important/.test(html));
ok('la barra de estados lleva su clase propia', /class="mat-tabs ped-tabs-bar ped-estado-bar"/.test(html));
ok('la excepción va DESPUÉS de la escoba (gana el empate de !important)', html.indexOf('.ped-tabs-bar.ped-estado-bar{display:grid') > html.indexOf('#mat-pedidos .ped-tabs-bar{display:none'));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
