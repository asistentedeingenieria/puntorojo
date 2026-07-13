/* v896 (incidente 06-jul: resource-exhausted en hora pico de marcado):
   (1) _asistDiffDays: diff PURO por día de la asistencia contra el último estado de la nube.
   (2) _asistUploadSmart: cada marca sube SOLO los días que cambiaron (update de campos ~15 KB)
       en vez del doc completo (~360 KB); set completo si no hay baseline, >8 días cambiados,
       o el update parcial falla (red de seguridad).
   (3) _syncErrReintentable + chip honesto: la nube ocupada → "REINTENTANDO..." con backoff;
       solo errores fatales (permisos/datos) → ERROR DE SYNC + reporte a users/{uid}.lastSyncError. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
function extractMethod(sig){ let m=html.indexOf(sig); if(m<0) return ''; let i=html.indexOf('{',m+sig.length-1),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. diff por día (puro) ──
const srcDiff = extractFn('_asistDiffDays');
ok('_asistDiffDays existe', !!srcDiff);
let diffFn = null;
if (srcDiff) {
  diffFn = new Function(srcDiff + '\nreturn _asistDiffDays;')();
  const pay = { '2026-07-05': {a:1}, '2026-07-06': {b:2} };
  const r1 = diffFn(null, pay);
  ok('sin baseline: todos los días son cambio', r1.changed.length===2 && r1.removed.length===0);
  const base = { '2026-07-05': JSON.stringify({a:1}), '2026-07-06': JSON.stringify({b:2}) };
  const r2 = diffFn(base, pay);
  ok('baseline igual: cero cambios', r2.changed.length===0 && r2.removed.length===0);
  const r3 = diffFn(base, { '2026-07-05': {a:1}, '2026-07-06': {b:99} });
  ok('un día modificado: solo ese viaja', JSON.stringify(r3.changed)===JSON.stringify(['2026-07-06']));
  const r4 = diffFn(base, { '2026-07-05': {a:1} });
  ok('día quitado: se detecta como removed', JSON.stringify(r4.removed)===JSON.stringify(['2026-07-06']));
}

// ── 2. clasificación de errores ──
const srcErr = extractFn('_syncErrReintentable');
ok('_syncErrReintentable existe', !!srcErr);
if (srcErr) {
  const f = new Function(srcErr + '\nreturn _syncErrReintentable;')();
  ok('resource-exhausted es reintentable', f('resource-exhausted')===true);
  ok('unavailable es reintentable', f('unavailable')===true);
  ok('permission-denied es FATAL', f('permission-denied')===false);
  ok('invalid-argument es FATAL', f('invalid-argument')===false);
  ok('sin código es FATAL (bug propio debe verse)', f('')===false && f(undefined)===false);
}

// ── 3. _asistUploadSmart — v902 la volvió TRANSACCIONAL (lee la nube y UNE en vez de
//      reemplazar el día); la cobertura funcional del flujo de subida vive ahora en
//      asistencia_tx_merge_v902.cjs. Acá solo se valida que el diff por día sigue vivo.
const srcSmart = extractMethod('async _asistUploadSmart(db, stamp)');
ok('_asistUploadSmart existe', !!srcSmart);
ok('la ruta es transaccional (v902)', /runTransaction/.test(srcSmart));
ok('el diff por día sigue en la ruta', /_asistDiffDays\(/.test(srcSmart));
fin();

// ── 4. cableado ──
function fin(){
  ok('uploadAsistencia usa la ruta smart', /async uploadAsistencia\(\)\{[\s\S]{0,900}_asistUploadSmart\(db, stamp\)/.test(html));
  ok('uploadCurrent usa la ruta smart', (html.match(/this\._asistUploadSmart\(db, stamp\)/g)||[]).length >= 2);
  ok('applyRemote siembra _asistDayHashes', /_asistDayHashes = _dh/.test(html) || /this\._asistDayHashes\s*=\s*\{\}/.test(html) && /_asistDocOnly[\s\S]{0,400}_asistDayHashes/.test(html));
  ok('los 3 catch pasan el error al chip', (html.match(/this\._chipError\(e\)/g)||[]).length >= 3);
  ok('chip REINTENTANDO para errores reintentables', html.indexOf("setSyncStatus('syncing', 'REINTENTANDO...')")>=0);
  ok('reporte forense del error fatal', /saveUserDoc\(u\.uid, \{ lastSyncError: this\._lastSyncError \}\)/.test(html));
  // v897: la constante SUBE con cada cambio de sync (diseño) — validar >= 896, no el literal
  const _asv896 = (html.match(/const APP_SYNC_VERSION = (\d+);/)||[])[1];
  ok('APP_SYNC_VERSION >= 896', Number(_asv896) >= 896);
  console.log('PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail ? 1 : 0);
}
