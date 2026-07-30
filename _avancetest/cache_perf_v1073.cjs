/* v1073 — LA APP SE CONGELA (Antonio, 30-jul): "apacho un botón y se tarda como 40 segundos".
   MEDIDO EN SU NAVEGADOR (medidor de consola, ventana de 62 s):
     · 17,664 ms de hilo BLOQUEADO en 31 tareas largas (la mayor 5,319 ms)
     · applyRemote: 4,137 ms en UNA pasada · renderAll: 19 ms (pintar NO era el problema)
     · state 4.07 MB → COMPRIMIRLO cuesta 809 ms; escribirlo en disco solo 3 ms
   CAUSA RAÍZ: _cacheWrite comprime el state ENTERO con lz-string de forma SÍNCRONA en cada
   saveState() y en cada applyRemote → 809 ms de congelamiento por guardado.
   El cache local NO es la fuente de verdad (lo dice el comentario de saveState v421): es
   solo arranque rápido y offline. Se puede diferir sin arriesgar datos.
   BUG APARTE encontrado en el camino: las prefs de secciones colapsables (IIFE ~L49097)
   usaban _cacheWrite/_cacheRead → escribían sobre STORAGE_KEY, DESTRUYENDO el cache del
   state cada vez que alguien colapsaba una sección. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. guardar ya no congela: la compresión se difiere —');
const zW = ex('function _cacheWrite(');
const zA = ex('function _cacheWriteAhora(');
ok('existe el escritor real separado (_cacheWriteAhora)', zA.length > 100 && /compressToUTF16/.test(zA));
ok('_cacheWrite ya NO comprime en el acto', !/compressToUTF16/.test(zW) && /setTimeout/.test(zW));
/* sandbox: llamar _cacheWrite NO debe tocar LZString ni localStorage hasta que corra el timer */
let comp = 0, escrito = 0, timers = [], idles = [];
const LZ = { compressToUTF16: s => { comp++; return 'c'; } };
const LS = { setItem: () => { escrito++; }, getItem: () => null };
try {
  /* _cachePend/_cacheTimer viven en el scope del módulo (igual que en la app) */
  const mk = new Function('LZString','localStorage','STORAGE_KEY','setTimeout','clearTimeout','requestIdleCallback','console','CloudSync',
    'var _cachePend = null, _cacheTimer = null;\n' + zA + '\n' + zW + '\n' + ex('function _cacheFlush(') + '\nreturn { w: _cacheWrite, f: _cacheFlush };');
  const api = mk(LZ, LS, 'k', fn => { timers.push(fn); return 1; }, () => {}, fn => { idles.push(fn); }, console, null);
  api.w('{"a":1}');
  ok('llamarlo NO comprime ni escribe (el hilo queda libre)', comp === 0 && escrito === 0);
  api.w('{"a":2}'); api.w('{"a":3}');
  ok('varios guardados seguidos agendan UNA sola compresión', timers.length === 1);
  timers.forEach(fn => fn()); idles.forEach(fn => fn());
  ok('al vencer el plazo sí comprime y escribe', comp === 1 && escrito === 1);
  /* el flush garantiza que nada se pierde al cerrar la app */
  api.w('{"a":4}');
  api.f();
  ok('_cacheFlush escribe YA lo pendiente', comp === 2 && escrito === 2);
  api.f();
  ok('flush sin pendientes no re-escribe (idempotente)', comp === 2 && escrito === 2);
} catch(e){ ['no comprime','una sola','vencido','flush','idempotente'].forEach(n => ok(n + ' [' + e.message + ']', false)); }
ok('se vacía al ocultar/cerrar la app (no se pierde el cache)', /visibilitychange[\s\S]{0,160}_cacheFlush/.test(html) && /pagehide[\s\S]{0,80}_cacheFlush/.test(html));
ok('si el disco está lleno, la nube igual recibe el cambio', /_cacheWriteAhora[\s\S]*?forceUploadNow/.test(html.slice(html.indexOf('function _cacheWriteAhora'), html.indexOf('function _cacheWriteAhora') + 900)));

console.log('\n— 2. las preferencias ya no destruyen el cache del state —');
const iP = html.indexOf('function savePrefs(p){');
const zP = iP > -1 ? html.slice(iP, iP + 200) : '';
ok('savePrefs de secciones NO usa _cacheWrite', iP > -1 && !/_cacheWrite/.test(zP));
const iL = html.indexOf('function loadPrefs(){ try{return JSON.parse(');
ok('loadPrefs de secciones NO usa _cacheRead', iL > -1 && !/_cacheRead/.test(html.slice(iL, iL + 200)));
ok('usan su propia llave', /pr_secciones/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
