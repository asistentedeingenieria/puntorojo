/* v1031 — USUARIOS pasa al menú principal.
   Antonio: "quiero que la opción de usuarios me la pongas también en el menú a mí como admin
   y NO donde está ahorita. Quiero que SOLO la muevas, mas no toques nada de lo que tenemos."

   Es exactamente eso: un traslado. Misma acción (openUsersModal), mismo permiso
   (users.manage), misma pantalla de usuarios sin un solo cambio. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— se movió —');
ok('ya no está en la barra de arriba', !/\$\{manageBtn\}/.test(html));
const zP = ex('window._abrirPantallaObra = function');
ok('ahora está en el menú principal', /USUARIOS/.test(zP) && /openUsersModal/.test(zP));
ok('en el bloque TODA LA EMPRESA', zP.indexOf('TODA LA EMPRESA') < zP.indexOf('openUsersModal'));
ok('dice para qué es', /PERMISOS Y ACCESOS/.test(zP));

console.log('\n— y NADA más cambió —');
/* v1032: el menú pasa por _abrirPanelUsuarios, que le pone la capa opaca detrás y después
   llama al MISMO openUsersModal de siempre */
ok('la acción de fondo es la misma', /_entrarA\('_abrirPanelUsuarios'\)/.test(html) && /openUsersModal\(\)/.test(ex('window._abrirPanelUsuarios = function')));
ok('el permiso es el mismo', /can\('users\.manage'\)\) return ''/.test(zP));
ok('la pantalla de usuarios sigue igual', /function openUsersModal\(/.test(html));
/* la variable de la barra se conserva definida: si algo más la leyera, no revienta */
ok('no se borró manageBtn, solo se dejó de pintar', /const manageBtn = can\('users\.manage'\)/.test(html));
/* el resto de la barra del usuario (sync, avatar, nombre, rol) queda intacto */
const iU = html.indexOf('uBar.innerHTML');
const zU = html.slice(iU, iU + 700);
ok('la barra conserva el indicador de sync', /syncIndicator/.test(zU));
ok('el avatar y el nombre', /u-name/.test(zU) && /user-info/.test(zU));
ok('y el rol', /u-role/.test(zU));

console.log('\n— entrar desde el menú cierra el menú —');
ok('usa el mismo camino que las otras opciones', /_entrarA\(/.test(zP));
ok('que marca elegido y cierra', /_marcarObraElegida\(\)/.test(ex('window._entrarA = function')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
