/* v812: CHEQUEO POR QUINCENA — por cada planilla (quincena) de TODOS los proyectos, las
   personas PAGADAS esa quincena que tienen póliza vigente, con ✓ cobrada / ✗ no cobrada.
   Pura: _polizasChequeoTodos(projects, state) -> [{projectName, planilla, filas, cobradas, faltaron}]. */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
function extract(name){ const m=html.indexOf('function '+name+'('); if(m<0) return null; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){d--; if(d===0) return html.slice(m,i+1);}} return null; }

ok('_polizasChequeoTodos existe', html.indexOf('function _polizasChequeoTodos(')>=0);
ok('expuesta en window', html.indexOf('window._polizasChequeoTodos')>=0);

const body=extract('_polizasChequeoTodos');
ok('_polizasChequeoTodos extraída', !!body);
if(body){
  const fn=new Function(body+'\n return _polizasChequeoTodos;')();
  const st={ polizasGlobales:[
    {id:'po1', aCargoDeNombre:'ANA LOPEZ', estatus:'ACTIVA'},
    {id:'po2', aCargoDeNombre:'ANA LOPEZ', estatus:'ACTIVA'},
    {id:'po3', aCargoDeNombre:'BETO RUIZ', estatus:'ACTIVA'},
    {id:'po4', aCargoDeNombre:'CARLA SOL', estatus:'EN PROCESO'},
    {id:'po6', aCargoDeNombre:'JOSE LOPEZ', estatus:'ACTIVA'},   // substring de un pago ajeno
    {id:'poP', aCargoDeNombre:'PRE-APP', estatus:'ACTIVA'}
  ]};
  const projects=[
    { id:'pr1', name:'ESSENZA', planilla:{
      pagos:[{id:'pg1', colaborador:'ANA LOPEZ'},{id:'pgB', colaborador:'BETO RUIZ'},{id:'pgJ', colaborador:'JOSE LOPEZ SOYOS'}],
      planillasArmadas:[
        { id:'pl1', numero:2, estado:'aprobada_inicial', pagosIds:['pg1','pgB','pgJ'], descuentosPlanilla:[
          {subtipo:'POLIZA', colaboradorNombre:'ANA LOPEZ', polizaIds:['po1','po2']} // ANA cobrada; BETO pagado sin cobro
        ] }
      ]
    }},
    { id:'pr2', name:'TORELO', planilla:{
      pagos:[{id:'pg2', colaborador:'CARLA SOL'}],
      planillasArmadas:[
        { id:'plR', numero:1, estado:'rechazada', pagosIds:['pg2'], descuentosPlanilla:[] } // rechazada → ignorada
      ]
    }}
  ];
  const r=fn(projects, st);
  ok('1 entrada (la rechazada se ignora)', r.length===1);
  const e=r[0];
  ok('entrada de ESSENZA', e && e.projectName==='ESSENZA');
  ok('solo personas PAGADAS esa quincena (CARLA no pagada → excluida; PREAPP fuera)', e.filas.length===2);
  const by=Object.fromEntries(e.filas.map(x=>[x.persona,x]));
  // GUARD revisión: inclusión ESTRICTA — JOSE LOPEZ no debe entrar por el pago de JOSE LOPEZ SOYOS
  ok('JOSE LOPEZ NO incluido (inclusión exacta, no substring del pagador)', !by['JOSE LOPEZ']);
  ok('ANA cobrada (por polizaIds), 2 pólizas', by['ANA LOPEZ'] && by['ANA LOPEZ'].cobrada===true && by['ANA LOPEZ'].polizasCount===2);
  ok('BETO pagado pero NO cobrada, 1 póliza', by['BETO RUIZ'] && by['BETO RUIZ'].cobrada===false && by['BETO RUIZ'].polizasCount===1);
  ok('resumen: 1 cobrada, 1 faltó', e.cobradas===1 && e.faltaron===1);
  ok('faltaron primero (BETO antes que ANA)', e.filas[0].persona==='BETO RUIZ' && e.filas[1].persona==='ANA LOPEZ');
  // v813: orden por QUINCENA (fecha del sábado) DESC — la más reciente primero, agrupando proyectos
  const r2=fn([
    {id:'a', name:'TORELO', planilla:{ pagos:[{id:'x',colaborador:'ANA LOPEZ'}], planillasArmadas:[{id:'old', estado:'aprobada_inicial', fechaEnvio:'2026-06-06T12:00:00', pagosIds:['x'], descuentosPlanilla:[]}] }},
    {id:'b', name:'ESSENZA', planilla:{ pagos:[{id:'y',colaborador:'ANA LOPEZ'}], planillasArmadas:[{id:'new', estado:'aprobada_inicial', fechaEnvio:'2026-06-20T12:00:00', pagosIds:['y'], descuentosPlanilla:[]}] }}
  ], st);
  ok('v813 orden por fecha DESC (quincena 20/06 antes que 06/06)', r2.length===2 && r2[0].planilla.id==='new' && r2[1].planilla.id==='old');
}

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
