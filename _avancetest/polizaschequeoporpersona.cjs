/* v816: CHEQUEO POR PERSONA — agarra el RESUMEN (personas a cargo de pólizas vigentes) y, para
   cada una, recorre TODAS las planillas no rechazadas de TODOS los proyectos: en cuántas se le
   PAGÓ y en cuántas se le COBRÓ la póliza, con la lista de las que FALTARON.
   Pura: _polizasChequeoPorPersona(projects, state) ->
     [{persona, polizasCount, pagadoEn, cobradoEn, faltoEn, faltas:[{projectName, planilla}]}]. */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
function extract(name){ const m=html.indexOf('function '+name+'('); if(m<0) return null; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){d--; if(d===0) return html.slice(m,i+1);}} return null; }

ok('_polizasChequeoPorPersona existe', html.indexOf('function _polizasChequeoPorPersona(')>=0);
ok('expuesta en window', html.indexOf('window._polizasChequeoPorPersona')>=0);

const body=extract('_polizasChequeoPorPersona');
ok('_polizasChequeoPorPersona extraída', !!body);
if(body){
  const fn=new Function(body+'\n return _polizasChequeoPorPersona;')();
  const st={ polizasGlobales:[
    {id:'po1', aCargoDeNombre:'ANA LOPEZ', estatus:'ACTIVA'},
    {id:'po2', aCargoDeNombre:'ANA LOPEZ', estatus:'ACTIVA'},
    {id:'po3', aCargoDeNombre:'BETO RUIZ', estatus:'ACTIVA'},
    {id:'po4', aCargoDeNombre:'CARLA SOL', estatus:'EN PROCESO'},
    {id:'poP', aCargoDeNombre:'PRE-APP', estatus:'ACTIVA'}
  ]};
  const projects=[
    { id:'pr1', name:'ESSENZA', planilla:{
      pagos:[{id:'pg1', colaborador:'ANA LOPEZ'},{id:'pgB', colaborador:'BETO RUIZ'}],
      planillasArmadas:[
        { id:'pl1', estado:'aprobada_inicial', pagosIds:['pg1','pgB'], descuentosPlanilla:[{subtipo:'POLIZA', colaboradorNombre:'ANA LOPEZ', polizaIds:['po1','po2']}] },
        { id:'pl2', estado:'aprobada_inicial', pagosIds:['pg1'], descuentosPlanilla:[{subtipo:'POLIZA', colaboradorNombre:'ANA LOPEZ', polizaIds:['po1','po2']}] }
      ]
    }},
    { id:'pr2', name:'TORELO', planilla:{
      pagos:[{id:'pg3', colaborador:'ANA LOPEZ'}],
      planillasArmadas:[
        { id:'plR', estado:'rechazada', pagosIds:['pg3'], descuentosPlanilla:[] },               // rechazada → ignorada
        { id:'pl3', estado:'aprobada_inicial', pagosIds:['pg3'], descuentosPlanilla:[] }          // ANA pagada, NO cobrada
      ]
    }}
  ];
  const r=fn(projects, st);
  const by=Object.fromEntries(r.map(x=>[x.persona,x]));
  ok('ANA: pagada en 3 planillas (pl1,pl2,pl3; rechazada no cuenta)', by['ANA LOPEZ'] && by['ANA LOPEZ'].pagadoEn===3);
  ok('ANA: cobrada en 2, faltó 1 (la de TORELO)', by['ANA LOPEZ'] && by['ANA LOPEZ'].cobradoEn===2 && by['ANA LOPEZ'].faltoEn===1);
  ok('ANA: el detalle de la falta es de TORELO', by['ANA LOPEZ'] && by['ANA LOPEZ'].faltas.length===1 && by['ANA LOPEZ'].faltas[0].projectName==='TORELO');
  ok('BETO: pagado en 1, cobrado 0, faltó 1', by['BETO RUIZ'] && by['BETO RUIZ'].pagadoEn===1 && by['BETO RUIZ'].cobradoEn===0 && by['BETO RUIZ'].faltoEn===1);
  ok('CARLA: sin pagos (pagadoEn 0), faltó 0', by['CARLA SOL'] && by['CARLA SOL'].pagadoEn===0 && by['CARLA SOL'].faltoEn===0);
  ok('PRE-APP excluido', !by['PRE-APP']);
  ok('total 3 personas a cargo vigentes', r.length===3);
  ok('orden: más faltas primero (ANA y BETO con 1 antes que CARLA con 0)', r[r.length-1].persona==='CARLA SOL');
}

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
