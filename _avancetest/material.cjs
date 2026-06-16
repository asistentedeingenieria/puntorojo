/* TDD Fase B: vista MATERIALES "AVANCE POR APARTAMENTO". Despachado = OC AUTORIZADA.
   % de etapa = items despachados / total items de la etapa (por CANTIDAD de items).
   Cuadritos: e1@100→1, e2@100→2, e3@100→3, e4@50→4, e4@100→cheque (DESPACHADO AL 100%). */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function ext(name){ const m=html.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}')); if(!m){ console.log('NO '+name+' FOUND'); process.exit(2);} return m[0]; }
const D=new Function(ext('_itemsDespachadosEtapa')+'\nreturn _itemsDespachadosEtapa;')();
const P=new Function(ext('_etapaDespachoPct')+'\nreturn _etapaDespachoPct;')();
const M=new Function(ext('_avanceAptoNivelMaterial')+'\nreturn _avanceAptoNivelMaterial;')();

let pass=0, fail=0;
const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
const sorted=a=>(a||[]).slice().sort().join(',');

const pedidos=[
  {id:'p1', esDeReceta:true, recetaLevelId:'L1', recetaEtapaIdx:0, items:{a:1,b:2}},  // OC autorizada
  {id:'p2', esDeReceta:true, recetaLevelId:'L1', recetaEtapaIdx:0, items:{c:1}},       // OC pendiente
  {id:'p3', esDeReceta:true, recetaLevelId:'L1', recetaEtapaIdx:1, items:{x:1}},       // OC autorizada
  {id:'p4', esDeReceta:true, recetaLevelId:'L1', recetaEtapaIdx:0, items:{d:1}},       // sin OC
  {id:'p5', esDeReceta:true, recetaLevelId:'L1', recetaEtapaIdx:0, items:{e:1}},       // 2 OC, una pendiente
  {id:'p6', esDeReceta:false, recetaLevelId:'L1', recetaEtapaIdx:0, items:{z:1}},      // no es de receta
];
const ordenes=[
  {pedidoId:'p1', status:'AUTORIZADA'},
  {pedidoId:'p2', status:'PENDIENTE_AUTORIZACION'},
  {pedidoId:'p3', status:'AUTORIZADA'},
  {pedidoId:'p5', status:'AUTORIZADA'}, {pedidoId:'p5', status:'PENDIENTE_AUTORIZACION'},
];

ok('despachados L1/etapa0 = a,b (p1 autorizada; p2 pend, p4 sin OC, p5 una pend → fuera)', sorted(D(pedidos,ordenes,'L1',0))==='a,b');
ok('despachados L1/etapa1 = x', sorted(D(pedidos,ordenes,'L1',1))==='x');
ok('etapa sin pedidos => vacio', sorted(D(pedidos,ordenes,'L1',3))==='');
ok('no cuenta pedidos de otro nivel', sorted(D(pedidos,ordenes,'L2',0))==='');

ok('% 5 de 10 => 50', P(10,5)===50);
ok('% 4 de 4 => 100', P(4,4)===100);
ok('% total 0 => 0', P(0,3)===0);
ok('% no pasa de 100', P(10,12)===100);

ok('mat e1@100 => 1', M([100,0,0,0]).n===1 && !M([100,0,0,0]).green);
ok('mat e1 solo, e2<100 => 1', M([100,50,0,0]).n===1);
ok('mat e1,e2,e3@100 => 3', M([100,100,100,0]).n===3);
ok('mat e4@50 => 4', M([100,100,100,50]).n===4 && !M([100,100,100,50]).green);
ok('mat e4@49 sigue => 3', M([100,100,100,49]).n===3);
ok('mat e4@100 => cheque', M([100,100,100,100]).green===true);
ok('mat nada => 0', M([0,0,0,0]).n===0);

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
