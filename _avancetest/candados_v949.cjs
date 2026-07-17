/* v949 (pedido de Antonio, candados primero):
   - CARGAR RECETA (EXCEL) solo admin.
   - Quitar el botón PRECIOS de la receta (queda el CATÁLOGO DE PRECIOS de ÓRDENES).
   - Permiso de receta = PROPONER: quien lo tiene solicita cambios (agregar/editar/eliminar),
     el admin aplica directo y autoriza. Nadie sin permiso toca la receta.
   - Eliminar PEDIDOS y ÓRDENES DE COMPRA solo el admin (users.manage).
   (La edición POR MODELO es v950, aparte.) */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
function extractAssign(name){ let m=html.indexOf('window.'+name+' = '); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. CARGAR RECETA (EXCEL) solo admin ──
ok('botón CARGAR RECETA con data-perm users.manage', /id="btnCargarReceta"[^>]*data-perm="users\.manage"/.test(html));
const imp = extractAssign('importarRecetaExcel');
ok('importarRecetaExcel exige SOLO admin', /if \(!can\('users\.manage'\)\) return showToast\('SIN PERMISO PARA CARGAR RECETA'/.test(imp));
ok('importarRecetaExcel ya no acepta receta.edit', !/can\('receta\.edit'\)/.test(imp));

// ── 2. Botón PRECIOS quitado de la barra de receta ──
const barra = (html.match(/id="btnVerSolReceta"[\s\S]{0,600}?<\/div>/) || [''])[0];
ok('la barra de receta ya no tiene el botón PRECIOS', !!barra && !/btnPreciosReceta/.test(barra) && !/verCatalogoPreciosReceta\(\)/.test(barra));
ok('el CATÁLOGO DE PRECIOS de ÓRDENES sigue existiendo', /onclick="openCatalogoProveedores\(\)"/.test(html));

// ── 3. Permiso de receta = PROPONER; admin aplica directo ──
const render = extractAssign('renderRecetaV2');
ok('render: esAdminReceta = can(users.manage)', /esAdminReceta\s*=\s*can\('users\.manage'\)/.test(render));
ok('render: puedeProponer = can(receta.edit)', /puedeProponer\s*=\s*can\('receta\.edit'\)/.test(render));
ok('render: acción admin=op, no-admin=solicitar', /accionReceta\s*=\s*esAdminReceta\s*\?\s*'recetaV2Op'\s*:\s*'recetaV2Solicitar'/.test(render));
ok('render: controles visibles solo con permiso (puedeVerControles)', /puedeVerControles/.test(render));
ok('render: ya no usa el viejo puedeEditar', !/\bpuedeEditar\b/.test(render));
const op = extractAssign('recetaV2Op');
ok('recetaV2Op (aplicar directo) exige SOLO admin', /if \(!can\('users\.manage'\)\) return showToast\('SIN PERMISO'/.test(op));

// ── 4. Autorizar/rechazar/ver solicitudes de receta = receta.autorizar o admin ──
const aut = extractAssign('autorizarReceta');
ok('autorizarReceta gate = receta.autorizar || users.manage', /can\('receta\.autorizar'\)\s*\|\|\s*can\('users\.manage'\)/.test(aut));
const rec = extractAssign('rechazarReceta');
ok('rechazarReceta gate = receta.autorizar || users.manage', /can\('receta\.autorizar'\)\s*\|\|\s*can\('users\.manage'\)/.test(rec));

// ── 5. Permisos nuevos en el catálogo ──
ok('PERMS_DISPONIBLES tiene receta.autorizar', /key:\s*'receta\.autorizar'/.test(html));
ok('receta.edit relabelado a PROPONER', /key:\s*'receta\.edit'[^}]*label:\s*'[^']*[Pp]ropon/.test(html));

// ── 6. Eliminar PEDIDOS solo admin ──
ok('ningún gate de borrado con pedidos.create/advance', !/can\('users\.manage'\)\s*\|\|\s*can\('pedidos\.create'\)\s*\|\|\s*can\('pedidos\.advance'\)/.test(html));
const dp = extractFn('deletePedido');
ok('deletePedido sigue pasando por requestDeletion', /requestDeletion/.test(dp));

// ── 7. Eliminar ÓRDENES DE COMPRA solo admin, sin romper subir factura (v947) ──
ok('la lista de OC define canDeleteOC = solo admin', /canDeleteOC\s*=\s*can\('users\.manage'\)/.test(html));
ok('el botón ✕ de la OC usa canDeleteOC', /canDeleteOC\s*\?\s*`<button[^`]*deleteOrden/.test(html));
ok('el botón de factura sigue para compras (no admin-only)', /canFactura\s*=\s*can\('compras\.autorizar'\)\s*\|\|\s*can\('users\.manage'\)/.test(html) && /isAuth\s*&&\s*canFactura/.test(html));
const dOrd = extractFn('deleteOrden');
ok('deleteOrden exige SOLO admin', /if \(!can\('users\.manage'\)\)/.test(dOrd) && !/compras\.autorizar/.test(dOrd));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
