/* Pruebas de _mergeAsistencia (fusión de asistencia entre dispositivos, v647: UNIÓN pura).
   Corre con: node _asisttest/run.js
   La función aquí DEBE ser idéntica (código) a la de index.html.

   v647: se QUITARON los tombstones. La revisión adversarial demostró que borrar por merge
   (tombstone con ts) provocaba pérdida de marcas por desfase de reloj entre celulares y por
   marcas legacy sin _ts. La unión pura nunca borra una marca presente; "quitar una ausencia"
   no se propaga (se corrige marcando el estado correcto, que gana por _ts más nuevo). */

function _mergeAsistencia(localAsis, remoteAsis){
  var _ts = function(r){ return (r && typeof r._ts === 'number') ? r._ts : ((r && typeof r.ausenteTs === 'number') ? r.ausenteTs : 0); };
  var _score = function(r){ if(!r) return -1; if(r.presente===false && r.motivo) return 3; return (r.presente?2:0)+(r.entrada?1:0)+(r.salida?1:0)+(r.motivo?1:0); };
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
  return { asistencia: out, changed: changed };
}

// ── mini framework ──
var PASS=0, FAIL=0;
function ok(name, cond){ if(cond){ PASS++; } else { FAIL++; console.log('FAIL: '+name); } }
var F='2026-06-13';

// 1. Unión: dos celulares marcan personas distintas a la vez -> no se pierde ninguna.
(function(){
  var local  = { [F]: { p1:{presente:true,_ts:100}, p2:{presente:true,_ts:101} } };
  var remote = { [F]: { p3:{presente:true,_ts:102} } };
  var r=_mergeAsistencia(local, remote);
  ok('union conserva p1', !!r.asistencia[F].p1);
  ok('union conserva p2', !!r.asistencia[F].p2);
  ok('union conserva p3', !!r.asistencia[F].p3);
  ok('union marca changed', r.changed===true);
})();

// 2. El caso del bug: A tiene 3 marcas, B sube su copia SIN ellas -> A no las pierde.
(function(){
  var A = { [F]: { p1:{presente:true,_ts:1}, p2:{presente:true,_ts:1}, p3:{presente:true,_ts:1} } };
  var B = { [F]: {} };
  var r=_mergeAsistencia(A, B);
  ok('bug: no se pierde ninguna de las 3', Object.keys(r.asistencia[F]).length===3);
})();

// 3. Marca más nueva gana (salida actualiza la entrada previa).
(function(){
  var local  = { [F]: { p1:{presente:true,entrada:'07:00',salida:'17:00',_ts:500} } };
  var remote = { [F]: { p1:{presente:true,entrada:'07:00',_ts:400} } };
  var r=_mergeAsistencia(local, remote);
  ok('marca más nueva (con salida) gana', r.asistencia[F].p1.salida==='17:00');
})();

// 4. Marcas legacy sin _ts: se unen sin perderse (NUNCA se borran por merge).
(function(){
  var A = { [F]: { p1:{presente:true} } };
  var B = { [F]: { p2:{presente:true} } };
  var r=_mergeAsistencia(A, B);
  ok('legacy: une p1 y p2', !!r.asistencia[F].p1 && !!r.asistencia[F].p2);
})();

// 5. Idempotente: local === remote -> changed=false (no provoca resync infinito).
(function(){
  var s = { [F]: { p1:{presente:true,entrada:'07:00',_ts:10} } };
  var r=_mergeAsistencia(JSON.parse(JSON.stringify(s)), JSON.parse(JSON.stringify(s)));
  ok('idempotente: changed=false', r.changed===false);
  ok('idempotente: conserva p1', !!r.asistencia[F].p1);
})();

// 6. Ausente reciente (más _ts) gana a un presente viejo.
(function(){
  var local  = { [F]: { p1:{presente:false,motivo:'X',ausenteTs:900,_ts:900} } };
  var remote = { [F]: { p1:{presente:true,_ts:100} } };
  var r=_mergeAsistencia(local, remote);
  ok('ausente reciente gana al presente viejo', r.asistencia[F].p1.presente===false);
})();

// 7. REGRESIÓN (hallazgo #3): empate de _ts -> la ausencia con motivo NO se descarta por un presente pelado.
(function(){
  var ausente = { [F]: { p1:{presente:false,motivo:'PERMISO',ausenteTs:777,_ts:777} } };
  var presente= { [F]: { p1:{presente:true,_ts:777} } };
  var a=_mergeAsistencia(ausente, presente);   // local ausente vs remote presente
  var b=_mergeAsistencia(presente, ausente);   // orden inverso
  ok('empate: ausencia con motivo gana (orden A)', a.asistencia[F].p1.presente===false);
  ok('empate: ausencia con motivo gana (orden B)', b.asistencia[F].p1.presente===false);
})();

// 8. REGRESIÓN (hallazgos #1/#2): sin tombstones, NINGUNA marca desaparece por merge,
//    ni siquiera una re-marca con _ts bajo o una marca legacy sin _ts.
(function(){
  var remarcaBaja = { [F]: { p1:{presente:true,_ts:5} } };     // re-marca con _ts bajo (reloj atrasado)
  var r1=_mergeAsistencia(remarcaBaja, { [F]:{} });
  ok('re-marca con _ts bajo sobrevive', !!r1.asistencia[F].p1);
  var legacy = { [F]: { p2:{presente:true} } };                 // marca v645 sin _ts
  var r2=_mergeAsistencia(legacy, { [F]:{} });
  ok('marca legacy sin _ts sobrevive', !!r2.asistencia[F].p2);
})();

// 9. Una marca presente NUNCA desaparece aunque el remoto no la tenga (no hay borrado por merge).
(function(){
  var local  = { [F]: { p1:{presente:true,entrada:'07:30',_ts:50} } };
  var remote = { [F]: {} };
  var r=_mergeAsistencia(local, remote);
  ok('presente local se conserva contra remoto vacío', !!r.asistencia[F].p1 && r.changed===true);
})();

// 10. Transición v649: _assembleFromSnap une la asistencia del CORE viejo + el doc nuevo
//     appState/asistencia, sin perder ninguna (la misma UNIÓN).
(function(){
  var core = { [F]: { p1:{presente:true,_ts:100} } };  // lo que aún trae el core viejo (v648)
  var doc  = { [F]: { p2:{presente:true,_ts:200} } };  // lo que trae appState/asistencia (v649)
  var r=_mergeAsistencia(core, doc);
  ok('transición v649: une core+doc (p1)', !!r.asistencia[F].p1);
  ok('transición v649: une core+doc (p2)', !!r.asistencia[F].p2);
})();

console.log('PASS='+PASS+' FAIL='+FAIL);
process.exit(FAIL?1:0);
