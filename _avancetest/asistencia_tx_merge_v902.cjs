/* v902 (incidente 09-jul: "marqué en la mañana y más tarde aparece desmarcada"):
   desde v896 la subida escribía la FOTO COMPLETA del día — dos teléfonos marcando a la
   vez, el último pisaba en la nube las marcas del primero (se curaban solo cuando el
   pisado volvía a sincronizar → la ventana que veía el encargado). Fix:
   (1) _asistUploadSmart TRANSACCIONAL: lee la nube, UNE local∪nube con _mergeAsistencia
       (regla v647: gana _ts más nuevo, sesiones se unen, "imposible perder una marca") y
       escribe SOLO los días que difieren de lo recién leído. Contención → el SDK reintenta
       con lectura fresca → unión de nuevo → sin pérdida en NINGÚN orden de subidas.
   (2) _chipDone limpia users/{uid}.lastSyncError también UNA vez por sesión (los errores
       del 06-jul quedaron pegados porque v898 solo limpiaba errores de la misma sesión). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
function extractMethod(sig){ let m=html.indexOf(sig); if(m<0) return ''; let i=html.indexOf('{',m+sig.length-1),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const diffFn = (function(){ const s=extractFn('_asistDiffDays'); return s? new Function(s+'\nreturn _asistDiffDays;')() : null; })();
const mergeFn = (function(){ const s=extractFn('_mergeAsistencia'); return s? new Function(s+'\nreturn _mergeAsistencia;')() : null; })();
ok('deps extraídas (_asistDiffDays + _mergeAsistencia)', !!(diffFn && mergeFn));

const srcSmart = extractMethod('async _asistUploadSmart(db, stamp)');
ok('_asistUploadSmart existe', !!srcSmart);
if (srcSmart && diffFn && mergeFn) {
  const fnSrc = 'return (async function' + srcSmart.slice(srcSmart.indexOf('(')) + ');';
  const FieldPath = function(){ this.seg = [].slice.call(arguments); };
  const fb = { firestore: { FieldPath: FieldPath, FieldValue: { delete: function(){ return '__DELETE__'; } } } };
  const mk = function(localPayload, cloudPayload, thisProps){
    const cap = { update:null, set:null, txCorrio:false };
    const ref = { _esRef: true };
    const snap = { exists: cloudPayload !== null, data: function(){ return { asistencia: cloudPayload||{} }; } };
    const tx = {
      get: async function(){ return snap; },
      update: function(){ cap.update = [].slice.call(arguments); },
      set: function(r, d){ cap.set = d; }
    };
    const db = { collection: function(){ return { doc: function(){ return ref; } }; },
                 runTransaction: async function(fn){ cap.txCorrio = true; return fn(tx); } };
    const st = { asistenciaGlobal: localPayload };
    const f = new Function('state','firebase','_asistDiffDays','_mergeAsistencia','_getAsistTomb','showToast','console', fnSrc)(
      st, fb, diffFn, mergeFn, function(){ return {}; }, function(){}, console);
    const self = Object.assign({ _asistHash:'', _asistDayHashes:null, _asistSizeWarned:false }, thisProps||{});
    return { run: function(){ return f.call(self, db, { ts:1, by:'t', ver:902 }); }, cap: cap, self: self };
  };
  const F = '2026-07-09';
  const markA = { presente:true, _ts:100, entrada:'06:30' };
  const markB = { presente:true, _ts:200, entrada:'06:31' };

  // a) LA CARRERA DEL INCIDENTE: la nube tiene la marca de A; mi copia vieja NO la tiene
  //    pero trae la de B → la escritura debe llevar LA UNIÓN {A,B}, nunca pisar a A.
  const A = mk({ [F]: { pB: markB } }, { [F]: { pA: markA } });
  const B = mk({ [F]: { pA: markA, pB: markB } }, { [F]: { pA: markA, pB: markB } });
  const C = mk({ [F]: { pB: markB } }, null);
  const D = mk({ [F]: { pB: markB } }, { [F]: { pA: markA } }, {});
  Promise.resolve()
    .then(function(){ return A.run(); })
    .then(function(){
      ok('a: corre en transacción', A.cap.txCorrio === true);
      const dia = A.cap.update ? A.cap.update.filter(function(x,i){ return A.cap.update[i-1] && A.cap.update[i-1].seg && A.cap.update[i-1].seg[1]===F; })[0] : null;
      ok('a: escribe la UNIÓN (la marca de A sobrevive)', !!dia && !!dia.pA && !!dia.pB);
      ok('a: no hizo set destructivo', !A.cap.set);
      // b) la nube ya tiene todo → NO escribe nada (idempotente, sin bucles)
      return B.run();
    })
    .then(function(){
      ok('b: nube al día → cero escrituras', B.cap.txCorrio === true && !B.cap.update && !B.cap.set);
      // c) doc no existe → set completo
      return C.run();
    })
    .then(function(){
      ok('c: primer doc → set completo', !!C.cap.set && JSON.stringify(C.cap.set.asistencia[F].pB) === JSON.stringify(markB));
      // d) hash igual → ni transacción
      D.self._asistHash = JSON.stringify({ [F]: { pB: markB } });
      return D.run();
    })
    .then(function(){
      ok('d: sin cambios locales → ni transacción', D.cap.txCorrio === false);
      fin();
    })
    .catch(function(e){ fail++; console.log('FAIL excepción en smart: '+(e && e.message || e)); fin(); });
} else { fin(); }

function fin(){
  // ── limpieza de errores viejos (v898 solo cubría la misma sesión) ──
  ok('_chipDone purga una vez por sesión', /_lastSyncErrorPurgado/.test(html));
  // ── cableado ──
  ok('la subida usa runTransaction', /_asistUploadSmart[\s\S]{0,2500}runTransaction/.test(html));
  ok('une con la regla v647', /_mergeAsistencia\(_asistPayload, cloud/.test(html));
  ok('APP_SYNC_VERSION subida a 902', /const APP_SYNC_VERSION = 902;/.test(html));
  console.log('PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail ? 1 : 0);
}
