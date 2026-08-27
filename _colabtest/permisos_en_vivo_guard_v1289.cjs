/* v1289 (URGENTE, 26-ago — mordida del v1288 A LOS MINUTOS de publicarlo): a ANTONIO
   (admin, perms ['*']) le salió "SIN PERMISO PARA NINGUNA VISTA". Causa: el listener de
   permisos en vivo aplicaba CUALQUIER snapshot de users/<uid> — incluido el eco de
   latencia local de un write pendiente (login escribe {lastLogin} con merge; si el doc
   no está en el cache del SDK, ese eco trae SOLO el campo escrito, SIN perms) — y
   `Array.isArray(d.perms) ? d.perms : []` convertía "sin campo" en "sin permisos":
   borraba los permisos EN MEMORIA de la sesión (la nube nunca se tocó; F5 restaura).
   BLINDAJE, tres candados en el listener:
   1. snapshot con hasPendingWrites → NO se aplica (eco local, no es la verdad);
   2. snapshot fromCache → NO se aplica (solo lo confirmado por el servidor manda);
   3. doc sin el campo perms como ARRAY → NO se aplica (campo ausente ≠ casillas vacías).
   Degradación: sin señal confirmada, la sesión se queda con los permisos del login. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zS = ex('function _suscribirPermisosEnVivo(');
ok('ignora el eco local de writes pendientes', /hasPendingWrites/.test(zS));
ok('solo aplica lo confirmado por el servidor (no fromCache)', /fromCache/.test(zS));
/* v1300: el guard de array vive en _permsAplicarFrescos (helper compartido); el
   listener bloquea el eco local ANTES de delegar. fromCache ya se acepta (es monótono). */
const zAF9 = ex('function _permsAplicarFrescos(');
ok('un doc SIN el campo perms jamás borra casillas', /!Array\.isArray\(d\.perms\)\) return false;/.test(zAF9));
ok('ya no existe el "sin campo = sin permisos"', !/Array\.isArray\(d\.perms\) \? d\.perms : \[\]/.test(zS) && !/Array\.isArray\(d\.perms\) \? d\.perms : \[\]/.test(zAF9));
ok('los candados van ANTES de tocar currentUser', (function(){
  const iGuard = zS.indexOf('hasPendingWrites'), iDeleg = zS.indexOf('_permsAplicarFrescos(');
  return iGuard > 0 && iDeleg > 0 && iGuard < iDeleg && zAF9.indexOf('Array.isArray') < zAF9.indexOf('currentUser.perms =');
})());

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
