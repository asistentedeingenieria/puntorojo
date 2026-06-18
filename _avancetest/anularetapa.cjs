/* HABILITAR / ANULAR ETAPA (v750) — clasifica los registros de pago de un apto+etapa
   en "reales" (bruto>0) y "marcadores" (bruto 0: PRE-APP histórico / importado bloqueo). */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function ext(name){ const m=html.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}')); if(!m){ console.log('NO '+name+' FOUND'); process.exit(2);} return m[0]; }
const CLAS = new Function(ext('_anulEtapaClasificar')+'\nreturn _anulEtapaClasificar;')();

let pass=0, fail=0;
const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const pagos=[
  { id:'r1', tipo:'ETAPA', aptoId:'A', stageIdx:4, bruto:500, neto:450 },            // real
  { id:'m1', tipo:'ETAPA', aptoId:'A', stageIdx:4, bruto:0, _preApp:true, colaborador:'PRE-APP' }, // marcador pre-app
  { id:'m2', tipo:'ETAPA', aptoId:'A', stageIdx:4, bruto:0, importado:true, colaborador:'(IMPORTADO)' }, // marcador importado
  { id:'x1', tipo:'ETAPA', aptoId:'A', stageIdx:3, bruto:0, _preApp:true },           // otra etapa
  { id:'x2', tipo:'ETAPA', aptoId:'B', stageIdx:4, bruto:0, _preApp:true },           // otro apto
  { id:'x3', tipo:'AJUSTE', aptoId:'A', stageIdx:4, bruto:99 }                         // no es ETAPA
];

const c=CLAS(pagos,'A',4);
ok('all = 3 (solo ETAPA, apto A, etapa 5)', c.all.length===3);
ok('reales = 1 (bruto 500)', c.reales.length===1 && c.reales[0].id==='r1');
ok('marcadores = 2 (los bruto 0)', c.marcadores.length===2 && c.marcadores.map(x=>x.id).sort().join()==='m1,m2');
ok('no incluye otra etapa', !c.all.some(x=>x.id==='x1'));
ok('no incluye otro apto', !c.all.some(x=>x.id==='x2'));
ok('no incluye AJUSTE', !c.all.some(x=>x.id==='x3'));

// etapa sin registros
const c2=CLAS(pagos,'A',2);
ok('etapa sin registros -> vacío', c2.all.length===0 && c2.reales.length===0 && c2.marcadores.length===0);

// solo marcadores (sin real)
const c3=CLAS(pagos,'B',4);
ok('apto B etapa 5 -> 1 marcador, 0 reales', c3.marcadores.length===1 && c3.reales.length===0);

// stageIdx como string también matchea
ok('stageIdx string matchea', CLAS(pagos,'A','4').all.length===3);

// v750-fix: registro con bruto inválido (NaN/ausente) NO debe quedar en limbo → cuenta como MARCADOR
var cNaN=CLAS([{id:'n1',tipo:'ETAPA',aptoId:'Z',stageIdx:4,bruto:undefined},{id:'n2',tipo:'ETAPA',aptoId:'Z',stageIdx:4},{id:'n3',tipo:'ETAPA',aptoId:'Z',stageIdx:4,bruto:'x'}], 'Z', 4);
ok('bruto inválido -> marcador (no limbo)', cNaN.all.length===3 && cNaN.reales.length===0 && cNaN.marcadores.length===3);
// y un bruto>0 sigue siendo real aunque haya inválidos mezclados
var cMix=CLAS([{id:'r',tipo:'ETAPA',aptoId:'Z',stageIdx:4,bruto:300},{id:'n',tipo:'ETAPA',aptoId:'Z',stageIdx:4,bruto:NaN}], 'Z', 4);
ok('mezcla: 1 real + 1 marcador', cMix.reales.length===1 && cMix.marcadores.length===1);

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
