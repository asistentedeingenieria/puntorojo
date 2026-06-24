/* v817: CHEQUEO POR PERSONA — de cada persona a cargo (el RESUMEN), contra TODAS las quincenas
   (no solo donde se le pagó: en principio se cobra a todos en cada quincena). Dice en cuáles
   quincenas NO se le cobró. Pura: _polizasChequeoPorPersona(projects, state) ->
     [{persona, polizasCount, totalQuincenas, cobradoEn, faltoEn, faltas:[{qkey, ref}]}]. */
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
        { id:'pl1', estado:'aprobada_inicial', fechaEnvio:'2026-05-23T12:00:00', pagosIds:['pg1','pgB'], descuentosPlanilla:[{subtipo:'POLIZA', colaboradorNombre:'ANA LOPEZ', polizaIds:['po1','po2']}] },
        { id:'pl2', estado:'aprobada_inicial', fechaEnvio:'2026-06-06T12:00:00', pagosIds:['pg1'], descuentosPlanilla:[
          {subtipo:'POLIZA', colaboradorNombre:'ANA LOPEZ', polizaIds:['po1','po2']},
          {subtipo:'POLIZA', colaboradorNombre:'BETO RUIZ', polizaIds:['po3']}
        ] }
      ]
    }},
    { id:'pr2', name:'TORELO', planilla:{
      pagos:[],
      planillasArmadas:[
        { id:'pl3', estado:'aprobada_inicial', fechaEnvio:'2026-05-23T12:00:00', pagosIds:[], descuentosPlanilla:[] }, // misma quincena Q1, sin descuentos
        { id:'plR', estado:'rechazada', fechaEnvio:'2026-05-09T12:00:00', pagosIds:[], descuentosPlanilla:[] }         // rechazada → ignorada
      ]
    }}
  ];
  const r=fn(projects, st);
  const by=Object.fromEntries(r.map(x=>[x.persona,x]));
  ok('hay 2 quincenas distintas (23/05 y 06/06; la rechazada no cuenta)', r.every(x=>x.totalQuincenas===2));
  ok('ANA: cobrada en las 2 quincenas, faltó 0', by['ANA LOPEZ'] && by['ANA LOPEZ'].cobradoEn===2 && by['ANA LOPEZ'].faltoEn===0);
  ok('BETO: cobrado 1 (Q2), faltó 1 (Q1) — aunque NO se le pagó en Q1 igual cuenta', by['BETO RUIZ'] && by['BETO RUIZ'].cobradoEn===1 && by['BETO RUIZ'].faltoEn===1);
  ok('BETO: la falta es la quincena del 23/05', by['BETO RUIZ'] && by['BETO RUIZ'].faltas.length===1 && /2026-05-23/.test(by['BETO RUIZ'].faltas[0].ref));
  ok('CARLA: nunca cobrada → faltó en las 2 quincenas', by['CARLA SOL'] && by['CARLA SOL'].cobradoEn===0 && by['CARLA SOL'].faltoEn===2);
  ok('PRE-APP excluido', !by['PRE-APP']);
  ok('total 3 personas a cargo vigentes', r.length===3);
  ok('orden: más faltas primero (CARLA, luego BETO, luego ANA)', r[0].persona==='CARLA SOL' && r[r.length-1].persona==='ANA LOPEZ');
}

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
