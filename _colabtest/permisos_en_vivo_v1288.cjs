/* v1288 (Antonio, 26-ago: la casilla anticipos.transferir marcada y a finanzas NO le
   salía el botón — y "ella ahorita no puede" correr nada en su aparato):
   los permisos se leían UNA sola vez al entrar (applyAuthSession arma currentUser.perms
   y nadie los refresca), así que marcar una casilla no hacía NADA en las sesiones
   abiertas hasta cerrar sesión y volver a entrar.
   FIX: PERMISOS EN VIVO — cada sesión escucha su propio doc users/<uid> con onSnapshot;
   al cambiar las casillas (o la obra asignada) la sesión las aplica al instante:
   applyPermissions() + repintado que respeta isUserBusy (regla v770, no pisar modales).
   El logout desuscribe; el error callback traga el permission-denied del cierre. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* ── 1. comparador PURO ── */
const zC = ex('function _permsCambiaron(');
ok('_permsCambiaron existe', zC.length > 40);
if (zC.length > 40) {
  try {
    const f = new Function(zC + '\nreturn _permsCambiaron;')();
    ok('mismo juego en otro orden = SIN cambio', f(['a','b'], ['b','a']) === false);
    ok('casilla nueva = cambio', f(['a'], ['a','anticipos.transferir']) === true);
    ok('null y vacío son lo mismo', f(null, []) === false);
    ok('quitar casilla también es cambio', f(['a','b'], ['a']) === true);
  } catch(e){ ok('comparador evaluable', false); console.log('  ' + e.message); }
}

/* ── 2. la suscripción ── */
const zS = ex('function _suscribirPermisosEnVivo(');
ok('escucha SU doc users/<uid> con onSnapshot', /collection\('users'\)\.doc\(fbUser\.uid\)\.onSnapshot/.test(zS));
/* v1300: la aplicación vive en el helper _permsAplicarFrescos (compartido con el
   refresco bajo demanda de anticipos) — las mismas garantías, otra casa */
const zAF = ex('function _permsAplicarFrescos(');
ok('si nada cambió no hace nada', /_permsCambiaron/.test(zAF) && /return false;/.test(zAF) && /_permsAplicarFrescos\(/.test(zS));
ok('aplica permisos y también la obra asignada', /applyPermissions\(\)/.test(zAF) && /obraAsignada/.test(zAF));
ok('el repintado respeta isUserBusy (v770)', /isUserBusy/.test(zAF) && /renderAll\(\)/.test(zAF));
ok('mata la suscripción anterior antes de abrir otra', /_permsUnsub/.test(zS.slice(0, zS.indexOf('onSnapshot'))));
ok('el error callback traga el permission-denied del cierre', /onSnapshot\(function[\s\S]*, function\(/.test(zS));

/* ── 3. enganches ── */
ok('applyAuthSession la llama', /_suscribirPermisosEnVivo\(fbUser\)/.test(ex('function applyAuthSession(')));
ok('el logout desuscribe', /_permsUnsub/.test(ex('function _showLoginScreenNow(')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
