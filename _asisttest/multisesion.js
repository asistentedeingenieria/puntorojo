/* Pruebas de la lógica de MULTI-SESIÓN de asistencia (v653).
   node _asisttest/multisesion.js
   Las funciones aquí DEBEN ser idénticas (código) a las de index.html. */

// ── funciones bajo prueba (idénticas a index.html) ──
function _asistResumenSesiones(sessions){
  var ss=(sessions||[]).slice().sort(function(x,y){return String(x.entrada||'').localeCompare(String(y.entrada||''));});
  var open=null,last=null,first=null,maxTs=0;
  ss.forEach(function(s){ if(!s) return; if(!first) first=s; last=s; if(s.entrada && !s.salida) open=s; var t=(typeof s._ts==='number')?s._ts:0; if(t>maxTs) maxTs=t; });
  var cur=open||last;
  return { presente: ss.length>0, entrada: first?(first.entrada||''):'', salida: open?'':(last?(last.salida||''):''), obraId: cur?(cur.obraId||''):'', obraDesc: cur?(cur.obraDesc||''):'', geoEntrada: cur?(cur.geoEntrada||null):null, geoSalida: cur?(cur.geoSalida||null):null, _ts: maxTs };
}
function _asistSesionAbierta(rec){
  var s=(rec && Array.isArray(rec.sessions))?rec.sessions:[];
  for(var i=s.length-1;i>=0;i--){ if(s[i] && s[i].entrada && !s[i].salida) return true; }
  return false;
}
function computeAsistenciaMarkMulti(rec, hhmm, obraId, obraDesc, nowTs, geo){
  var sessions=(rec && Array.isArray(rec.sessions))?rec.sessions.slice():[];
  var openIdx=-1;
  for(var i=sessions.length-1;i>=0;i--){ if(sessions[i] && sessions[i].entrada && !sessions[i].salida){ openIdx=i; break; } }
  var accion, obra;
  if(openIdx>=0){ sessions[openIdx]=Object.assign({},sessions[openIdx],{salida:hhmm,geoSalida:(geo||null),_ts:nowTs}); accion='salida'; obra=sessions[openIdx].obraId||''; }
  else { sessions.push({obraId:obraId||'',obraDesc:obraDesc||'',entrada:hhmm,salida:null,geoEntrada:(geo||null),geoSalida:null,_ts:nowTs}); accion='entrada'; obra=obraId||''; }
  var resumen=_asistResumenSesiones(sessions);
  var reg=Object.assign({},resumen,{multiSesion:true,sessions:sessions,via:'cara'});
  return { reg:reg, accion:accion, obraId:obra };
}
function _mergeSesiones(a,b){
  var byKey={};
  // v653b: una sesión CERRADA siempre vence a la ABIERTA en la misma clave (tiene más información),
  // sin importar el _ts — así un desfase de reloj entre celulares no revierte una salida ya marcada.
  var add=function(s){ if(!s||!s.entrada) return; var k=String(s.obraId||'')+'|'+String(s.entrada||''); var prev=byKey[k]; var st=(typeof s._ts==='number')?s._ts:0; if(!prev){ byKey[k]=s; return; } var pt=(typeof prev._ts==='number')?prev._ts:0; if((s.salida && !prev.salida) || ((!!s.salida===!!prev.salida) && st>pt)) byKey[k]=s; };
  (a||[]).forEach(add); (b||[]).forEach(add);
  return Object.keys(byKey).map(function(k){return byKey[k];}).sort(function(x,y){ return String(x.entrada||'').localeCompare(String(y.entrada||'')); });
}
function _recToSessions(r){
  if(!r) return [];
  if(Array.isArray(r.sessions)) return r.sessions.slice();
  return [{ obraId:r.obraId||'', obraDesc:r.obraDesc||'', entrada:(r.entrada||r.hora||null), salida:(r.salida||null), _ts:((typeof r._ts==='number')?r._ts:((typeof r.ausenteTs==='number')?r.ausenteTs:0)) }];
}
// espeja lo que hace _mergeAsistencia para registros de sesiones (composición pura) — v653b:
// preserva una ausencia manual si NO hay ninguna sesión real, y arrastra el geo del registro más nuevo.
function _mergeSessRecords(lr, rr){
  var sesh=_mergeSesiones(_recToSessions(lr), _recToSessions(rr));
  var absC=(lr && lr.presente===false && lr.motivo && !Array.isArray(lr.sessions))?lr:((rr && rr.presente===false && rr.motivo && !Array.isArray(rr.sessions))?rr:null);
  if(sesh.length===0 && absC){ return Object.assign({}, absC, { multiSesion:true, sessions:[] }); }
  // v654: el geo ya viaja en cada sesión; _asistResumenSesiones lo expone desde la sesión actual.
  return Object.assign({}, _asistResumenSesiones(sesh), { multiSesion:true, sessions:sesh, via:((lr&&lr.via)||(rr&&rr.via)||'cara') });
}

// ── mini framework ──
var PASS=0, FAIL=0;
function ok(name, cond){ if(cond){ PASS++; } else { FAIL++; console.log('FAIL: '+name); } }

// ── _asistResumenSesiones ──
(function(){
  var r=_asistResumenSesiones([{obraId:'O1',entrada:'07:00',salida:'09:00',_ts:1},{obraId:'O2',entrada:'10:00',salida:null,_ts:2}]);
  ok('resumen: presente', r.presente===true);
  ok('resumen: entrada = primera (07:00)', r.entrada==='07:00');
  ok('resumen: salida vacía si hay sesión abierta', r.salida==='');
  ok('resumen: obraId = obra de la sesión abierta (O2)', r.obraId==='O2');
})();
(function(){
  var r=_asistResumenSesiones([{obraId:'O1',entrada:'07:00',salida:'09:00',_ts:1}]);
  ok('resumen cerrado: salida = 09:00', r.salida==='09:00');
  ok('resumen cerrado: obraId = O1', r.obraId==='O1');
})();

// ── _asistSesionAbierta ──
ok('abierta: con sesión sin salida → true', _asistSesionAbierta({sessions:[{entrada:'07:00',salida:null}]})===true);
ok('abierta: con salida → false', _asistSesionAbierta({sessions:[{entrada:'07:00',salida:'09:00'}]})===false);
ok('abierta: sin sessions → false', _asistSesionAbierta({})===false);
ok('abierta: rec undefined → false', _asistSesionAbierta(undefined)===false);

// ── computeAsistenciaMarkMulti ──
(function(){
  var r1=computeAsistenciaMarkMulti(undefined,'07:00','O1','',100);
  ok('mark: 1ra marca = entrada', r1.accion==='entrada');
  ok('mark: crea 1 sesión', r1.reg.sessions.length===1 && r1.reg.sessions[0].obraId==='O1' && r1.reg.sessions[0].entrada==='07:00' && !r1.reg.sessions[0].salida);
  ok('mark: reg.multiSesion', r1.reg.multiSesion===true);
  var r2=computeAsistenciaMarkMulti(r1.reg,'09:00','IGNORADA','',200);
  ok('mark: 2da marca = salida automática', r2.accion==='salida');
  ok('mark: cierra la sesión O1 (ignora la obra pasada)', r2.reg.sessions.length===1 && r2.reg.sessions[0].salida==='09:00' && r2.obraId==='O1');
  var r3=computeAsistenciaMarkMulti(r2.reg,'10:00','O2','',300);
  ok('mark: 3ra marca = entrada nueva obra', r3.accion==='entrada' && r3.reg.sessions.length===2 && r3.reg.sessions[1].obraId==='O2');
  ok('mark: resumen refleja sesión abierta O2', r3.reg.salida==='' && r3.reg.obraId==='O2' && r3.reg.entrada==='07:00');
})();

// ── _mergeSesiones (unión entre celulares) ──
(function(){
  var m=_mergeSesiones([{obraId:'O1',entrada:'07:00',salida:'09:00',_ts:5}],[{obraId:'O2',entrada:'10:00',salida:null,_ts:6}]);
  ok('merge: une sesiones de obras distintas (2)', m.length===2);
  var m2=_mergeSesiones([{obraId:'O1',entrada:'07:00',salida:null,_ts:5}],[{obraId:'O1',entrada:'07:00',salida:'09:00',_ts:9}]);
  ok('merge: misma sesión, gana la CERRADA (más _ts)', m2.length===1 && m2[0].salida==='09:00');
})();

// ── merge de registros de sesión entre celulares (lo que hará _mergeAsistencia) ──
(function(){
  var local  = { multiSesion:true, sessions:[{obraId:'O1',entrada:'07:00',salida:'09:00',_ts:5}] };   // celular Essenza
  var remote = { multiSesion:true, sessions:[{obraId:'O2',entrada:'10:00',salida:null,_ts:6}] };        // celular Vicinia
  var m=_mergeSessRecords(local, remote);
  ok('merge records: une O1+O2 (no se pierde ninguna)', m.sessions.length===2);
  ok('merge records: resumen presente + sesión abierta O2', m.presente===true && m.salida==='' && m.obraId==='O2');
})();
(function(){
  // un lado session-record, el otro registro PLANO (transición / borde): no se pierde nada
  var local  = { multiSesion:true, sessions:[{obraId:'O1',entrada:'07:00',salida:'09:00',_ts:5}] };
  var remotePlano = { presente:true, entrada:'10:00', obraId:'O2', _ts:6 };
  var m=_mergeSessRecords(local, remotePlano);
  ok('merge records: session + plano → 2 sesiones', m.sessions.length===2);
})();

// ── REGRESIÓN hallazgo ALTO #1: desfase de reloj — la CERRADA gana aunque tenga _ts menor ──
(function(){
  var abierta = {obraId:'O1',entrada:'07:00',salida:null,_ts:1000};   // celular que ABRIÓ (reloj adelantado)
  var cerrada = {obraId:'O1',entrada:'07:00',salida:'09:00',_ts:900};  // celular que CERRÓ (reloj atrasado)
  var m=_mergeSesiones([abierta],[cerrada]);
  ok('skew: la sesión CERRADA gana aunque su _ts sea menor', m.length===1 && m[0].salida==='09:00');
})();

// ── REGRESIÓN hallazgo ALTO #2 / BAJO: ausencia manual se preserva si NO hay sesiones reales ──
(function(){
  var ausencia = { presente:false, motivo:'PERMISO', _ts:500 };               // ausencia del admin (registro plano)
  var sesionVacia = { multiSesion:true, sessions:[] };                          // multiSesion sin marcas reales
  var m=_mergeSessRecords(ausencia, sesionVacia);
  ok('ausencia se preserva cuando no hay sesiones reales', m.presente===false && m.motivo==='PERMISO');
  // pero una sesión REAL gana a la ausencia (semántica aceptada: el escaneo manda)
  var sesionReal = { multiSesion:true, sessions:[{obraId:'O1',entrada:'07:00',salida:null,_ts:600}] };
  var m2=_mergeSessRecords(ausencia, sesionReal);
  ok('una sesión real gana a la ausencia', m2.presente===true && m2.sessions.length===1);
})();

// ── v654: geo POR SESIÓN — computeMulti lo guarda en la sesión y el resumen lo expone ──
(function(){
  var r1=computeAsistenciaMarkMulti(undefined,'07:00','O1','',100,{lat:9,lng:8});
  ok('geo: entrada guarda geoEntrada en la sesión', r1.reg.sessions[0].geoEntrada && r1.reg.sessions[0].geoEntrada.lat===9);
  ok('geo: el resumen expone geoEntrada de la sesión actual', r1.reg.geoEntrada && r1.reg.geoEntrada.lat===9);
  var r2=computeAsistenciaMarkMulti(r1.reg,'09:00','','',200,{lat:5,lng:4});
  ok('geo: salida guarda geoSalida en la sesión', r2.reg.sessions[0].geoSalida && r2.reg.sessions[0].geoSalida.lat===5);
})();
// ── REGRESIÓN #3 (v654): el geo viaja EN la sesión y sobrevive el merge ──
(function(){
  var local  = { multiSesion:true, sessions:[{obraId:'O1',entrada:'07:00',salida:'09:00',geoEntrada:{lat:7},_ts:5}] };
  var remote = { multiSesion:true, sessions:[{obraId:'O2',entrada:'10:00',salida:null,geoEntrada:{lat:1,lng:2},_ts:6}] };
  var m=_mergeSessRecords(local, remote);
  ok('geo: el resumen surfacea el geo de la sesión actual (O2 abierta) tras el merge', m.geoEntrada && m.geoEntrada.lat===1);
  ok('geo: la sesión O1 conserva su propio geo en el merge', m.sessions.find(s=>s.obraId==='O1').geoEntrada.lat===7);
})();

console.log('PASS='+PASS+' FAIL='+FAIL);
process.exit(FAIL?1:0);
