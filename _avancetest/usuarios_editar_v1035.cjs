/* v1035 — EDITAR USUARIO SE ABRÍA DEBAJO DE LA LISTA (regresión de v1032).
   Antonio: "cuando le doy usuarios y después editar, como que no me está dejando editar ahí.
   Quiero que TODO lo que tenga que ver con usuarios se maneje únicamente dentro de la pestaña
   de usuarios."

   CAUSA RAÍZ (reproducida en el navegador contra el código desplegado): v1032 le puso a la
   pantalla de usuarios una capa opaca a pantalla completa (98000) y subió SOLO #modalUsers a
   99000. #modalEditUser y #modalEncargados se quedaron en el z-index normal de .modal-bg, que
   es 100. Resultado: el editor SÍ se abría, pero por DEBAJO de la lista de usuarios — desde
   afuera parece que el botón no hace nada. Antes de v1032 los dos valían 100 y el editor
   quedaba encima por orden del documento; el que rompió esto fue el escalón nuevo.

   LA REGLA: la pantalla de usuarios es una ESCALERA de tres peldaños y hay que respetarla
   entera. Si se sube uno solo, lo que se abra desde él queda enterrado.
       capa opaca (tapa la app)  <  lista de usuarios  <  lo que se abre DESDE la lista
   Se resuelve por CLASE en el body, no modal por modal: así cualquier recuadro que se abra
   desde la pantalla de usuarios (hoy editar, agregar y encargados; mañana lo que sea) sale
   arriba sin tener que acordarse de este archivo. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. la pantalla de usuarios se marca mientras está arriba —');
const zA = ex('window._abrirPanelUsuarios = function');
ok('al abrir se marca el body', /pr-usuarios-abierto/.test(zA));
ok('y al cerrar se desmarca', /pr-usuarios-abierto/.test(ex('function _cerrarFondoUsuarios(')));
ok('cerrar la lista sigue quitando la capa', /_cerrarFondoUsuarios/.test(ex('function closeModal(')));

console.log('\n— 2. LA ESCALERA: capa < lista < lo que se abre desde la lista —');
const mCapa  = zA.match(/z-index:(\d+);background:var\(--paper\)/);
const mLista = html.match(/body\.pr-usuarios-abierto #modalUsers\{z-index:(\d+)\}/);
const mSobre = html.match(/body\.pr-usuarios-abierto \.modal-bg\{z-index:(\d+)\}/);
ok('la capa opaca declara su altura', !!mCapa);
ok('la lista tiene su peldaño', !!mLista);
ok('y lo que se abre encima, el suyo', !!mSobre);
const capa = mCapa ? +mCapa[1] : -1, lista = mLista ? +mLista[1] : -1, sobre = mSobre ? +mSobre[1] : -1;
ok('la capa tapa la app', capa >= 98000);
ok('la lista va ARRIBA de la capa', lista > capa);
/* ⚠️ ESTE es el peldaño que faltaba en v1032 y por el que "editar no hacía nada" */
ok('lo que se abre desde la lista va ARRIBA de la lista', sobre > lista);

console.log('\n— 3. cubre a TODOS los recuadros de usuarios, no uno por uno —');
/* .modal-bg es la clase de todos: editar, agregar y encargados quedan cubiertos de una, y
   cualquiera que se agregue después también */
ok('la regla es por clase, no por id del editor', /body\.pr-usuarios-abierto \.modal-bg\{/.test(html));
ok('EDITAR usa un .modal-bg', /<div class="modal-bg" id="modalEditUser"/.test(html));
ok('AGREGAR USUARIO abre ese mismo recuadro', /modalEditUser/.test(ex('function openNewUser(')));
ok('ENCARGADOS DE ASISTENCIA también es un .modal-bg', /<div class="modal-bg" id="modalEncargados"/.test(html));
/* los avisos (prConfirm/prAlert/prPrompt) ya vivían más arriba: BORRAR FIRMA y el ✕ nunca
   se rompieron. Se comprueba que sigan ganándole a la escalera. */
const zPr = (html.match(/prModal-backdrop[^']*z-index:(\d+)/) || [])[1];
ok('los avisos siguen por encima de todo', zPr && +zPr > sobre);

console.log('\n— 4. la gestión de usuarios NO se tocó —');
ok('openEditUser sigue igual', /function openEditUser\(uid\)\{\s*\r?\n\s*const users = loadUsers\(\)/.test(html));
ok('y sigue pintando los permisos', /renderPermsChecklist\(/.test(ex('function openEditUser(')));
ok('la lista sigue saliendo del mismo lugar', /refreshUsersCache\(\)/.test(ex('function openUsersModal(')));
ok('el permiso sigue siendo users.manage', /can\('users\.manage'\)/.test(zA));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
