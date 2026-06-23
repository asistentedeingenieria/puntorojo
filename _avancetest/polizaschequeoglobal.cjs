/* v811: CHEQUEO GLOBAL de pólizas — una sola lista de las personas a cargo (pólizas vigentes)
   contra TODAS las planillas no rechazadas de TODOS los proyectos. Pura:
   _polizasChequeoGlobal(projects, state) -> [{persona, polizasCount, aplicada, razon}]
   razon '' si aplicada · 'NO EMPATO' (tuvo pago en algún lado, sin descuento) · 'SIN PAGO'. */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
function extract(name){ const m=html.indexOf('function '+name+'('); if(m<0) return null; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){d--; if(d===0) return html.slice(m,i+1);}} return null; }

ok('_polizasChequeoGlobal existe', html.indexOf('function _polizasChequeoGlobal(')>=0);
ok('expuesta en window', html.indexOf('window._polizasChequeoGlobal')>=0);

const body=extract('_polizasChequeoGlobal');
ok('_polizasChequeoGlobal extraída', !!body);
if(body){
  const fn=new Function(body+'\n return _polizasChequeoGlobal;')();
  const st={ polizasGlobales:[
    {id:'po1', aCargoDeNombre:'ANA LOPEZ', aseguradoNombre:'HIJO ANA', estatus:'ACTIVA'},
    {id:'po2', aCargoDeNombre:'ANA LOPEZ', aseguradoNombre:'ANA LOPEZ', estatus:'ACTIVA'},
    {id:'po3', aCargoDeNombre:'BETO RUIZ', aseguradoNombre:'BETO', estatus:'ACTIVA'},
    {id:'po4', aCargoDeNombre:'CARLA SOL', aseguradoNombre:'CARLA', estatus:'EN PROCESO'},
    {id:'po5', aCargoDeNombre:'DARIO X', aseguradoNombre:'D', estatus:'DE BAJA'},
    {id:'po6', aCargoDeNombre:'JOSE LOPEZ', aseguradoNombre:'JOSE', estatus:'ACTIVA'},        // titular corto
    {id:'po7', aCargoDeNombre:'EVA MENDEZ MILES', aseguradoNombre:'EVA', estatus:'ACTIVA'},   // fallback por nombre exacto
    {id:'poP', aCargoDeNombre:'PRE-APP', aseguradoNombre:'x', estatus:'ACTIVA'}               // PREAPP → excluido
  ]};
  const projects=[
    { id:'pr1', name:'ESSENZA', planilla:{
      pagos:[{id:'pg1', colaborador:'ANA LOPEZ'},{id:'pgB', colaborador:'BETO RUIZ'},{id:'pgJ', colaborador:'JOSE LOPEZ SOYOS'}],
      planillasArmadas:[
        { id:'pl1', estado:'aprobada_inicial', pagosIds:['pg1','pgB','pgJ'], descuentosPlanilla:[
          {subtipo:'POLIZA', colaboradorNombre:'ANA LOPEZ', polizaIds:['po1','po2']},          // ANA aplicada por id
          {subtipo:'POLIZA', colaboradorNombre:'JOSE LOPEZ SOYOS', polizaIds:['poX_soyos']}     // descuento de OTRA persona, ids ajenos
        ] }
      ]
    }},
    { id:'pr2', name:'TORELO', planilla:{
      pagos:[{id:'pg2', colaborador:'CARLA SOL'},{id:'pgE', colaborador:'EVA MENDEZ MILES'}],
      planillasArmadas:[
        { id:'plR', estado:'rechazada', pagosIds:['pg2'], descuentosPlanilla:[] },             // rechazada → ignorada
        { id:'pl2', estado:'aprobada_inicial', pagosIds:['pgE'], descuentosPlanilla:[
          {subtipo:'POLIZA', colaboradorNombre:'EVA MENDEZ MILES'}                              // SIN polizaIds → fallback nombre EXACTO
        ] }
      ]
    }}
  ];
  const r=fn(projects, st);
  const by=Object.fromEntries(r.map(x=>[x.persona,x]));
  ok('ANA aplicada por polizaIds', by['ANA LOPEZ'] && by['ANA LOPEZ'].aplicada===true && by['ANA LOPEZ'].razon==='');
  ok('ANA cuenta sus 2 pólizas', by['ANA LOPEZ'] && by['ANA LOPEZ'].polizasCount===2);
  ok('BETO faltó NO EMPATO (pago en pr1, sin descuento)', by['BETO RUIZ'] && by['BETO RUIZ'].aplicada===false && by['BETO RUIZ'].razon==='NO EMPATO');
  ok('CARLA faltó SIN PAGO (su única planilla está rechazada)', by['CARLA SOL'] && by['CARLA SOL'].aplicada===false && by['CARLA SOL'].razon==='SIN PAGO');
  ok('DARIO (póliza DE BAJA) excluido del universo', !by['DARIO X']);
  // GUARD del hallazgo de la revisión: JOSE LOPEZ NO debe marcarse aplicada por el descuento de JOSE LOPEZ SOYOS (ids ajenos)
  ok('JOSE LOPEZ NO aplicada por substring del pagador (falso positivo bloqueado)', by['JOSE LOPEZ'] && by['JOSE LOPEZ'].aplicada===false);
  // fallback de nombre EXACTO cuando el descuento NO trae polizaIds
  ok('EVA aplicada por nombre exacto (descuento sin polizaIds)', by['EVA MENDEZ MILES'] && by['EVA MENDEZ MILES'].aplicada===true);
  ok('PRE-APP excluido del universo', !by['PRE-APP']);
  ok('total 5 personas a cargo vigentes (sin DE BAJA ni PREAPP)', r.length===5);
  ok('los que FALTARON salen primero', r[0].aplicada===false && r[r.length-1].aplicada===true);
}

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
