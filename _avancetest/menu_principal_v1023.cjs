/* v1023 — el MENÚ PRINCIPAL como puerta real (cuatro correcciones de Antonio):
   1. "lo primero que se vea en la app sea lo de la foto"
   2. "los subtitulos de cada cosa esten en mayuscula"
   3. "cuando se metan a alguna pestaña y despues quieran cambiar, un boton que diga volver a
       menu principal y tengan que escoger asi como la foto siempre que quieran cambiar"
   4. "NO TODOS los usuarios pueden ver bodega central, proyectos varios y administracion.
       Esto predeterminadamente nadie lo ve y yo doy el permiso." */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. NADIE ve las tres ubicaciones sin permiso propio —');
/* el agujero anterior: se colaban por permisos de OTRA cosa — quien podía crear pedidos veía
   PROYECTOS VARIOS (o sea casi todo el mundo) y quien revisaba compras veía BODEGA CENTRAL */
const zB = ex('function _puedeVerBodega('), zV = ex('function _puedeVerVarios('), zA = ex('function _puedeVerAdmin(');
ok('BODEGA CENTRAL pide su propio permiso', /can\('menu\.bodega'\)/.test(zB));
/* se mira el return, no el comentario que explica de dónde se viene */
const _retB = (zB.match(/return[^;]*;/) || [''])[0];
ok('y ya no entra por compras.revisar', !/compras\.revisar/.test(_retB) && !/materiales\.bodega/.test(_retB));
ok('PROYECTOS VARIOS pide el suyo', /can\('menu\.varios'\)/.test(zV));
ok('y ya no entra por pedidos.create', !/pedidos\.create/.test(zV));
ok('ADMINISTRACIÓN pide el suyo', /can\('menu\.admin'\)/.test(zA));
ok('y ya no entra por polizas.edit', !/polizas\.edit/.test(zA));
ok('el admin sigue viendo todo (si no, nadie podría repartir permisos)',
   /users\.manage/.test(zB) && /users\.manage/.test(zV) && /users\.manage/.test(zA));
console.log('   los tres permisos existen para poder darlos:');
ok('menu.bodega está en el catálogo', /key: 'menu\.bodega'/.test(html));
ok('menu.varios también', /key: 'menu\.varios'/.test(html));
ok('menu.admin también', /key: 'menu\.admin'/.test(html));
ok('agrupados aparte para encontrarlos', /group: 'MENÚ PRINCIPAL'/.test(html));

console.log('\n— 2. los subtítulos van en mayúscula —');
/* v1034: el menú son dos piezas — la pantalla y el bloque de empresa, que se arma aparte
   para poder no pintarlo cuando la persona no tiene ninguna de esas opciones */
const zP = ex('window._abrirPantallaObra = function') + ex('function _bloqueEmpresaHTML(');
ok('SIN PENDIENTES', /'SIN PENDIENTES'/.test(zP));
ok('PEDIDOS ACTIVOS', /PEDIDO\$\{[^}]*\} ACTIVO/.test(zP));
ok('LA ÚLTIMA DONDE TRABAJASTE', /LA ÚLTIMA DONDE TRABAJASTE/.test(zP));
/* v1040: la tarjeta pasó a COMPRAS con bajada nueva, siempre en MAYÚSCULA */
ok('EXISTENCIAS Y COMPRAS', /'BODEGA, PEDIDOS, OC, INVENTARIOS Y GASTOS'/.test(zP));
ok('OBRAS CHICAS Y REPARACIONES', /'OBRAS CHICAS Y REPARACIONES'/.test(zP));
ok('PÓLIZAS Y ANTICIPOS', /'PÓLIZAS Y ANTICIPOS'/.test(zP));
ok('y la bajada del título', /TODO LO QUE VEAS DESPUÉS/.test(zP));
ok('ya no queda ninguno en minúscula', !/'sin pendientes'|'existencias y compras'|'pólizas y anticipos'/.test(zP));

console.log('\n— 3. de cada ubicación se vuelve al MENÚ PRINCIPAL —');
ok('los tres paneles lo dicen así', (html.match(/VOLVER AL MENÚ PRINCIPAL/g) || []).length >= 3);
ok('y de verdad reabren el menú', (html.match(/_abrirPantallaObra\(true\)/g) || []).length >= 4);
ok('bodega', /_cerrarPanelBodega\(\); window\._abrirPantallaObra\(true\)/.test(html));
ok('varios', /_cerrarPanelVarios\(\); window\._abrirPantallaObra\(true\)/.test(html));
ok('administración', /_cerrarPanelAdmin\(\); window\._abrirPantallaObra\(true\)/.test(html));

console.log('\n— 4. es lo primero que se ve —');
/* v1026: se engancha por el insistidor, que reintenta hasta que lleguen los proyectos */
ok('se abre al arrancar', /_asegurarMenuInicial\(\)/.test(ex('function renderAll(')));
ok('tapa todo (capa opaca a pantalla completa)', /z-index:99500/.test(zP) && /background:var\(--paper\)/.test(zP));
ok('y por encima de los paneles de empresa (98000)', zP.indexOf('99500') > 0);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
