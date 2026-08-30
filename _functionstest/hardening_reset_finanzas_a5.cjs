/* Hardening backend batch 4 — A5: resetUserClave no deja que un NO-admin (users.manage
   sin '*') tome cuentas SENSIBLES. Antes solo bloqueaba tomar un admin ('*'); un gestor de
   usuarios podía resetear la clave de FINANZAS (anticipos.transferir/cobro/planilla.aprobar)
   y entrar como esa persona → fraude interno. Ahora: si el target tiene un permiso sensible
   (financiero o de gestión) y el caller no es '*', se niega. Análogo al admin-only-resets-admin. */
const fs = require('fs'), path = require('path');
const js = fs.readFileSync(path.join(__dirname, '..', 'functions', 'index.js'), 'utf8');
function extractAt(startIdx){ let i=js.indexOf('{',startIdx),d=0; for(;i<js.length;i++){ if(js[i]==='{')d++; else if(js[i]==='}'){ d--; if(d===0) return js.slice(startIdx,i+1); } } return ''; }
function extractFn(name){ const m=js.indexOf('function '+name+'('); return m<0?'':extractAt(m); }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* helper puro _puedeResetearClave(callerPerms, targetPerms) → {ok, motivo} */
const src = extractFn('_puedeResetearClave');
const listSrc = (js.match(/const _permsSensibles\s*=\s*\[[\s\S]*?\];/) || [''])[0];
ok('_puedeResetearClave existe', !!src);
if (src) {
  const fn = new Function(listSrc + '\n' + src + '\nreturn _puedeResetearClave;')();
  const A = ['*'], M = ['users.manage'], FIN = ['anticipos.transferir'], NADA = ['avance.edit'];
  ok('admin resetea a cualquiera (finanzas)', fn(A, FIN).ok === true);
  ok('admin resetea a otro admin', fn(A, A).ok === true);
  ok('users.manage resetea a un usuario común', fn(M, NADA).ok === true);
  ok('users.manage NO resetea a finanzas', fn(M, FIN).ok === false);
  ok('users.manage NO resetea a quien cobra', fn(M, ['cobro.edit']).ok === false);
  ok('users.manage NO resetea a quien aprueba planilla', fn(M, ['planilla.aprobar']).ok === false);
  ok('users.manage NO resetea a otro gestor de usuarios', fn(M, M).ok === false);
  ok('users.manage NO resetea a un admin', fn(M, A).ok === false);
  ok('el bloqueo trae motivo', typeof fn(M, FIN).motivo === 'string' && fn(M, FIN).motivo.length > 0);
  ok('arrays raros no revientan', fn(null, undefined).ok === true && fn(M, []).ok === true);
}

/* lista de permisos sensibles cubre lo financiero y la gestión */
const srcList = extractFn('_permsSensibles') || (js.match(/_permsSensibles\s*=\s*\[[\s\S]*?\]/) || [''])[0];
ok('define permisos sensibles', /anticipos\.transferir/.test(js) && /precios\.autorizar/.test(js) && /users\.manage/.test(js) && /planilla\.(aprobar|authorize)/.test(js) && /cobro\.edit/.test(js));

/* wiring: resetUserClave usa el helper y sigue con el admin-only-resets-admin previo */
const rst = js.slice(js.indexOf('exports.resetUserClave'));
ok('resetUserClave llama _puedeResetearClave', /_puedeResetearClave\s*\(/.test(rst));
ok('conserva el gate auth + users.manage', rst.indexOf("'SIN SESIÓN'") >= 0 && rst.indexOf("users.manage") >= 0);
ok('lanza permission-denied con el motivo', /HttpsError\('permission-denied'/.test(rst));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
