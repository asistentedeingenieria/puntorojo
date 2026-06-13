/* Pruebas de _mergeAsistencia (fusión de asistencia entre dispositivos, v646).
   Corre con: node _asisttest/run.js
   La función aquí DEBE ser idéntica a la de index.html. */

function _mergeAsistencia(localAsis, localTomb, remoteAsis, remoteTomb){
  // Devuelve {asistencia, tomb, changed}. Une marcas de varios dispositivos por (fecha,pid)
  // tomando la de _ts más nuevo; los tombstones (borrados del admin) ganan si su ts >= a la marca.
  var _ts = function(r){ return (r && typeof r._ts === 'number') ? r._ts : ((r && typeof r.ausenteTs === 'number') ? r.ausenteTs : 0); };
  var _score = function(r){ return r ? ((r.presente?2:0)+(r.entrada?1:0)+(r.salida?1:0)+(r.motivo?1:0)) : -1; };
  var out = (remoteAsis && typeof remoteAsis === 'object') ? JSON.parse(JSON.stringify(remoteAsis)) : {};
  var changed = false;
  var L = (localAsis && typeof localAsis === 'object') ? localAsis : {};
  Object.keys(L).forEach(function(f){
    var day = L[f]; if (!day || typeof day !== 'object') return;
    if (!out[f] || typeof out[f] !== 'object') out[f] = {};
    Object.keys(day).forEach(function(pid){
      var lr = day[pid]; if (!lr) return;
      var rr = out[f][pid];
      if (!rr) { out[f][pid] = lr; changed = true; }
      else if (_ts(lr) > _ts(rr)) { out[f][pid] = lr; changed = true; }
      else if (_ts(lr) === _ts(rr) && _score(lr) > _score(rr)) { out[f][pid] = lr; changed = true; }
    });
  });
  var tomb = {};
  if (remoteTomb && typeof remoteTomb === 'object') Object.keys(remoteTomb).forEach(function(k){ tomb[k] = remoteTomb[k]; });
  var LT = (localTomb && typeof localTomb === 'object') ? localTomb : {};
  Object.keys(LT).forEach(function(k){ if (!(k in tomb) || LT[k] > tomb[k]) { tomb[k] = LT[k]; changed = true; } });
  Object.keys(tomb).forEach(function(k){
    var i = k.indexOf('|'); if (i < 0) return;
    var f = k.slice(0, i), pid = k.slice(i+1), tts = tomb[k];
    var rec = out[f] && out[f][pid];
    if (rec && _ts(rec) <= tts) { delete out[f][pid]; changed = true; }
  });
  return { asistencia: out, tomb: tomb, changed: changed };
}

// ── mini framework ──
var PASS=0, FAIL=0;
function eq(a,b){ return JSON.stringify(a)===JSON.stringify(b); }
function ok(name, cond){ if(cond){ PASS++; } else { FAIL++; console.log('FAIL: '+name); } }
var F='2026-06-13';

// 1. Union: dos celulares marcan personas distintas a la vez -> no se pierde ninguna.
(function(){
  var local  = { [F]: { p1:{presente:true,_ts:100}, p2:{presente:true,_ts:101} } }; // celular A
  var remote = { [F]: { p3:{presente:true,_ts:102} } };                              // subió B (sin p1,p2)
  var r=_mergeAsistencia(local, {}, remote, {});
  ok('union conserva p1', !!r.asistencia[F].p1);
  ok('union conserva p2', !!r.asistencia[F].p2);
  ok('union conserva p3', !!r.asistencia[F].p3);
  ok('union marca changed', r.changed===true);
})();

// 2. El caso del bug: A tiene 3 marcas, B sube su copia SIN ellas -> A no las pierde.
(function(){
  var A = { [F]: { p1:{presente:true,_ts:1}, p2:{presente:true,_ts:1}, p3:{presente:true,_ts:1} } };
  var B = { [F]: {} }; // B aún no las recibió
  var r=_mergeAsistencia(A, {}, B, {});
  ok('bug: no se pierde ninguna de las 3', Object.keys(r.asistencia[F]).length===3);
})();

// 3. Tombstone: el admin borra p1 (ts mayor que la marca) -> queda borrada aunque otro la tenga.
(function(){
  var local  = { [F]: { p1:{presente:true,_ts:50} } };           // este celular aún tiene p1
  var remoteTomb = { [F+'|p1']: 80 };                            // otro la borró
  var r=_mergeAsistencia(local, {}, { [F]:{} }, remoteTomb);
  ok('tombstone borra p1', !r.asistencia[F] || !r.asistencia[F].p1);
  ok('tombstone se propaga', r.tomb[F+'|p1']===80);
})();

// 4. Re-marca después de borrar: marca nueva (_ts > tombstone) sobrevive.
(function(){
  var local  = { [F]: { p1:{presente:true,_ts:200} } };          // re-marcada recién
  var tomb   = { [F+'|p1']: 80 };                                // borrado viejo
  var r=_mergeAsistencia(local, tomb, { [F]:{} }, tomb);
  ok('re-marca posterior sobrevive al tombstone viejo', !!r.asistencia[F].p1);
})();

// 5. Tombstone más viejo que la marca remota -> la marca sobrevive.
(function(){
  var remote = { [F]: { p1:{presente:true,_ts:300} } };
  var tomb   = { [F+'|p1']: 100 };
  var r=_mergeAsistencia({}, tomb, remote, {});
  ok('marca más nueva que tombstone sobrevive', !!r.asistencia[F].p1);
})();

// 6. Idempotente: local === remote -> changed=false (no provoca resync infinito).
(function(){
  var s = { [F]: { p1:{presente:true,entrada:'07:00',_ts:10} } };
  var r=_mergeAsistencia(JSON.parse(JSON.stringify(s)), {}, JSON.parse(JSON.stringify(s)), {});
  ok('idempotente: changed=false', r.changed===false);
  ok('idempotente: conserva p1', !!r.asistencia[F].p1);
})();

// 7. Marca más nueva gana (salida actualiza la entrada previa).
(function(){
  var local  = { [F]: { p1:{presente:true,entrada:'07:00',salida:'17:00',_ts:500} } };
  var remote = { [F]: { p1:{presente:true,entrada:'07:00',_ts:400} } };
  var r=_mergeAsistencia(local, {}, remote, {});
  ok('marca más nueva (con salida) gana', r.asistencia[F].p1.salida==='17:00');
})();

// 8. Marcas legacy sin _ts: se unen sin perderse (ts=0 ambos, score decide / conserva).
(function(){
  var A = { [F]: { p1:{presente:true} } };  // legacy A
  var B = { [F]: { p2:{presente:true} } };  // legacy B
  var r=_mergeAsistencia(A, {}, B, {});
  ok('legacy: une p1 y p2', !!r.asistencia[F].p1 && !!r.asistencia[F].p2);
})();

// 9. Ausente (presente:false con ausenteTs) cuenta como _ts para ganar a un presente viejo.
(function(){
  var local  = { [F]: { p1:{presente:false,motivo:'X',ausenteTs:900} } }; // marcado ausente recién
  var remote = { [F]: { p1:{presente:true,_ts:100} } };                   // presente viejo
  var r=_mergeAsistencia(local, {}, remote, {});
  ok('ausente reciente gana al presente viejo', r.asistencia[F].p1.presente===false);
})();

// 10. No resucita: si la marca local ya no existe y hay tombstone, no reaparece.
(function(){
  var r=_mergeAsistencia({ [F]:{} }, { [F+'|p1']:80 }, { [F]:{} }, {});
  ok('no resucita marca borrada', !r.asistencia[F] || !r.asistencia[F].p1);
})();

console.log('PASS='+PASS+' FAIL='+FAIL);
process.exit(FAIL?1:0);
