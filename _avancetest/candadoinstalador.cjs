/* v775: candado del instalador. Las etapas 2,3,4 (idx 1,2,3) de un apto deben ir a quien
   cobró la etapa 1 (idx 0). Si es otra persona -> conflicto -> aviso -> SÍ = solicitud que
   solo gerente/admin autoriza. Etapa 1 (idx 0) y etapa 5 (idx 4) quedan LIBRES. */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function ext(name){ const m=html.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}')); return m?m[0]:''; }
let pass=0,fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const srcOwner = ext('_etapa1Owner');
const srcConf  = ext('_etapaOwnerConflicto');
ok('_etapa1Owner existe', !!srcOwner);
ok('_etapaOwnerConflicto existe', !!srcConf);
if(srcOwner && srcConf){
  const _etapa1Owner = new Function(srcOwner+'\nreturn _etapa1Owner;')();
  // _etapaOwnerConflicto usa _etapa1Owner internamente
  const _etapaOwnerConflicto = new Function(srcOwner+'\n'+srcConf+'\nreturn _etapaOwnerConflicto;')();

  const p = { planilla: { pagos: [
    { aptoId:'a1', stageIdx:0, colaborador:'JUAN PEREZ', ts:100 },
    { aptoId:'a1', stageIdx:0, colaborador:'JUAN PEREZ', ts:200 },
    { aptoId:'a2', stageIdx:1, colaborador:'X', ts:50 }
  ]}};
  ok('owner de a1', _etapa1Owner(p,'a1')==='JUAN PEREZ');
  ok('owner de apto sin etapa1 = null', _etapa1Owner(p,'a2')===null);

  ok('conflicto etapa2 a otra persona', _etapaOwnerConflicto(p,'a1',1,'PEDRO LOPEZ')==='JUAN PEREZ');
  ok('conflicto etapa4 a otra persona', _etapaOwnerConflicto(p,'a1',3,'OTRO')==='JUAN PEREZ');
  ok('sin conflicto misma persona (normaliza)', _etapaOwnerConflicto(p,'a1',1,'juan  perez')===null);
  ok('sin conflicto misma persona etapa3', _etapaOwnerConflicto(p,'a1',2,'JUAN PEREZ')===null);
  ok('etapa1 (idx0) siempre libre', _etapaOwnerConflicto(p,'a1',0,'CUALQUIERA')===null);
  ok('etapa5 (idx4) siempre libre', _etapaOwnerConflicto(p,'a1',4,'CUALQUIERA')===null);
  ok('apto sin etapa1 pagada -> sin conflicto', _etapaOwnerConflicto(p,'a2',1,'CUALQUIERA')===null);
}

// estructural: chequeo en pagarEtapaPlanilla + solicitud + merge + autorizar
ok('pagarEtapaPlanilla usa _etapaOwnerConflicto', html.indexOf('_etapaOwnerConflicto(p')>=0);
ok('crea solicitud de pago etapa', html.indexOf('_crearSolicitudPagoEtapa(')>=0);
ok('mensaje LA ETAPA #1 SE LE PAGÓ A', html.indexOf('LA ETAPA #1 SE LE PAG')>=0);
ok('autorizar solicitud crea el pago', /autorizarSolicitudPagoEtapa/.test(html) && html.indexOf('_crearPagoEtapaPlanilla(')>=0);
ok('applyRemote une solicitudesPagoEtapa', html.indexOf('solicitudesPagoEtapa')>=0 && /_mergeById\([\s\S]{0,80}solicitudesPagoEtapa/.test(html));

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
