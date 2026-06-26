/* v850: el registro de cuentas queda CERRADO. doSetup() (auto-registro) debe rechazar de una
   con un mensaje claro y NUNCA llegar a createUserWithEmailAndPassword. Las cuentas las crea
   el admin desde GESTIÓN DE USUARIOS (secondaryApp + saveUserDoc bajo contexto admin). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractAt(startIdx){ let i=html.indexOf('{',startIdx),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(startIdx,i+1); } } return ''; }
function extractFn(name){ const m=html.indexOf('async function '+name+'('); const m2 = m<0 ? html.indexOf('function '+name+'(') : m; return m2<0?'':extractAt(m2); }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const src = extractFn('doSetup');
ok('doSetup existe', !!src);

// Estructural: el guard de "registro cerrado" aparece ANTES de createUserWithEmailAndPassword
const idxGuard = src.indexOf('REGISTRO ESTÁ CERRADO');
const idxCreate = src.indexOf('createUserWithEmailAndPassword');
ok('guard "REGISTRO CERRADO" presente', idxGuard >= 0);
ok('guard aparece antes de createUser', idxGuard >= 0 && idxCreate >= 0 && idxGuard < idxCreate);
ok('hay return entre el guard y createUser', idxGuard>=0 && idxCreate>=0 && src.slice(idxGuard, idxCreate).indexOf('return') >= 0);

// Funcional: con doSetup llamado, NO se llama createUser y el error muestra el mensaje de cerrado.
if (src) {
  const els = {};
  const docStub = { getElementById: (id) => (els[id] = els[id] || { value:'', textContent:'', focus(){} }) };
  let createCalled = false;
  const fbStub = { auth: () => ({ createUserWithEmailAndPassword: () => { createCalled = true; return Promise.resolve({ user:{ uid:'x' } }); } }), firestore: () => ({ collection: () => ({ get: () => Promise.resolve({ docs:[], empty:true }), limit: () => ({ get: () => Promise.resolve({ empty:true }) }) }) }) };
  const fn = new Function('document','firebase', src + '\nreturn doSetup;')(docStub, fbStub);
  (async () => {
    try { await fn(); } catch(e) { /* el guard no debería lanzar */ }
    ok('doSetup NO llama createUserWithEmailAndPassword', createCalled === false);
    ok('setupError muestra mensaje de registro cerrado', (els.setupError && /CERRAD/.test(els.setupError.textContent)));
    console.log('PASS='+pass+' FAIL='+fail);
    process.exit(fail ? 1 : 0);
  })();
} else {
  console.log('PASS='+pass+' FAIL='+fail);
  process.exit(1);
}
