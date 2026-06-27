/* v857 #1: cortacircuitos anti-bucle de re-sync.
   _evalResyncBreaker(prevEntries, now, fp): detecta un BUCLE = el MISMO estado (fingerprint fp) se
   re-sube K+ veces en una ventana. Cambios REALES distintos (cada uno con fp distinto) NUNCA
   disparan, aunque vengan muy seguido (mañana ocupada con 30 marcando). _resyncFingerprint(merged)
   es determinista: mismo estado → mismo fp. Blinda contra cualquier merge no idempotente futuro. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const src = extractFn('_evalResyncBreaker');
ok('_evalResyncBreaker existe', !!src);
if (src) {
  const fn = new Function(src + '\nreturn _evalResyncBreaker;')();

  // 1) un re-sync aislado NO dispara.
  var r1 = fn([], 1000, 'A');
  ok('uno solo no dispara', r1.tripped === false && r1.entries.length === 1 && r1.blockedUntil === 0);

  // 2) BUCLE: el mismo estado (fp) re-subiéndose (cada 10s) → dispara.
  var e = [], now = 0, last = null;
  for (var i = 0; i < 5; i++) { last = fn(e, now, 'LOOP'); e = last.entries; now += 10000; }
  ok('mismo estado 5x en 90s (bucle) → dispara', last.tripped === true);
  ok('al disparar: cooldown + reset', last.blockedUntil === (now - 10000) + 60000 && last.entries.length === 0);

  // 3) cambios REALES distintos (fp distinto), aunque RÁPIDOS → NUNCA dispara (no false-trip).
  var e2 = [], trippedEver = false;
  for (var j = 0; j < 30; j++) { var r = fn(e2, j * 500, 'change' + j); e2 = r.entries; if (r.tripped) trippedEver = true; }
  ok('30 cambios reales distintos y rápidos NO disparan', trippedEver === false);

  // 4) mismo estado pero ESPACIADO > ventana → no acumula → no dispara.
  var e3 = [], trip2 = false;
  for (var k = 0; k < 10; k++) { var r3 = fn(e3, k * 100000, 'SAME'); e3 = r3.entries; if (r3.tripped) trip2 = true; }
  ok('mismo estado espaciado fuera de ventana NO dispara', trip2 === false);
}

// _resyncFingerprint determinista.
const fpSrc = extractFn('_resyncFingerprint');
ok('_resyncFingerprint existe', !!fpSrc);
if (fpSrc) {
  const fp = new Function(fpSrc + '\nreturn _resyncFingerprint;')();
  const a = { personalGlobal:[{id:'p1'}], polizasGlobales:[{id:'x'}], projects:[{id:'A'}] };
  const b = JSON.parse(JSON.stringify(a));
  const c = { personalGlobal:[{id:'p1'},{id:'p2'}], polizasGlobales:[{id:'x'}], projects:[{id:'A'}] };
  ok('mismo estado → mismo fp', fp(a) === fp(b));
  ok('estado distinto → fp distinto', fp(a) !== fp(c));
}

// Estructural: applyRemote usa el breaker antes de re-subir.
ok('applyRemote llama _evalResyncBreaker', /_evalResyncBreaker\s*\(\s*this\._resyncTimes/.test(html));
ok('breaker gatea el re-sync con _circuitOpen', html.indexOf('if (!_circuitOpen)') >= 0 && /_resyncBlockedUntil/.test(html));
ok('loguea la causa del bucle', html.indexOf('[CIRCUIT-BREAKER]') >= 0);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
