/* v1070 — CATÁLOGO DE PRECIOS (bug de Antonio, 30-jul): "no está cambiando los precios
   cuando yo hago el cambio, y tampoco... no me llega esa solicitud".
   Causas raíz: (A) proveedoresGlobales era LWW objeto-entero (cualquier subida de otro
   dispositivo revertía el precio) + updateCatProvProducto era el ÚNICO escritor sin
   forceUploadNow + gate silencioso users.manage mataba a precios.autorizar;
   (B) solicitudesPrecios también LWW + la notificación usaba SOLO _notifyByPerm (un
   no-admin no puede leer users → moría en silencio, sin campanita).
   QUINTA mordida del patrón LWW (cobro v953, pedidos v972, facturas v1039, sellos v1064). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— A. el precio editado ya no se revierte —');
const zU = ex('function updateCatProvProducto(');
/* el literal viejo sobrevive citado en el comentario del fix — se valida por POSICIÓN:
   el gate ejecutable inmediatamente antes de `const p = activeProj()` es el nuevo */
ok('quien AUTORIZA precios escribe directo (fuera el gate silencioso de users.manage)', /if \(!_puedeAutorizar\) return;\s*\n\s*const p = activeProj/.test(zU));
ok('sella _ts por producto y por proveedor', /prv\.productos\[idx\]\._ts = Date\.now\(\)/.test(zU) && /prv\._ts = Date\.now\(\)/.test(zU));
ok('sube INMEDIATO (era el único escritor sin forceUploadNow)', /forceUploadNow/.test(zU));
const zR = ex('window.setPrecioRecetaProducto = function') || ex('function setPrecioRecetaProducto(');
ok('el editor de precios de la receta igual (mismo patrón)', /_ts = Date\.now\(\)/.test(zR) && /forceUploadNow/.test(zR) && !/if \(!can\('users\.manage'\)\) return;/.test(zR));

console.log('\n— B. union-merge del catálogo y las solicitudes (adiós LWW) —');
ok('proveedoresGlobales por _mergeById + lápida', /_mProv = _mergeById\(\(state && state\.proveedoresGlobales\)/.test(html) && /proveedoresEliminados/.test(html));
/* v1074: la clave se calcula sobre pr.nombre — en v1070 se pasaba el OBJETO a
   matchKeyProducto(nombre) y TODOS los productos colapsaban a "[OBJECT OBJECT]"
   (no fusionaba y pisaba filas del catálogo). El detalle vive en fuseprods_v1074.cjs. */
ok('fusión INTERNA de productos por clave con _ts (dos personas, productos distintos)', /_fuseProds/.test(html) && /matchKeyProducto\(pr && pr\.nombre\)/.test(html));
ok('solicitudesPrecios por _mergeById + lápida', /_mSolPre = _mergeById\(\(state && state\.solicitudesPrecios\)/.test(html) && /solicitudesPreciosEliminadas/.test(html));
ok('eliminar proveedor deja lápida y sube ya (el sync lo revivía)', /state\.proveedoresEliminados\[targetId\] = Date\.now\(\)/.test(html));
const zA = ex('function autorizarSolicitudPrecio(');
ok('autorizar sella producto, proveedor y solicitud', /ex\._ts=Date\.now\(\)/.test(zA) && /prov\._ts=Date\.now\(\)/.test(zA) && /s\._ts=Date\.now\(\)/.test(zA));
ok('rechazar también sella', /s\._ts=Date\.now\(\)/.test(ex('function rechazarSolicitudPrecio(')));

console.log('\n— C. la solicitud LLEGA (campanita para actores no-admin) —');
const zS = ex('function _crearSolicitudPrecio(');
ok('la solicitud nace sellada', /s\._ts=Date\.now\(\)/.test(zS));
ok('prAddNotif a precios.autorizar + users.manage (sistema B, el que sí funciona)', /prAddNotif\(\{ toPerms:\['precios\.autorizar','users\.manage'\]/.test(zS));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
