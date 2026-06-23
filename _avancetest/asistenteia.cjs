/* v801 (#4 IA): asistente "Preguntá a Punto Rojo". _aiBuildContext (pura) arma la foto
   filtrada por can(); _aiAsk la manda a la Cloud Function askAI (Claude Haiku). */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const fn=fs.readFileSync(path.join(__dirname,'..','functions','index.js'),'utf8');
const pkg=fs.readFileSync(path.join(__dirname,'..','functions','package.json'),'utf8');
let pass=0,fail=0;const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
function extract(name){ const m=html.indexOf('function '+name+'('); if(m<0) return null; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){d--; if(d===0) return html.slice(m,i+1);}} return null; }

// ── estructura cliente ──
ok('_aiBuildContext existe', html.indexOf('function _aiBuildContext(')>=0);
ok('_aiAsk existe', html.indexOf('window._aiAsk')>=0);
ok('UI: botón Preguntá en el header (aiTopBtn)', html.indexOf('id="aiTopBtn"')>=0);
ok('UI: panel + _aiSend', html.indexOf('window._aiSend')>=0 && html.indexOf("id='aiPanel'")>=0);
ok('_aiAsk escribe en aiQuestions con contexto (Firestore, no endpoint público)', /_aiAsk[\s\S]{0,1600}collection\('aiQuestions'\)\.add[\s\S]{0,400}contexto/.test(html));
ok('_aiAsk escucha la respuesta por onSnapshot', /_aiAsk[\s\S]{0,2000}onSnapshot/.test(html));
// ── backend ──
ok('Cloud Function onAiQuestion (trigger Firestore, esquiva la política de público)', fn.indexOf('exports.onAiQuestion')>=0);
ok("trigger en aiQuestions/{id}", fn.indexOf("document: 'aiQuestions/{id}'")>=0);
ok('modelo claude-haiku-4-5', fn.indexOf('claude-haiku-4-5')>=0);
ok('secreto ANTHROPIC_API_KEY', fn.indexOf("defineSecret('ANTHROPIC_API_KEY')")>=0);
ok('dep @anthropic-ai/sdk en package.json', pkg.indexOf('@anthropic-ai/sdk')>=0);

// ── funcional: gating de _aiBuildContext ──
const body=extract('_aiBuildContext'), bF=extract('_aiFecha');
ok('_aiBuildContext extraída', !!body);
if(body){
  const make=new Function((bF||'function _aiFecha(){return "";}')+'\n'+body+'\n return _aiBuildContext;')();
  const c0=make(null, ()=>true, {});
  ok('sin proyecto: dominios vacío seguro', c0 && c0.dominios && Object.keys(c0.dominios).length===0);
  const p={ name:'TORRE X', towers:[{name:'T1',levels:[{name:'N1',aptos:[{name:'A1'}]}]}], planilla:{ pagos:[{colaborador:'JUAN',towerName:'T1',aptoName:'A1',neto:500,ts:0,stageIdx:2,detalle:'ETAPA 3'}] } };
  const cNo=make(p, (k)=> k!=='view.planilla', {});
  ok('sin permiso planilla: NO incluye pagos', !cNo.dominios.pagos);
  const cYes=make(p, ()=>true, {});
  ok('con permiso planilla: incluye pagos del colaborador', Array.isArray(cYes.dominios.pagos) && cYes.dominios.pagos[0].persona==='JUAN' && cYes.dominios.pagos[0].apto==='A1');
  ok('estructura siempre incluida', Array.isArray(cYes.dominios.estructura) && cYes.dominios.estructura[0].torre==='T1');
  const cEx=make(p, ()=>true, { anticipos:[{persona:'JUAN',saldoAprox:100}], asistenciaHoy:{presentes:3} });
  ok('extras anticipos gateado + incluido', Array.isArray(cEx.dominios.anticipos) && cEx.dominios.anticipos[0].persona==='JUAN');
  ok('extras asistencia gateado + incluido (view.personal)', cEx.dominios.asistenciaHoy && cEx.dominios.asistenciaHoy.presentes===3);
  ok('asistencia NO se incluye sin view.personal', !make(p,(k)=>k!=='view.personal',{asistenciaHoy:{presentes:3}}).dominios.asistenciaHoy);
  // v807: dominios nuevos (todas las pestañas), cada uno gateado por su permiso
  const cAll=make(p, ()=>true, { avance:{totalAptos:5}, pedidos:{total:3}, ocs:{total:2}, cobro:{saldo:100}, polizas:{totalVigentes:4} });
  ok('avance gateado por view.avance', cAll.dominios.avance && cAll.dominios.avance.totalAptos===5);
  ok('pedidos+ocs gateados por view.materiales', !!cAll.dominios.pedidos && !!cAll.dominios.ocs);
  ok('cobro gateado por view.cobro', cAll.dominios.cobro && cAll.dominios.cobro.saldo===100);
  ok('polizas gateado por polizas.edit', cAll.dominios.polizas && cAll.dominios.polizas.totalVigentes===4);
  ok('avance NO sin view.avance', !make(p,(k)=>k!=='view.avance',{avance:{totalAptos:5}}).dominios.avance);
  ok('materiales NO sin view.materiales', !make(p,(k)=>k!=='view.materiales',{pedidos:{total:3}}).dominios.pedidos);
  ok('cobro NO sin view.cobro', !make(p,(k)=>k!=='view.cobro',{cobro:{saldo:1}}).dominios.cobro);
  ok('polizas NO sin polizas.edit', !make(p,(k)=>k!=='polizas.edit',{polizas:{totalVigentes:4}}).dominios.polizas);
}

// v807: botón IA por permiso
ok('permiso ia.usar registrado', /pushPerm\(\{\s*key:'ia\.usar'/.test(html));
ok('botón "Preguntá" (header) gateado por data-perm ia.usar', /id="aiTopBtn"[\s\S]{0,140}data-perm="ia\.usar"|data-perm="ia\.usar"[\s\S]{0,140}id="aiTopBtn"/.test(html));

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
