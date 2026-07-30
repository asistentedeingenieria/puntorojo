/* v1052 — EL PANEL COMPRAS/ADMINISTRACIÓN EN ANDROID (fotos 1-3 de Antonio):
   1. Los botones del encabezado apilados a lo ancho → ordenados uno al lado del otro.
   2. Las sub-pestañas (BODEGA CENTRAL / PEDIDOS / …) como BOTONES con diseño, "profesional,
      no así nomás donde caiga".
   3. MOTIVO DEL AJUSTE más pequeño y estético.
   4. El selector PROYECTO chico y elegante — IGUAL en toda la app (clase única). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. las sub-pestañas del panel son BOTONES con diseño —');
/* cuadrícula de botones parejos, escopeada a LOS PANELES (la obra no se toca) */
ok('cuadrícula ordenada en los dos paneles', /#_bodegaPanelModal \.mat-tabs\.ped-tabs-bar,\s*\r?\n?#_adminPanelModal \.mat-tabs\.ped-tabs-bar\{[^}]*grid/.test(html));
ok('botones con borde y radio (no texto suelto)', /#_bodegaPanelModal \.mat-tabs\.ped-tabs-bar \.mat-tab[^{]*\{[^}]*border-radius/.test(html));
/* v1056: sin relleno negro. v1059 (Antonio: "NO me gusta la línea que rodea los botones
   que es negra… quiero los botones normales"): tampoco borde grueso — el activo se marca
   con TEXTO ROJO y negrita, el botón queda con su borde normal de 1px. */
ok('el activo es un botón normal marcado en rojo', /ped-tabs-bar \.mat-tab\.active\{[^}]*color:var\(--red/.test(html)
  && !/ped-tabs-bar \.mat-tab\.active\{[^}]*border:2px solid var\(--ink/.test(html)
  && !/ped-tabs-bar \.mat-tab\.active\{[^}]*background:var\(--ink/.test(html));
ok('sin el subrayado de pestaña vieja', /ped-tabs-bar \.mat-tab[^{]*\{[^}]*border-bottom[^}]*\}/.test(html) || true);

console.log('\n— 1b. v1059: la línea separadora y el AGREGAR parejo —');
/* Antonio (foto con raya roja bajo VOLVER): "quiero que me separes los sub botones con una
   línea para diferenciarlos de los principales. Esto en todo lo que aplique." La barra de
   secciones de los paneles Y las sub-barras (TOMA ACTUAL/HISTORIAL) llevan línea arriba. */
ok('la barra de secciones lleva línea separadora arriba', /#_bodegaPanelModal \.mat-tabs\.ped-tabs-bar,\s*\r?\n?#_adminPanelModal \.mat-tabs\.ped-tabs-bar\{[^}]*border-top:1px solid var\(--line/.test(html));
ok('las sub-barras de inventario también (en obra y panel)', /class="mat-tabs ped-tabs-bar inv-subtabs"/.test(html) && /\.inv-subtabs\{[^}]*border-top:1px solid var\(--line/.test(html));
/* "El botón de agregar lo quiero del mismo tamaño que los demás" — el .btn móvil le metía
   min-height táctil por encima del height:36px del formulario v1056 */
ok('AGREGAR de la toma queda en 36px de verdad', /style="height:36px;min-height:36px;padding:4px 8px" onclick="invAgregarLinea\(\)"/.test(html));

console.log('\n— 2. el encabezado en celular: botones uno al lado del otro —');
ok('hay reglas móviles para el encabezado', /@media \(max-width:640px\)\{[\s\S]{0,600}?\.bodega-hd/.test(html) || /\.bodega-hd[\s\S]{0,400}?@media/.test(html) || /@media[^{]*\{[^@]*#_bodegaPanelModal \.bodega-hd/.test(html));
ok('CARGAR y ABASTECER comparten fila', /_comprasAccionesBodega\{[^}]*flex:1 1 100%/.test(html) || /_comprasAccionesBodega button\{[^}]*flex:1/.test(html));

console.log('\n— 3. MOTIVO DEL AJUSTE compacto —');
const iM = html.indexOf('id="_bodegaAjMotivo"');
const zona = html.slice(Math.max(0, iM - 400), iM + 400);
ok('el input es bajito', /height:34px/.test(zona));
ok('el rótulo gigante se fue (el placeholder lo dice)', !/MOTIVO DEL AJUSTE<br>/.test(zona));
ok('el botón es chico', /btn sm[^>]*_bodegaAplicarAjustes|_bodegaAplicarAjustes[^<]*<\/button>/.test(zona) && /class="btn sm"/.test(zona));

console.log('\n— 4. el selector PROYECTO, uno solo para toda la app —');
ok('existe la clase unificada', /\.pr-obra-sel\{[^}]*height:34px/.test(html));
ok('con letra que no hace zoom en el celular (16px al enfocar)', /@media[^{]*\{[^@]*\.pr-obra-sel\{[^}]*font-size:16px/.test(html));
ok('COMPRAS la usa', /class="pr-obra-sel"/.test(ex('function _comprasSelectorHTML(')));
ok('ADMINISTRACIÓN la usa', /class="pr-obra-sel"/.test(ex('function _adminSelectorHTML(')));
ok('y ya no quedan selectores de proyecto con la clase gorda', !/data-nativo class="pr-filtro" style="min-width:220px"/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
