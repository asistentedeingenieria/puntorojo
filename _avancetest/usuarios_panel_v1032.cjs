/* v1032 — USUARIOS con su propio espacio.
   Antonio: "quiero que usuarios sea también una pestaña solo para usuarios, así como funciona
   bodega central. Que sea una cosa sola para usuarios y no salga nada atrás como la foto."

   NO se reescribió la gestión de usuarios (él fue explícito la vez pasada: "solo movela, no
   toques nada"). Se le pone detrás una capa opaca a pantalla completa que tapa el dashboard,
   y el modal se sube por encima de ella. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— el espacio propio —');
const zA = ex('window._abrirPanelUsuarios = function');
ok('existe', zA.length > 200);
ok('pone una capa a pantalla completa', /position:fixed;inset:0/.test(zA));
ok('opaca (tapa lo de atrás)', /background:var\(--paper\)/.test(zA));
ok('con el mismo z-index que los paneles de bodega y varios', /z-index:98000/.test(zA));
/* ⚠️ trampa de apilado que costó 4 intentos en v1002-v1006: .modal-bg vale z-index 100, así
   que sobre una capa de 98000 el modal quedaría DEBAJO — invisible, como si la app sacara al
   usuario de la pantalla */
ok('y sube el modal POR ENCIMA de la capa', /_m\.style\.zIndex = '99000'/.test(zA));
ok('respeta el permiso', /can\('users\.manage'\)/.test(zA));

console.log('\n— al cerrar no queda nada colgando —');
const zC = ex('function closeModal(');
ok('closeModal quita la capa de usuarios', /name === 'users'/.test(zC) && /_cerrarFondoUsuarios/.test(zC));
ok('y devuelve el z-index normal (mecanismo de v1006)', /_m\.style\.zIndex = ''/.test(zC));
ok('existe la función que la quita', /function _cerrarFondoUsuarios\(/.test(html));

console.log('\n— la gestión de usuarios NO se tocó —');
ok('openUsersModal sigue igual', /function openUsersModal\(\)\{\s*\r?\n\s*if \(!can\('users\.manage'\)\)/.test(html));
ok('sigue refrescando la lista desde la nube', /refreshUsersCache\(\)/.test(ex('function openUsersModal(')));
ok('el modal de usuarios sigue en su lugar', /<div class="modal-bg" id="modalUsers"/.test(html));

console.log('\n— se entra desde el menú —');
const zP = ex('window._abrirPantallaObra = function');
ok('el menú abre el panel, no el modal pelado', /_entrarA\('_abrirPanelUsuarios'\)/.test(zP));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
