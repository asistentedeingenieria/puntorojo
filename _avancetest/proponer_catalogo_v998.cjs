/* v998 (pedido de Antonio 27-jul): "quiero poner una opción para seleccionar personas que
   puedan proponer agregar productos nuevos y proveedores nuevos. Debo yo autorizarlo."

   El permiso ya existía ('precios.proponer' — Ver catálogo de precios y proponer cambios) y
   el circuito de autorización también (state.solicitudesPrecios con tipo ALTA, que crea el
   producto y hasta el proveedor al autorizarse). Lo que faltaba: los BOTONES. En el catálogo
   maestro, "+ AGREGAR PRODUCTO" y el "+" de proveedor eran data-perm="users.manage", así que
   quien podía proponer no tenía por dónde.

   FIX: quien tiene precios.proponer ve PROPONER PRODUCTO y PROPONER PROVEEDOR; ambos crean
   una SOLICITUD (no tocan el catálogo) que le llega al autorizador para aprobar o rechazar. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── el permiso es asignable por persona ──
ok('el permiso existe en la lista asignable', /key: 'precios\.proponer'/.test(html));

// ── proponer PRODUCTO ──
const zP = ex('window._catProponerProducto = async function');
ok('existe el proponer producto', !!zP);
ok('lo puede usar quien PROPONE (no solo el admin)', /precios\.proponer/.test(zP));
ok('crea una SOLICITUD tipo ALTA, no toca el catálogo', /_crearSolicitudPrecio\('ALTA'/.test(zP));
ok('no escribe en prv.productos directamente', !/prv\.productos\.push/.test(zP));
ok('pide nombre y precio', /prPrompt|_catPropModal/.test(zP));

// ── proponer PROVEEDOR ──
const zPv = ex('window._catProponerProveedor = async function');
ok('existe el proponer proveedor', !!zPv);
// el 8º argumento de _crearSolicitudPrecio es proveedorNombreFallback: con él, autorizar
// el ALTA crea el proveedor que todavía no existe (sin proveedorId no habría a quién colgarlo)
ok('manda el nombre del proveedor nuevo como fallback', /_crearSolicitudPrecio\('ALTA', '',[\s\S]*String\(_nomProv\)\.toUpperCase\(\)\)/.test(zPv));
ok('tampoco crea el proveedor al vuelo', !/_getProveedores\(\)\.push/.test(zPv));

// ── los botones aparecen para el proponente ──
ok('el catálogo muestra PROPONER PRODUCTO', /PROPONER PRODUCTO/.test(html));
ok('y PROPONER PROVEEDOR', /PROPONER PROVEEDOR/.test(html));
const zRender = ex('function renderCatProvProductos(');
ok('el admin sigue agregando directo', /addProductoToProveedor\(\)/.test(html) && /_esAdminCat/.test(zRender));

// ── la autorización sigue siendo del autorizador ──
const zA = ex('function autorizarSolicitudPrecio(');
ok('autorizar exige precios.autorizar o admin', /can\('precios\.autorizar'\)\|\|can\('users\.manage'\)/.test(zA.replace(/\s/g,'')));
ok('al autorizar un ALTA se crea el proveedor si no existía', /s\.tipo==='ALTA'/.test(zA.replace(/\s+/g,'')) || /tipo === 'ALTA'/.test(zA));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
