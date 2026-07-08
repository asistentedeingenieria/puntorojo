/* v898: auto-limpieza del forense de errores de sync. Cuando un dispositivo que reportó un
   error FATAL (users/{uid}.lastSyncError, v896) vuelve a sincronizar BIEN, el reporte se borra
   solo (FieldValue.delete) — así el comando de diagnóstico muestra únicamente problemas VIVOS,
   no historial. Se limpia UNA sola vez (flag _lastSyncErrorReported), no en cada subida. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractMethod(sig){ let m=html.indexOf(sig); if(m<0) return ''; let i=html.indexOf('{',m+sig.length-1),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const mkFirebase = (cap) => ({
  auth: () => ({ currentUser: { uid: 'u1' } }),
  firestore: { FieldValue: { delete: () => '__DELETE__' } }
});
const mkSaveUserDoc = (cap) => function(uid, data){ cap.push({ uid, data }); return Promise.resolve(); };

// ── 1. _chipDone: al sincronizar bien, limpia el reporte UNA vez ──
const srcDone = extractMethod('_chipDone(){');
ok('_chipDone existe', !!srcDone);
if (srcDone) {
  const mk = (self) => {
    const cap = [];
    const f = new Function('setSyncStatus','saveUserDoc','firebase', 'return function ' + srcDone + ';')(function(){}, mkSaveUserDoc(cap), mkFirebase());
    return { run: () => f.call(self), cap };
  };
  const s1 = { uploadingNow:false, _asistUploading:false, _lastSyncErrorReported:true, _lastSyncError:{code:'permission-denied'}, _retryDelay:5000 };
  const t1 = mk(s1); t1.run();
  ok('reportado + subida OK → borra lastSyncError en users', t1.cap.length===1 && t1.cap[0].uid==='u1' && t1.cap[0].data.lastSyncError==='__DELETE__');
  ok('resetea flag, error local y backoff', s1._lastSyncErrorReported===false && s1._lastSyncError===null && s1._retryDelay===0);
  const t1b = mk(s1); t1b.run();
  ok('segunda subida OK: NO vuelve a escribir users', t1b.cap.length===0);
  const s2 = { uploadingNow:false, _asistUploading:false, _lastSyncErrorReported:false, _lastSyncError:null };
  const t2 = mk(s2); t2.run();
  ok('sin reporte previo: no toca users', t2.cap.length===0);
  const s3 = { uploadingNow:true, _asistUploading:false, _lastSyncErrorReported:true };
  const t3 = mk(s3); t3.run();
  ok('con otra subida en curso: espera (early return)', t3.cap.length===0 && s3._lastSyncErrorReported===true);
}

// ── 2. _chipError: el reporte fatal marca el flag; el reintentable NO reporta ──
const srcErr = extractMethod('_chipError(e){');
ok('_chipError existe', !!srcErr);
if (srcErr) {
  const reint = new Function('return ' + 'function _syncErrReintentable(code){ code=String(code||"").toLowerCase(); return code==="resource-exhausted"||code==="unavailable"; }')();
  const mk = (self) => {
    const cap = [];
    const f = new Function('setSyncStatus','saveUserDoc','firebase','APP_SYNC_VERSION','_syncErrReintentable', 'return function ' + srcErr + ';')(function(){}, mkSaveUserDoc(cap), mkFirebase(), 898, reint);
    return { run: (e) => f.call(self, e), cap };
  };
  const sF = { scheduleSave(){}, scheduleAsistenciaSave(){} };
  const tF = mk(sF); tF.run({ code:'permission-denied', message:'denegado' });
  ok('fatal: reporta y marca el flag para la auto-limpieza', tF.cap.length===1 && sF._lastSyncErrorReported===true && tF.cap[0].data.lastSyncError.code==='permission-denied');
  const sR = { scheduleSave(){}, scheduleAsistenciaSave(){}, _retryTimer:'x' };
  const tR = mk(sR); tR.run({ code:'resource-exhausted', message:'ocupado' });
  ok('reintentable: NO reporta ni marca flag', tR.cap.length===0 && !sR._lastSyncErrorReported);
}

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
