/* v851: re-activar App Check en MODO MONITOR (Firestore+Storage en "Supervisión"/unenforced en la
   consola → no bloquea). El código ya tenía todo escrito con un `return;` que lo apagaba (v468).
   Este test verifica que _initAppCheck YA llega a activate() (sin el return temprano), conservando
   el kill-switch PR_DISABLE_APPCHECK y el provider reCAPTCHA v3. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractAt(startIdx){ let i=html.indexOf('{',startIdx),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(startIdx,i+1); } } return ''; }
function extractFn(name){ const m=html.indexOf('function '+name+'('); return m<0?'':extractAt(m); }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const src = extractFn('_initAppCheck');
ok('_initAppCheck existe', !!src);

// Estructural: conserva kill-switch y provider; ya NO tiene el return-temprano de apagado.
ok('conserva kill-switch PR_DISABLE_APPCHECK', src.indexOf('PR_DISABLE_APPCHECK') >= 0);
ok('conserva ReCaptchaV3Provider', src.indexOf('ReCaptchaV3Provider') >= 0);

// Funcional: con stubs, _initAppCheck debe LLAMAR a activate (en NO-OP no lo hacía por el return).
if (src) {
  let activateCalled = false, providerKey = null;
  const win = {};
  function ReCaptchaV3Provider(key){ providerKey = key; }
  const appCheckFn = function(){ return { activate: function(provider, autoRefresh){ activateCalled = true; } }; };
  appCheckFn.ReCaptchaV3Provider = ReCaptchaV3Provider;
  const firebaseStub = { appCheck: appCheckFn };
  const docStub = { body: {}, addEventListener: function(){} };
  const lsStub = { getItem: function(){ return null; } };
  const consoleStub = { log: function(){}, warn: function(){} };
  const fn = new Function('window','firebase','document','localStorage','RECAPTCHA_V3_SITE_KEY','console',
                          src + '\nreturn _initAppCheck;')(win, firebaseStub, docStub, lsStub, '6Ltest_sitekey', consoleStub);
  fn();
  ok('_initAppCheck LLAMA a appCheck().activate()', activateCalled === true);
  ok('usa el site key configurado', providerKey === '6Ltest_sitekey');
  ok('marca __pr_appCheckActivated', win.__pr_appCheckActivated === true);
}

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail ? 1 : 0);
