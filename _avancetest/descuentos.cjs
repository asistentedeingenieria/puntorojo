/* DESCUENTOS GENERADOS — lógica pura (v741).
   Junta los descuentos de anticipos+pólizas de todas las planillas (ignora
   rechazadas), filtra por persona/fecha/tipo y agrupa por persona con totales.
   La FECHA es el sábado de la semana de la planilla (fechaEnvio||fechaCreacion). */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function ext(name){ const m=html.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}')); if(!m){ console.log('NO '+name+' FOUND'); process.exit(2);} return m[0]; }

const SABYMD = new Function(ext('_descGenSabadoYMD')+'\nreturn _descGenSabadoYMD;')();
const TIPO   = new Function(ext('_descGenTipo')+'\nreturn _descGenTipo;')();
const NORM   = new Function(ext('_descGenNorm')+'\nreturn _descGenNorm;')();
const FMTYMD = new Function(ext('_descGenFmtYMD')+'\nreturn _descGenFmtYMD;')();
const COLLECT= new Function('_descGenSabadoYMD','_descGenTipo', ext('_descGenCollect')+'\nreturn _descGenCollect;')(SABYMD,TIPO);
const FILTER = new Function('_descGenNorm', ext('_descGenFilter')+'\nreturn _descGenFilter;')(NORM);
const AGRUP  = new Function('_descGenNorm', ext('_descGenAgrupar')+'\nreturn _descGenAgrupar;')(NORM);

let pass=0, fail=0;
const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
const isSat=(ymd)=>new Date(ymd+'T12:00:00').getDay()===6;

// ── _descGenSabadoYMD ──
const s1=SABYMD('2026-04-14T09:00:00');
ok('sabado: el resultado ES sábado', isSat(s1));
ok('sabado: >= fecha de entrada', s1>='2026-04-14');
ok('sabado: idempotente', SABYMD(s1+'T12:00:00')===s1);
ok('sabado: fecha inválida no crashea', typeof SABYMD('basura')==='string');

// ── _descGenTipo ──
ok('tipo ANTICIPO por anticipoId', TIPO({anticipoId:'a1'})==='ANTICIPO');
ok('tipo POLIZA por polizaIds', TIPO({polizaIds:['p1']})==='POLIZA');
ok('tipo POLIZA por subtipo', TIPO({subtipo:'POLIZA'})==='POLIZA');
ok('tipo OTRO sin fuente', TIPO({subtipo:'PRESTAMO_X'})==='OTRO');

// ── _descGenFmtYMD ──
ok('fmt YMD -> DD/MM/YYYY', FMTYMD('2026-04-18')==='18/04/2026');
ok('fmt YMD vacío -> raya', FMTYMD('')==='—');

// ── datos de muestra ──
const SAB_A = SABYMD('2026-04-14T09:00:00');
const SAB_B = SABYMD('2026-05-19T09:00:00');
const projects=[
  { name:'ESSENZA', planilla:{ planillasArmadas:[
    { numero:12, fechaEnvio:'2026-04-14T08:00:00', estado:'enviada', descuentosPlanilla:[
      { id:'d1', anticipoId:'a1', subtipo:'PRESTAMO_PERSONAL', desc:'Préstamo', monto:250, cuotaActual:3, cuotasTotales:6, colaboradorNombre:'JUAN PEREZ' },
      { id:'d2', polizaIds:['p1'], subtipo:'POLIZA', desc:'Póliza IGSS', monto:44.95, colaboradorNombre:'MARÍA LÓPEZ' },
      { id:'d3', subtipo:'OTRO', desc:'manual', monto:99, colaboradorNombre:'PEDRO' } // OTRO -> excluido
    ]},
    { numero:13, fechaCreacion:'2026-04-21T08:00:00', estado:'rechazada', descuentosPlanilla:[
      { id:'d4', anticipoId:'a2', monto:500, colaboradorNombre:'JUAN PEREZ' } // rechazada -> excluido
    ]}
  ]}},
  { name:'VICINIA', planilla:{ planillasArmadas:[
    { numero:1, fechaEnvio:'2026-04-14T08:00:00', descuentosPlanilla:[
      { id:'d5', anticipoId:'a3', subtipo:'PRESTAMO_SAT', monto:100, colaboradorNombre:'juan perez' } // misma persona, otra caja
    ]},
    { numero:2, fechaEnvio:'2026-05-19T08:00:00', descuentosPlanilla:[
      { id:'d6', anticipoId:'a4', subtipo:'PRESTAMO_PERSONAL', monto:100, colaboradorNombre:'JUAN PÉREZ' }
    ]}
  ]}}
];

// ── _descGenCollect ──
const rows=COLLECT(projects);
ok('collect excluye OTRO y rechazada', rows.length===4);
const r1=rows.find(r=>r.descId==='d1');
ok('collect campos d1', r1 && r1.tipo==='ANTICIPO' && r1.monto===250 && r1.planillaNumero===12 && r1.proyecto==='ESSENZA');
ok('collect fecha = sábado de la planilla', r1 && r1.fechaYMD===SAB_A);
ok('collect d6 mayo otra semana', rows.find(r=>r.descId==='d6').fechaYMD===SAB_B);

// ── _descGenFilter ──
ok('filtro persona (case/acentos)', FILTER(rows,{persona:'juan perez'}).length===3); // d1,d5,d6
ok('filtro tipo POLIZA', FILTER(rows,{tipo:'POLIZA'}).length===1);
ok('filtro tipo ANTICIPO', FILTER(rows,{tipo:'ANTICIPO'}).length===3);
ok('filtro desde (solo mayo)', FILTER(rows,{desde:SAB_B}).length===1);
ok('filtro hasta (excluye mayo)', FILTER(rows,{hasta:SAB_A}).length===3);
ok('filtro sin criterios = todo', FILTER(rows,{}).length===4);

// ── _descGenAgrupar ──
const ag=AGRUP(rows);
ok('agrupa por persona', ag.numPersonas===2);
const juan=ag.grupos.find(g=>NORM(g.nombre)==='JUAN PEREZ');
ok('total JUAN = 250+100+100', juan && Math.abs(juan.total-450)<0.001);
ok('JUAN tiene 3 items', juan && juan.items.length===3);
ok('gran total', Math.abs(ag.granTotal-494.95)<0.001);
ok('count total filas', ag.count===4);
ok('grupos ordenados alfabéticamente', ag.grupos[0].nombre.toUpperCase().indexOf('JUAN')===0);

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
