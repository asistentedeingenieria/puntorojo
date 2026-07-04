/* v891: BLINDAJE DE PLANILLAS ARMADAS Y PAGOS — incidente real 03-jul-2026: un dispositivo
   con el estado de ESSENZA de antes de armarse la planilla del día subió su copia vieja y la
   planilla DESAPARECIÓ de la nube y de todos los dispositivos (los pagos sobrevivieron de
   suerte porque existían en ambas copias). planillasArmadas/pagos/retencionesPlanillas eran
   los ÚLTIMOS arrays de dinero en last-write-wins. Fix: unión por id + _ts + tombstones
   (_mergePlanillaProyecto sobre _mergeById, mismo patrón v646/v663/v673/v740/v752), hook
   por-proyecto en applyRemote, _ts en TODAS las mutaciones de estado/autorización, y
   tombstones al eliminar planilla (planillasEliminadas/pagosEliminados). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const srcMerge = extractFn('_mergeById');
const srcMP = extractFn('_mergePlanillaProyecto');
ok('_mergePlanillaProyecto existe', !!srcMP);
const f = srcMP ? new Function(srcMerge + '\n' + srcMP + '\nreturn _mergePlanillaProyecto;')() : null;

function deep(o){ return JSON.parse(JSON.stringify(o)); }
const PL4 = { id:'pln-4', numero:4, estado:'pendiente_pm', _ts:1000, pagosIds:['pg1','pg2'], totales:{neto:5320.9} };
const PG = [ {id:'pg1', tipo:'ETAPA', ts:500, bruto:100}, {id:'pg2', tipo:'ETAPA', ts:500, bruto:200} ];

if (f) {
  // 1) EL INCIDENTE: el remoto viejo NO trae la planilla armada local → SOBREVIVE y pide resubida
  let lp = { id:'ess', planilla:{ planillasArmadas:[deep(PL4)], pagos:deep(PG) } };
  let rp = { id:'ess', planilla:{ planillasArmadas:[], pagos:deep(PG) } };
  let changed = f(lp, rp);
  ok('planilla local-only sobrevive al remoto viejo', rp.planilla.planillasArmadas.some(x=>x.id==='pln-4'));
  ok('y marca changed para resubir', changed === true);

  // 2) al revés: la planilla solo está en el remoto → queda (dispositivo desactualizado la recibe)
  lp = { id:'ess', planilla:{ planillasArmadas:[], pagos:deep(PG) } };
  rp = { id:'ess', planilla:{ planillasArmadas:[deep(PL4)], pagos:deep(PG) } };
  changed = f(lp, rp);
  ok('planilla remota se conserva sin marcar changed', rp.planilla.planillasArmadas.length===1 && changed===false);

  // 3) conflicto de estado: gana el _ts más nuevo (en ambas direcciones)
  lp = { id:'ess', planilla:{ planillasArmadas:[Object.assign(deep(PL4), {estado:'aprobada', _ts:2000})], pagos:[] } };
  rp = { id:'ess', planilla:{ planillasArmadas:[deep(PL4)], pagos:[] } };
  changed = f(lp, rp);
  ok('mutación local más nueva gana', rp.planilla.planillasArmadas[0].estado==='aprobada' && changed===true);
  lp = { id:'ess', planilla:{ planillasArmadas:[deep(PL4)], pagos:[] } };
  rp = { id:'ess', planilla:{ planillasArmadas:[Object.assign(deep(PL4), {estado:'aprobada', _ts:2000})], pagos:[] } };
  changed = f(lp, rp);
  ok('mutación remota más nueva gana sin changed', rp.planilla.planillasArmadas[0].estado==='aprobada' && changed===false);

  // 4) tombstone: una planilla eliminada de verdad NO revive
  lp = { id:'ess', planilla:{ planillasArmadas:[deep(PL4)], pagos:[] } };
  rp = { id:'ess', planilla:{ planillasArmadas:[], planillasEliminadas:{ 'pln-4': 999 }, pagos:[] } };
  f(lp, rp);
  ok('planilla con tombstone no revive', !rp.planilla.planillasArmadas.some(x=>x.id==='pln-4'));
  ok('el mapa de tombstones queda unido en el resultado', rp.planilla.planillasEliminadas['pln-4'] === 999);

  // 5) pagos: un pago local-only sobrevive; pago con tombstone no revive
  lp = { id:'ess', planilla:{ planillasArmadas:[], pagos:[deep(PG[0]), {id:'pg-nuevo', tipo:'ETAPA', ts:900, bruto:50}] } };
  rp = { id:'ess', planilla:{ planillasArmadas:[], pagos:[deep(PG[0])] } };
  changed = f(lp, rp);
  ok('pago local-only sobrevive', rp.planilla.pagos.some(x=>x.id==='pg-nuevo') && changed===true);
  lp = { id:'ess', planilla:{ planillasArmadas:[], pagos:[{id:'pg-borrado', tipo:'ETAPA', ts:1}] } };
  rp = { id:'ess', planilla:{ planillasArmadas:[], pagos:[], pagosEliminados:{ 'pg-borrado': 5 } } };
  f(lp, rp);
  ok('pago con tombstone no revive', !rp.planilla.pagos.some(x=>x.id==='pg-borrado'));

  // 6) retencionesPlanillas también se unen (mismo riesgo de plata)
  lp = { id:'ess', planilla:{ planillasArmadas:[], pagos:[], retencionesPlanillas:[{id:'retpl-1', estado:'pendiente_pm', _ts:10}] } };
  rp = { id:'ess', planilla:{ planillasArmadas:[], pagos:[], retencionesPlanillas:[] } };
  changed = f(lp, rp);
  ok('planilla de retenciones local-only sobrevive', rp.planilla.retencionesPlanillas.some(x=>x.id==='retpl-1') && changed===true);

  // 7) idempotencia (regla v856): re-correr el merge con el resultado no detecta cambios
  lp = { id:'ess', planilla:{ planillasArmadas:[deep(PL4)], pagos:deep(PG) } };
  rp = { id:'ess', planilla:{ planillasArmadas:[], pagos:[deep(PG[0])] } };
  f(lp, rp);
  const rondaDos = f(lp, rp);
  ok('idempotente: segunda pasada sin cambios', rondaDos === false);

  // 8) blindaje de estructura: sin planilla remota o sin lp no revienta
  ok('rp sin planilla y sin data local → false', f({id:'x'}, {id:'x'}) === false);
  ok('lp null → false y no revienta', f(null, { id:'x', planilla:{ planillasArmadas:[], pagos:[] } }) === false);

  // 9) (revisión adversarial) doc remoto SIN objeto planilla pero CON plata local → no se pierde
  lp = { id:'ess', planilla:{ planillasArmadas:[deep(PL4)], pagos:deep(PG) } };
  rp = { id:'ess' };
  changed = f(lp, rp);
  ok('remoto sin planilla: la plata local sobrevive', changed === true && rp.planilla && rp.planilla.planillasArmadas.some(x=>x.id==='pln-4'));

  // 10) (revisión adversarial) tombstone local-only mata al zombi remoto Y pide resubida
  lp = { id:'ess', planilla:{ planillasArmadas:[], planillasEliminadas:{ 'pln-4': 111 }, pagos:[] } };
  rp = { id:'ess', planilla:{ planillasArmadas:[deep(PL4)], pagos:[] } };
  changed = f(lp, rp);
  ok('tombstone local-only elimina el zombi y marca changed', changed === true && !rp.planilla.planillasArmadas.some(x=>x.id==='pln-4'));

  // 11) (revisión adversarial) registros legacy SIN id no se pierden
  lp = { id:'ess', planilla:{ planillasArmadas:[], pagos:[] } };
  rp = { id:'ess', planilla:{ planillasArmadas:[], pagos:[ {tipo:'ETAPA', bruto:99}, deep(PG[0]) ] } };
  f(lp, rp);
  ok('pago sin id del remoto se preserva', rp.planilla.pagos.some(x=>!x.id && x.bruto===99));

  // 12) (revisión adversarial) no inventa campos vacíos que el remoto no traía (evita resubidas masivas)
  lp = { id:'ess', planilla:{} };
  rp = { id:'ess', planilla:{ planillasArmadas:[deep(PL4)] } };
  f(lp, rp);
  ok('sin tombstones ni pagos → no crea los campos vacíos', rp.planilla.pagosEliminados === undefined && rp.planilla.pagos === undefined);
}

// ── estructural: hook en applyRemote + tombstones + sellos _ts ──
ok('hook v891 en applyRemote (por proyecto, marca needsResync)', /const _chgPl = _mergePlanillaProyecto\(_locProj\[rp && rp\.id\], rp\);/.test(html));
ok('hook v891 no marca needsResync para solo-lectura', /_chgPl && !\(typeof isReadOnly === 'function' && isReadOnly\(\)\)\) \{ needsResync = true; _blindados\+\+; \}/.test(html));
// hallazgo crítico de la revisión: _v411 corre sobre copias potencialmente stale — NO debe sellar _ts
ok('_v411 NO sella pl._ts (lo sella el resync solo con cambio real)', /acá NO se sella pl\._ts/.test(html) && /pl\._resyncTs = Date\.now\(\);\r?\n\s*pl\._ts = Date\.now\(\);/.test(html.replace(/\r\n/g,'\n')));
// hallazgos: borrados sin tombstone resucitaban — todos los caminos de borrado tombstonean
ok('tombstones en todos los caminos de borrado de pagos (>=8 sitios)', (html.match(/pagosEliminados\[/g)||[]).length >= 8);
ok('el breaker distingue resyncs legítimos por contenido de planillas', /sig\(pla\.planillasArmadas\)/.test(html));
ok('eliminarPlanillaArmada deja tombstone de la planilla', /planillasEliminadas\[/.test(html));
ok('eliminarPlanillaArmada deja tombstones de sus pagos', /pagosEliminados\[/.test(html));
ok('las mutaciones de estado sellan pl._ts (>=12 sitios)', (html.match(/pl\._ts = Date\.now\(\);/g)||[]).length >= 12);
ok('autorizar/retención sellan pg._ts (>=4 sitios)', (html.match(/pg\._ts = Date\.now\(\);/g)||[]).length >= 4);
ok('la planilla nace con _ts', /id: 'pln-'\+uid\(\),\s*\n\s*_ts: Date\.now\(\),/.test(html.replace(/\r\n/g,'\n')));
ok('la planilla de retenciones nace con _ts', /id: 'retpl-'\+uid\(\),\s*\n\s*_ts: Date\.now\(\),/.test(html.replace(/\r\n/g,'\n')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
