/* v738: valor =N ("NO TOCAR") en el importador. Verifica que el apto con =N
   queda EXACTAMENTE como estaba (no se pisa) en físico y en pago/despacho. */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function ext(name){ const m=html.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}')); if(!m){ console.log('NO '+name+' FOUND'); process.exit(2);} return m[0]; }
const FIS=new Function(ext('_nCuadrosFisToStages')+'\nreturn _nCuadrosFisToStages;')();
const PAG=new Function(ext('_nCuadrosPagoToPcts')+'\nreturn _nCuadrosPagoToPcts;')();
const P=new Function(ext('_parseImportFisico')+'\nreturn _parseImportFisico;')();
const APPLY_FIS=new Function('_nCuadrosFisToStages', ext('_aplicarImportFisico')+'\nreturn _aplicarImportFisico;')(FIS);
const APPLY_AV=new Function(ext('_aplicarImportAvance')+'\nreturn _aplicarImportAvance;')();

let pass=0, fail=0;
const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

// ── parser ──
let r=P('N2=4; PASILLOS=N');
ok('parse def=4 + PASILLOS=N (-1)', r.ok && r.niveles[0].def===4 && r.niveles[0].overrides.PASILLOS===-1);
r=P('N8=N; 801=1; 803=1');
ok('parse def=N (-1) + overrides', r.ok && r.niveles[0].def===-1 && r.niveles[0].overrides['801']===1 && r.niveles[0].overrides['803']===1);
r=P('N2=n');  // minúscula
ok('parse =n minúscula', r.ok && r.niveles[0].def===-1);

// ── _aplicarImportFisico: NO TOCAR deja el apto como estaba ──
const mk=(name, stages)=>({name, stages:stages?stages.slice():[], stagesTs:[]});
const tower={ id:'va', name:'TORRE A', levels:[ {name:'NIVEL 2', id:'n2', aptos:[
  mk('Apartamento 201'), mk('Apartamento 202'), mk('Pasillos', [true,true,true,false,false,false]) // pasillo con valor previo
]} ] };
APPLY_FIS(tower, P('N2=4; PASILLOS=N').niveles);
const pas=tower.levels[0].aptos.find(a=>a.name==='Pasillos');
const a201=tower.levels[0].aptos.find(a=>a.name==='Apartamento 201');
ok('201 quedó 4/4 (6 stages)', a201.stages.filter(Boolean).length===6);
ok('PASILLOS NO se tocó (sigue 3 stages)', eq(pas.stages,[true,true,true,false,false,false]));

// def=N: solo toca los overrides, el resto intacto
const tower2={ id:'va', name:'TORRE A', levels:[ {name:'NIVEL 8', id:'n8', aptos:[
  mk('Apartamento 801'), mk('Apartamento 802', [true,true,false,false,false,false]), mk('Apartamento 803'), mk('Pasillos', [true,false,false,false,false,false])
]} ] };
APPLY_FIS(tower2, P('N8=N; 801=1; 803=1').niveles);
const g=(n)=>tower2.levels[0].aptos.find(a=>a.name===n).stages.filter(Boolean).length;
ok('801 marcado (1/4 = 2 stages)', g('Apartamento 801')===2);
ok('803 marcado (1/4 = 2 stages)', g('Apartamento 803')===2);
ok('802 intacto (sigue 2 stages)', g('Apartamento 802')===2);
ok('Pasillos intacto (sigue 1 stage)', g('Pasillos')===1);

// ── _aplicarImportAvance (pago): NO TOCAR no pisa pagoManual ──
const tower3={ id:'va', name:'TORRE A', levels:[ {name:'NIVEL 2', id:'n2', aptos:[
  {name:'Apartamento 201'}, {name:'Pasillos', pagoManual:[100,100,0,0,0]} // pasillo con pago previo
]} ] };
APPLY_AV(tower3, P('N2=4; PASILLOS=N').niveles, function(a,n){ a.pagoManual=PAG(n); });
const pas3=tower3.levels[0].aptos.find(a=>a.name==='Pasillos');
const a201b=tower3.levels[0].aptos.find(a=>a.name==='Apartamento 201');
ok('201 pago seteado', a201b.pagoManual && a201b.pagoManual.length===5);
ok('PASILLOS pago NO se tocó', eq(pas3.pagoManual,[100,100,0,0,0]));

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
