/* v1185 — LA OBRA YA NO PIERDE SUS PESTAÑAS DE MATERIALES AL TOCAR HERRAMIENTAS EN COMPRAS

   EL CASO (11-ago, captura de Antonio): entraba a una obra → MATERIALES → PEDIDOS DE MATERIAL
   y el área quedaba EN BLANCO — los contadores de arriba bien ("PEDIDOS ACTIVOS: 6") y abajo
   nada, ni siquiera el mensaje de vacío. Se arreglaba solo con F5. Auditoría de 13 agentes con
   refutación confirmó la causa:

   El panel de COMPRAS se lleva PRESTADOS los nodos reales de la obra (mat-pedidos,
   mat-inventario, mat-ordenes, mat-gastos). El cierre correcto (_cerrarPanelBodegaDom, v1040)
   los DEVUELVE antes de destruir el panel. Pero _herrRefrescarPanel —que corre al cargar,
   despachar o devolver una herramienta— hacía m.remove() DIRECTO: los 4 nodos se iban del DOM
   con el modal y no volvían hasta recargar. Era la ÚNICA de las ~17 destrucciones del panel
   que se salteaba el cierre correcto.

   Después, en la obra: renderMateriales pintaba los KPIs (viven fuera de los nodos prestados)
   y TRONABA al buscar matBody (vive dentro de mat-inventario, ya inexistente) — nunca llegaba
   a renderPedidosList. Y setMatTab desreferenciaba mat-inventario/mat-pedidos SIN guarda (las
   otras cuatro pestañas sí la tenían), así que clicar cualquier sub-pestaña también tronaba.

   FIX: (1) _herrRefrescarPanel devuelve los nodos ANTES de destruir el panel, como todos los
   demás cierres; (2) setMatTab gana la misma guarda que ya tenían sus hermanas. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— la única destrucción del panel que no devolvía los nodos —');
const refr = ex(code, 'function _herrRefrescarPanel(');
ok('existe _herrRefrescarPanel', !!refr);
ok('DEVUELVE los nodos prestados antes de destruir el panel', /_comprasDevolverNodos\(\)/.test(refr));
ok('y los devuelve ANTES del remove (el orden es la regla v1040)',
  refr.indexOf('_comprasDevolverNodos') >= 0 && refr.indexOf('_comprasDevolverNodos') < refr.indexOf('.remove()'));
ok('el cierre correcto de siempre sigue intacto', /_comprasDevolverNodos\(\)/.test(ex(code, 'function _cerrarPanelBodegaDom(')));

console.log('\n— setMatTab ya no desreferencia a ciegas —');
const smt = ex(code, 'function setMatTab(');
ok('existe setMatTab', !!smt);
ok('mat-inventario con guarda (antes tronaba si el nodo se había perdido)',
  !/document\.getElementById\('mat-inventario'\)\.style/.test(smt));
ok('mat-pedidos con guarda', !/document\.getElementById\('mat-pedidos'\)\.style/.test(smt));
ok('las dos usan el patrón if-existe de sus hermanas', /invBlock\)/.test(smt) && /pedBlock\)/.test(smt));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
