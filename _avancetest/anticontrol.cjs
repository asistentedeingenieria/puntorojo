/* CONTROL DE ANTICIPOS — lógica pura (v742).
   Por préstamo: cuotas pagadas (inicial + descuentos por anticipoId), saldo,
   estado; agrupado por persona con totales. Ignora planillas rechazadas. */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function ext(name){ const m=html.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}')); if(!m){ console.log('NO '+name+' FOUND'); process.exit(2);} return m[0]; }

const SABYMD = new Function(ext('_descGenSabadoYMD')+'\nreturn _descGenSabadoYMD;')();
const NORM   = new Function(ext('_descGenNorm')+'\nreturn _descGenNorm;')();
const PAGOS  = new Function('_descGenSabadoYMD', ext('_antCtrlPagosByAnt')+'\nreturn _antCtrlPagosByAnt;')(SABYMD);
const BUILD  = new Function(ext('_antCtrlBuild')+'\nreturn _antCtrlBuild;')();
const AGRUP  = new Function('_descGenNorm', ext('_antCtrlAgrupar')+'\nreturn _antCtrlAgrupar;')(NORM);

let pass=0, fail=0;
const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
const near=(a,b)=>Math.abs(a-b)<0.001;

// ── datos de muestra ──
const anticipos=[
  { id:'a1', colaboradorNombre:'JUAN PEREZ', subtipo:'PRESTAMO_HERRAMIENTA', desc:'Escalera', montoTotal:1200, cantidadCuotas:6, cuotasPagadasInicial:1 },
  { id:'a2', colaboradorNombre:'MARÍA LÓPEZ', subtipo:'PRESTAMO_PERSONAL', desc:'', montoTotal:1000, cantidadCuotas:4, cuotasPagadasInicial:0 },
  { id:'a3', colaboradorNombre:'juan perez', subtipo:'PRESTAMO_SAT', desc:'SAT', montoTotal:300, cantidadCuotas:1, cuotasPagadasInicial:0 },
  { id:'a4', colaboradorNombre:'PEDRO X', subtipo:'PRESTAMO_CALZADO', desc:'', montoTotal:500, cantidadCuotas:0, cuotasPagadasInicial:0 } // cantidadCuotas 0 -> sin div by zero
];
const projects=[
  { name:'ESSENZA', planilla:{ planillasArmadas:[
    { numero:10, fechaEnvio:'2026-04-14T08:00:00', estado:'enviada', descuentosPlanilla:[
      { id:'d1', anticipoId:'a1', monto:200, cuotaActual:2, cuotasTotales:6 },
      { id:'d2', anticipoId:'a2', monto:250, cuotaActual:1, cuotasTotales:4 },
      { id:'dp', polizaIds:['p1'], subtipo:'POLIZA', monto:44.95 } // póliza -> ignorada por el control
    ]},
    { numero:11, fechaCreacion:'2026-04-21T08:00:00', estado:'rechazada', descuentosPlanilla:[
      { id:'d3', anticipoId:'a1', monto:200, cuotaActual:9 } // rechazada -> NO cuenta
    ]}
  ]}},
  { name:'VICINIA', planilla:{ planillasArmadas:[
    { numero:5, fechaEnvio:'2026-05-19T08:00:00', descuentosPlanilla:[
      { id:'d4', anticipoId:'a1', monto:200, cuotaActual:3, cuotasTotales:6 },
      { id:'d5', anticipoId:'a3', monto:300, cuotaActual:1, cuotasTotales:1 }
    ]}
  ]}}
];

// ── _antCtrlPagosByAnt ──
const pb=PAGOS(projects);
ok('pagos a1 = 2 (excluye rechazada)', (pb['a1']||[]).length===2);
ok('pagos a2 = 1', (pb['a2']||[]).length===1);
ok('pagos a3 = 1', (pb['a3']||[]).length===1);
ok('pagos sin póliza', !pb['p1']);
ok('pagos ordenados por fecha', pb['a1'][0].fechaYMD <= pb['a1'][1].fechaYMD);
ok('pago lleva fecha de la planilla (sábado)', pb['a1'][0].fechaYMD===SABYMD('2026-04-14T08:00:00'));

// ── _antCtrlBuild ──
const items=BUILD(anticipos, pb);
const a1=items.find(x=>x.id==='a1');
ok('a1 cuotasPagadas = inicial1 + 2 pagos = 3', a1.cuotasPagadas===3);
ok('a1 restantes = 3', a1.cuotasRestantes===3);
ok('a1 montoCuota = 200', near(a1.montoCuota,200));
ok('a1 saldo = 600', near(a1.saldo,600));
ok('a1 estado PENDIENTE', a1.estado==='PENDIENTE');
ok('a1 descontadoApp = 400', near(a1.descontadoApp,400));
const a3=items.find(x=>x.id==='a3');
ok('a3 1/1 -> CANCELADO', a3.estado==='CANCELADO' && a3.cuotasRestantes===0 && near(a3.saldo,0));
const a4=items.find(x=>x.id==='a4');
// cantidadCuotas 0/NaN -> fallback a 1 cuota (mismo criterio que _estadoAnticipo, evita contradecir RESUMEN/LISTADO)
ok('a4 cantidadCuotas 0 -> fallback 1 cuota (= _estadoAnticipo)', a4.montoCuota===500 && a4.cuotasRestantes===1 && isFinite(a4.saldo));

// ── _antCtrlAgrupar ──
const ag=AGRUP(items, {});
ok('agrupa por persona (juan/maría/pedro)', ag.numPersonas===3);
const juan=ag.grupos.find(g=>NORM(g.nombre)==='JUAN PEREZ');
ok('juan tiene 2 préstamos (a1,a3)', juan && juan.prestamos.length===2);
ok('juan totalPrestado = 1500', juan && near(juan.totalPrestado,1500));
ok('juan saldoTotal = 600 (a1 600 + a3 0)', juan && near(juan.saldoTotal,600));
ok('juan descontadoTotal = 700 (400+300)', juan && near(juan.descontadoTotal,700));

// filtro estado PENDIENTE excluye cancelados (a3)
const agP=AGRUP(items, {estado:'PENDIENTE'});
const juanP=agP.grupos.find(g=>NORM(g.nombre)==='JUAN PEREZ');
ok('filtro PENDIENTE: juan solo a1', juanP && juanP.prestamos.length===1 && juanP.prestamos[0].id==='a1');
// filtro persona
const agJ=AGRUP(items, {persona:'juan'});
ok('filtro persona juan -> 1 persona, 2 préstamos', agJ.numPersonas===1 && agJ.grupos[0].prestamos.length===2);
ok('totales globales saldo', near(ag.saldoTotal, 600+750+0+500)); // a4: 0 cuotas -> 1 cuota -> saldo 500

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
