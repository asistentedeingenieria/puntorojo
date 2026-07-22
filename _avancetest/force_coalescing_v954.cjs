/* v954 (reporte de Antonio tras v953: "cuando subo cosas se tarda DEMASIADO"): el
   blindaje v953 puso forceUploadNow en cada acción de dinero de COBRO, pero
   forceUploadNow NO amortiguaba: cada llamada arrancaba SU PROPIA subida completa.
   Una ráfaga (marcar 3 pagados, editar fechas) = N subidas encadenadas del doc de
   proyecto y el chip SINCRONIZANDO prendido eterno.
   FIX: COALESCING — si hay subida en vuelo, se agenda UNA sola de cola (captura todos
   los cambios hechos mientras tanto) y todos los llamadores comparten esa promesa.
   Máximo: 1 en vuelo + 1 en cola. El hash-skip v665 hace barata la de cola. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFrom(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const src = extractFrom('async forceUploadNow()');
ok('forceUploadNow tiene guard de subida en vuelo', /_forceInFlight/.test(src));
ok('forceUploadNow agenda UNA sola subida de cola', /_forceQueued/.test(src));

// ── comportamiento: 5 llamadas concurrentes => máximo 2 subidas reales ──
(async () => {
  let subidas = 0;
  const fake = {
    enabled: true, ref: {}, pendingWrite: null, uploadingNow: false,
    _forceInFlight: null, _forceQueued: null,
    _armSyncingChip(){}, _chipDone(){}, _chipError(){},
    uploadCurrent(){ subidas++; return new Promise(res => setTimeout(res, 30)); }
  };
  let fn = null;
  try { fn = new Function('return (async function ' + src.replace(/^async forceUploadNow\(\)/, 'forceUploadNow()') + ')')(); } catch(e){}
  ok('forceUploadNow evaluable', typeof fn === 'function');
  if (typeof fn === 'function') {
    fake.forceUploadNow = fn.bind(fake);
    await Promise.all([fake.forceUploadNow(), fake.forceUploadNow(), fake.forceUploadNow(), fake.forceUploadNow(), fake.forceUploadNow()]);
    ok('5 llamadas concurrentes => máximo 2 subidas reales (1 en vuelo + 1 de cola)', subidas <= 2 && subidas >= 1);
    ok('al terminar no queda nada colgado', !fake._forceInFlight && !fake._forceQueued && fake.uploadingNow === false);
    // una llamada suelta después vuelve a subir normal
    await fake.forceUploadNow();
    ok('una llamada posterior sube normal', subidas >= 2);
  }
  console.log('PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail ? 1 : 0);
})();
