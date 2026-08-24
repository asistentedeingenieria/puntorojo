/* v1269 (Antonio, 24-ago: "unos usuarios no les deja ingresar sesión... no sé por qué...
   esto no puede suceder nunca"): blindaje del circuito de LOGIN.
   Auditoría (8 agentes + lectura directa) encontró:
   (1) la lectura del perfil users/{uid} al entrar NO reintentaba: cualquier tropiezo
       de red devolvía al login con error genérico; y un exists=false venido del CACHÉ
       expulsaba con "LA CUENTA NO TIENE PERMISOS" a usuarios válidos;
   (2) NO había rastro de POR QUÉ falla un login (Antonio se entera "de oídas");
   (3) usuarios de PIN (email sintético @u.puntorojo.app): el "olvidé mi clave" por
       correo jamás les llega y el admin NO tenía forma de restablecer una clave
       (el modal EDITAR dice "no se cambia clave desde acá") → PIN olvidado = afuera
       PARA SIEMPRE;
   (4) el mensaje "EMAIL O CLAVE INCORRECTOS" confunde a quien entra con usuario.
   FIX: _leerPerfilRobusto (3 intentos, caché-negativo se confirma en servidor,
   permission-denied corta) · telemetría _loginDiag/_loginDiagFlush (cola local
   pr_login_diag + doc idempotente en loginDiag) · botón RESTABLECER CLAVE en EDITAR
   USUARIO → callable resetUserClave (Admin SDK) · mensaje para usuarios sin @. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

(async () => {

/* ── 1. _leerPerfilRobusto: funcional, con docRef simulado ── */
const srcLeer = ex('async function _leerPerfilRobusto');
ok('_leerPerfilRobusto existe', srcLeer.length > 100);
let f = null;
try { f = new Function('setTimeout', srcLeer + '; return _leerPerfilRobusto;')(fn => fn()); } catch(e){ console.log('  eval:', e.message); }
ok('_leerPerfilRobusto evalúa', typeof f === 'function');

if (f) {
  let calls1 = 0;
  const ref1 = { get: async () => { calls1++; if (calls1 < 3) { const e = new Error('net'); e.code = 'unavailable'; throw e; } return { exists: true }; } };
  const r1 = await f(ref1);
  ok('reintenta: dos fallos de red y al 3º entra', r1.doc && r1.doc.exists === true && calls1 === 3);

  const ref2 = { get: async (o) => (o && o.source === 'server') ? ({ exists: true }) : ({ exists: false, metadata: { fromCache: true } }) };
  const r2 = await f(ref2);
  ok('un "no existe" del CACHÉ se confirma contra el servidor (no expulsa)', r2.doc && r2.doc.exists === true);

  let calls3 = 0;
  const ref3 = { get: async () => { calls3++; const e = new Error('perm'); e.code = 'permission-denied'; throw e; } };
  const r3 = await f(ref3);
  ok('permission-denied corta de una (reintentar no ayuda)', r3.error && r3.error.code === 'permission-denied' && calls3 === 1);

  const ref4 = { get: async () => ({ exists: false, metadata: { fromCache: false } }) };
  const r4 = await f(ref4);
  ok('un "no existe" confirmado por el SERVIDOR se respeta (expulsión legítima)', r4.doc && r4.doc.exists === false);
}

/* ── 2. el listener usa la lectura robusta y su catch distingue causas ── */
const iListener = html.indexOf("firebase.auth().onAuthStateChanged(async (fbUser)");
const zList = html.slice(iListener, iListener + 4200);
ok('el listener lee el perfil vía _leerPerfilRobusto (no get() directo)', /_leerPerfilRobusto\(docRef\)/.test(zList));
ok('el catch distingue permission-denied (reglas) de un fallo de red', /permission-denied/.test(zList) && /REGLAS DE FIRESTORE/.test(zList) && /REVISAR INTERNET/.test(zList));
ok('la expulsión sin perfil deja rastro (_loginDiag) antes del signOut', /_loginDiag\('expulsado-sin-perfil'/.test(zList));

/* ── 3. telemetría _loginDiag ── */
const srcDiag = ex('function _loginDiag(');
ok('_loginDiag: cola local pr_login_diag recortada a 30', /pr_login_diag/.test(srcDiag) && /slice\(-30\)/.test(srcDiag));
ok('_loginDiag: escribe doc IDEMPOTENTE en loginDiag (doc(id).set, con catch)', /collection\('loginDiag'\)\.doc\(/.test(srcDiag) && /\.set\(/.test(srcDiag) && /catch/.test(srcDiag));
const srcFlush = ex('function _loginDiagFlush(');
ok('_loginDiagFlush: sube la cola local al entrar', /pr_login_diag/.test(srcFlush) && /loginDiag/.test(srcFlush));
const srcApply = ex('function applyAuthSession(');
ok('applyAuthSession dispara el flush de la cola', /_loginDiagFlush\(\)/.test(srcApply));

/* ── 4. doLogin: rastro + mensaje para usuarios sin @ ── */
const srcLogin = ex('async function doLogin(');
ok('doLogin registra el fallo (_loginDiag login-fallo con código)', /_loginDiag\('login-fallo'/.test(srcLogin));
ok('doLogin: mensaje USUARIO O CLAVE INCORRECTOS cuando no es correo', /USUARIO O CLAVE INCORRECTOS/.test(srcLogin) && /indexOf\('@'\)/.test(srcLogin));

/* ── 5. RESTABLECER CLAVE (admin) ── */
ok('botón euResetClaveBtn en el modal, escondido por defecto', /id="euResetClaveBtn"[^>]*display:none/.test(html) && /resetearClaveUsuario\(\)/.test(html));
const srcOpenEdit = ex('function openEditUser(');
ok('openEditUser muestra el botón solo para cuentas con email', /euResetClaveBtn/.test(srcOpenEdit));
const srcOpenNew = ex('function openNewUser(');
ok('openNewUser lo esconde', /euResetClaveBtn/.test(srcOpenNew));
const srcReset = ex('window.resetearClaveUsuario = async function');
ok('resetearClaveUsuario: exige users.manage y pide la clave con prPrompt', /can\('users\.manage'\)/.test(srcReset) && /prPrompt/.test(srcReset));
ok('resetearClaveUsuario: llama la callable con el ID token (Bearer)', /getIdToken\(\)/.test(srcReset) && /resetUserClave/.test(srcReset) && /Bearer/.test(srcReset));
ok('resetearClaveUsuario: clave numérica mínima 6 para cuentas de PIN', /_isUserAccountEmail/.test(srcReset) && /\[0-9\]/.test(srcReset));
ok('resetearClaveUsuario: si la función no está desplegada, lo dice (404)', /404/.test(srcReset) && /DESPLEGAR/i.test(srcReset));

/* ── 6. hallazgos extra de la auditoría (28 agentes, verificados) ── */
// 6a. clave de PIN sin espacios: el autofill/copypaste mete espacios y "la clave correcta" falla
ok('doLogin recorta espacios de la clave cuando el usuario NO es correo', /pass = pass\.trim\(\)/.test(srcLogin));
// 6b. "INGRESANDO..." eterno: sin timeout, con mala señal la promesa ni resuelve ni rechaza
const srcTimeout = ex('function _conTimeout(');
ok('_conTimeout existe (Promise.race con código pr/timeout)', /Promise\.race/.test(srcTimeout) && /pr\/timeout/.test(srcTimeout));
ok('doLogin envuelve el signIn en _conTimeout', /_conTimeout\(/.test(srcLogin));
const srcTrad = ex('function traducirErrorFirebase(');
ok('pr/timeout tiene mensaje claro en español', /pr\/timeout/.test(srcTrad) && /SIN RESPUESTA/.test(srcTrad));
// 6c. clave vieja auto-rellenada por Chrome → ráfaga de fallos → too-many-requests:
//     tras INCORRECTOS se limpia el campo para que el próximo intento sea tipeado
ok('doLogin limpia la clave tras INCORRECTOS (mata el autofill viejo)', (srcLogin.match(/loginPass'\)\.value = ''/g) || []).length >= 2);
// 6d. alta NO atómica: si el doc del perfil no se pudo escribir, se REVIERTE la cuenta
//     Auth recién creada (cred.user.delete) para que el alta se pueda reintentar
const srcSaveUser = ex('async function saveUser(');
ok('saveUser reintenta la escritura del perfil (3 intentos)', /_docOk/.test(srcSaveUser) && /saveUserDoc\(uid, profile\)/.test(srcSaveUser));
ok('saveUser revierte la cuenta Auth si el perfil no se pudo guardar', /cred\.user\.delete\(\)/.test(srcSaveUser));
// 6e. el input del "olvidé mi clave" caía en la trampa readonly del anti-autofill (v487)
const srcForgot = ex('function openForgotPasswordModal(');
ok('openForgotPasswordModal aplica el antídoto readonly antes de enfocar', /removeAttribute\('readonly'\)/.test(srcForgot) && /data-naf-ro/.test(srcForgot));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
})();
