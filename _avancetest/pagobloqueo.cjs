/* v733: BLOQUEO REAL DE PAGOS. Verifica:
   - _stagesBloqueo(n): cuadro del resumen -> stageIdx reales a marcar pagados.
   - _aplicarImportPagoBloqueo: crea registros tipo:'ETAPA' monto 0 (importado),
     RESPETANDO los que ya existen (dedup por aptoId+stageIdx). */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function ext(name){ const m=html.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}')); if(!m){ console.log('NO '+name+' FOUND'); process.exit(2);} return m[0]; }
const SB=new Function(ext('_stagesBloqueo')+'\nreturn _stagesBloqueo;')();
const APPLY=new Function('_stagesBloqueo', ext('_aplicarImportPagoBloqueo')+'\nreturn _aplicarImportPagoBloqueo;')(SB);
const P=new Function(ext('_parseImportFisico')+'\nreturn _parseImportFisico;')();

let pass=0, fail=0;
const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

// ── _stagesBloqueo ──
ok('cuadro0 => []',     eq(SB(0),[]));
ok('cuadro1 => [0]',    eq(SB(1),[0]));
ok('cuadro2 => [0,1,2]',eq(SB(2),[0,1,2]));
ok('cuadro3 => [0,1,2,3]', eq(SB(3),[0,1,2,3]));
ok('cuadro4 => [0,1,2,3]', eq(SB(4),[0,1,2,3])); // 4/4 deja la 5 abierta
ok('cheque(5) => [0,1,2,3,4]', eq(SB(5),[0,1,2,3,4]));

// ── _aplicarImportPagoBloqueo ──
const tower={ id:'t', name:'TORRE T', levels:[ {name:'NIVEL 8', id:'n8', aptos:[
  {name:'Apartamento 801',id:'a801'},{name:'Apartamento 802',id:'a802'},{name:'Pasillo',id:'pas8'}
]} ] };
const p={ id:'pr', planilla:{ pagos:[ {tipo:'ETAPA', aptoId:'a801', stageIdx:0, neto:500} ] } }; // 801 etapa1 YA pagada (real)
const parsed=P('N8=3; PASILLO=0'); // todos 3/4 (etapas 1-4), pasillo nada
const r=APPLY(p, tower, parsed.niveles);

ok('etapasNuevas=7', r.etapasNuevas===7);            // 801: 3 (e1 ya estaba) + 802: 4 = 7
ok('etapasYaPagadas=1', r.etapasYaPagadas===1);      // 801 etapa1 respetada
ok('total pagos = 8', p.planilla.pagos.length===8);  // 1 original + 7 nuevos
const de=(aid)=>p.planilla.pagos.filter(x=>x.aptoId===aid).map(x=>x.stageIdx).sort();
ok('801 tiene etapas 0,1,2,3', eq(de('a801'),[0,1,2,3]));
ok('802 tiene etapas 0,1,2,3', eq(de('a802'),[0,1,2,3]));
ok('pasillo SIN etapas (override 0)', de('pas8').length===0);
const orig=p.planilla.pagos.find(x=>x.aptoId==='a801' && x.stageIdx===0);
ok('registro original 801 e1 intacto (neto 500)', orig && orig.neto===500 && !orig.importado);
const nuevo=p.planilla.pagos.find(x=>x.aptoId==='a802' && x.stageIdx===0);
ok('registro nuevo: importado, monto 0, autorizado', nuevo && nuevo.importado===true && nuevo.bruto===0 && nuevo.neto===0 && nuevo.autorizado===true && nuevo.tipo==='ETAPA');

// idempotencia: re-aplicar no duplica
const r2=APPLY(p, tower, parsed.niveles);
ok('re-aplicar: 0 nuevas (todo ya pagado)', r2.etapasNuevas===0);
ok('re-aplicar: total sigue 8', p.planilla.pagos.length===8);

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
