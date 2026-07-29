/* v1037 — ACTIVIDAD SOLO PARA EL ADMINISTRADOR CON ACCESO TOTAL.
   Antonio: "quiero la pestaña de actividad que se la quites a todos los usuarios y solo me la
   dejes a mi."

   La regla sin tocar datos: la pestaña la ve únicamente quien tiene ACCESO TOTAL (perms '*').
   No se borra ningún permiso guardado — el gate simplemente los ignora. Y la casilla "Ver
   Actividad" sale del checklist de usuarios: dejarla marcable sin efecto sería repetir la
   trampa v1034 de la casilla que no hace nada. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. la regla —');
const zA = ex('function _puedeVerActividad(');
let f = null;
try { f = (u) => new Function('getCurrentUser', 'return (' + zA + ')')(() => u)(); } catch(e){}
ok('existe la función', typeof f === 'function' && zA.length > 40);
if (f) {
  ok('el admin con acceso total SÍ la ve', f({ perms: ['*'] }) === true);
  ok('un usuario con la vieja casilla view.actividad NO', f({ perms: ['view.actividad'] }) === false);
  ok('el solo lectura (ve todo) tampoco', f({ perms: ['view.*'] }) === false);
  ok('un usuario con permisos de actividad tampoco', f({ perms: ['actividad.ver'] }) === false);
  ok('sin usuario, nada', f(null) === false);
} else { ['admin','casilla','ro','actividad.*','sin user'].forEach(n => ok(n, false)); }

console.log('\n— 2. la pestaña respeta la regla —');
const zP = ex('function applyPermissions(');
ok('applyPermissions trata ACTIVIDAD aparte', /view === 'actividad'/.test(zP) && /_puedeVerActividad/.test(zP));

console.log('\n— 3. la casilla salió del checklist —');
/* v1034 enseñó que una casilla que no hace nada es peor que ninguna casilla */
ok('ya no se puede marcar Ver Actividad', !/key: 'view\.actividad'/.test(html));

console.log('\n— 4. nadie aterriza en ACTIVIDAD por el fallback —');
/* _elegirObraYEntrar y _aplicarModoVista eligen "la primera pestaña que puedas ver" de una
   lista que incluía actividad: un usuario al que can() le diera view.actividad implícito
   caería en una pestaña que ya no debe ver */
ok('elegir obra la filtra', /_puedeVerActividad/.test(ex('window._elegirObraYEntrar = function')));
ok('el modo de vista también', /_puedeVerActividad/.test(ex('function _aplicarModoVista(')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
