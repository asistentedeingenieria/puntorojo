/* v1269: callable resetUserClave en functions/index.js (la base gen2 YA desplegada).
   Los usuarios de PIN tienen email sintético (@u.puntorojo.app): el "olvidé mi clave"
   por correo jamás les llega y el cliente NO puede cambiar la clave de OTRO usuario.
   Solo el Admin SDK puede. Reglas de la función: caller autenticado + con users.manage
   o '*' en SU doc users/{uid}; clave temporal mínima 6; a un admin ('*') solo lo
   restablece otro admin; deja mustChangePassword=true (el usuario elige clave propia
   al entrar) y rastro de quién/cuándo. */
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'functions', 'index.js'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const i = src.indexOf('exports.resetUserClave');
const z = i >= 0 ? src.slice(i, i + 3500) : '';

ok('exports.resetUserClave existe y es onCall', i >= 0 && /onCall\(/.test(z));
ok('el import de v2/https trae onCall y HttpsError', /require\('firebase-functions\/v2\/https'\)/.test(src) && /onCall/.test(src.slice(0, 2000)) && /HttpsError/.test(src.slice(0, 2000)));
ok('exige sesión (unauthenticated si no hay request.auth)', /request\.auth/.test(z) && /unauthenticated/.test(z));
ok('verifica permisos del CALLER contra SU doc users/{uid}', /users'\)\.doc\(request\.auth\.uid\)/.test(z) && /users\.manage/.test(z));
ok("admin = perms incluye '*'", /includes\('\*'\)/.test(z));
ok('clave temporal mínima 6', /clave\.length < 6/.test(z));
ok('si el destino no tiene perfil: not-found con pista de cuenta huérfana', /not-found/.test(z) && /hu[ée]rfana/i.test(z));
ok("a un admin solo lo restablece otro admin", /targetPerms\.includes\('\*'\)/.test(z));
ok('cambia la clave REAL en Auth (updateUser con password)', /updateUser\(uid, \{ password: clave \}\)/.test(z));
ok('deja mustChangePassword=true y rastro de quién/cuándo', /mustChangePassword: true/.test(z) && /claveReseteadaPor/.test(z));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
