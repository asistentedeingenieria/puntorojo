/* Hardening backend (functions/index.js) — batch 1:
   M1: escapar TODOS los campos de usuario en los emails de excepción (no solo razon) + tope de
       longitud server-side de razon/notaDecision.
   M2: onAiQuestion NO filtra diagnóstico (_diag/e.message) al cliente.
   M3: getReceptorAcuses NO devuelve e.message crudo en el 500. */
const fs = require('fs'), path = require('path');
const js = fs.readFileSync(path.join(__dirname, '..', 'functions', 'index.js'), 'utf8');
function extractAt(startIdx){ let i=js.indexOf('{',startIdx),d=0; for(;i<js.length;i++){ if(js[i]==='{')d++; else if(js[i]==='}'){ d--; if(d===0) return js.slice(startIdx,i+1); } } return ''; }
function extractFn(name){ const m=js.indexOf('function '+name+'('); return m<0?'':extractAt(m); }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// M1 — helper escHtml existe y escapa todo
const src = extractFn('escHtml');
ok('escHtml existe', !!src);
if (src) {
  const esc = new Function(src + '\nreturn escHtml;')();
  ok('escapa <', esc('<img>').indexOf('<') < 0);
  ok('escapa >', esc('a>b').indexOf('>') < 0);
  ok('escapa "', esc('a"b').indexOf('"') < 0);
  ok('escapa &', esc('a&b').indexOf('&b') < 0);
  ok("escapa '", esc("a'b").indexOf("'") < 0);
  ok('null/undefined → vacío', esc(null) === '' && esc(undefined) === '');
}

// M1 — los campos de usuario en los emails pasan por escHtml
ok('razon escapada con escHtml', js.indexOf('escHtml(razon)') >= 0);
ok('obrero escapado', js.indexOf('escHtml(exc.obrero') >= 0);
ok('supervisorNombre escapado', js.indexOf('escHtml(exc.supervisorNombre') >= 0 || js.indexOf('escHtml(exc.supervisorEmail') >= 0);
ok('notaDecision escapada', js.indexOf('escHtml(nota)') >= 0);
ok('decididoPorNombre escapado', js.indexOf('escHtml(after.decididoPorNombre') >= 0);
ok('aptoNombre escapado (decisión)', js.indexOf('escHtml(after.aptoNombre') >= 0);
// ya no quedan los .replace(/</g,'&lt;') parciales
ok('sin replace parcial de razon', js.indexOf("(exc.razon || '').replace(/</g") < 0);
ok('sin replace parcial de notaDecision', js.indexOf("after.notaDecision.replace(/</g") < 0);

// M1 — tope de longitud server-side (razon y notaDecision normalizadas a const con .slice)
ok('razon con tope de longitud', /razon\s*=\s*String\(exc\.razon[\s\S]{0,40}\.slice\(0,\s*\d{3,4}\)/.test(js));
ok('notaDecision con tope de longitud', /nota\s*=\s*String\(after\.notaDecision[\s\S]{0,40}\.slice\(0,\s*\d{3,4}\)/.test(js));

// M2 — onAiQuestion no filtra _diag al cliente
ok('M2: sin _diag en la respuesta de IA', js.indexOf('_diag') < 0);
ok('M2: error de IA genérico', js.indexOf("'No pude responder ahora, probá de nuevo.'") >= 0 && js.indexOf("'No pude responder ahora, probá de nuevo.' +") < 0);

// M3 — getReceptorAcuses 500 genérico (sin e.message)
ok('M3: 500 sin e.message', js.indexOf("'Error interno: ' + (e.message") < 0);
ok('M3: 500 con error genérico', /status\(500\)[\s\S]{0,120}Error interno del servidor/.test(js));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
