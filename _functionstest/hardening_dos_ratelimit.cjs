/* Hardening backend batch 2:
   C1: onNotifyByPerm acota toPerms (≤5, sin '*') y toEmails (≤50) y hace fan-out con concurrencia
       limitada (no un Promise.all de N writes de golpe).
   A4: onAiQuestion limita preguntas por uid (transacción sobre aiRateLimit/{uid}). */
const fs = require('fs'), path = require('path');
const js = fs.readFileSync(path.join(__dirname, '..', 'functions', 'index.js'), 'utf8');
function extractAt(startIdx){ let i=js.indexOf('{',startIdx),d=0; for(;i<js.length;i++){ if(js[i]==='{')d++; else if(js[i]==='}'){ d--; if(d===0) return js.slice(startIdx,i+1); } } return ''; }
function extractFn(name){ const m=js.indexOf('function '+name+'('); return m<0?'':extractAt(m); }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// C1 — helper puro _sanitizeNotifyTargets
const src = extractFn('_sanitizeNotifyTargets');
ok('_sanitizeNotifyTargets existe', !!src);
if (src) {
  const fn = new Function(src + '\nreturn _sanitizeNotifyTargets;')();
  ok('cap toPerms a 5', fn({ toPerms: ['a','b','c','d','e','f','g'] }).toPerms.length === 5);
  ok('elimina "*" de toPerms', fn({ toPerms: ['*','users.manage'] }).toPerms.indexOf('*') < 0);
  ok('conserva perms válidos', fn({ toPerms: ['users.manage'] }).toPerms.indexOf('users.manage') >= 0);
  ok('descarta no-strings', fn({ toPerms: [1, {}, 'x.y'] }).toPerms.join(',') === 'x.y');
  ok('cap toEmails a 50', fn({ toEmails: Array.from({length:80}, (_,i)=>'u'+i+'@x.com') }).toEmails.length === 50);
  ok('emails a minúscula', fn({ toEmails: ['AB@X.COM'] }).toEmails[0] === 'ab@x.com');
  ok('arrays ausentes → vacíos', fn({}).toPerms.length === 0 && fn({}).toEmails.length === 0);
}

// C1 — onNotifyByPerm usa el helper y fan-out por lotes (concurrencia acotada)
ok('onNotifyByPerm llama _sanitizeNotifyTargets', /_sanitizeNotifyTargets\s*\(/.test(js));
ok('fan-out con concurrencia acotada (no Promise.all de todos)', /for\s*\(\s*let\s+i\s*=\s*0;[\s\S]{0,80}i\s*\+=\s*\d+/.test(js) && /slice\(i,\s*i\s*\+/.test(js));

// A4 — rate limit por uid en onAiQuestion
ok('A4: colección aiRateLimit', js.indexOf('aiRateLimit') >= 0);
ok('A4: usa transacción', js.indexOf('runTransaction') >= 0);
ok('A4: mensaje de tope', /Demasiadas preguntas/.test(js));
ok('A4: getFirestore en onAiQuestion', /onAiQuestion[\s\S]{0,2000}getFirestore\(\)/.test(js));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
