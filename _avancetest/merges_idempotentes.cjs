/* v857 #2: AUDITORÍA DE IDEMPOTENCIA de TODOS los merges de applyRemote. Regla de oro: si local y
   remoto son IDÉNTICOS, el merge NO debe reportar "cambió" (si lo hace, entra en bucle de re-sync,
   como pasó con asistencia en v856). Prueba cada merge con entrada idéntica y exige changed=false.
   (asistencia ya tiene su propio test: asist_merge_idempotente.cjs) */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
function make(names, ret){ const src = names.map(extractFn); if(!src.every(Boolean)) return null; return new Function(src.join('\n') + '\nreturn ' + ret + ';')(); }
const clone = x => JSON.parse(JSON.stringify(x));
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// _mergeById (pólizas/anticipos/solicitudes)
const mById = make(['_mergeById'], '_mergeById');
ok('_mergeById existe', !!mById);
if (mById) {
  const L = [{id:'a',_ts:5,x:1},{id:'b',ts:9}];
  ok('_mergeById idéntico → changed=false', mById(clone(L), clone(L), {}).changed === false);
}

// _mergeColaboradores
const mCol = make(['_mergeColaboradores'], '_mergeColaboradores');
ok('_mergeColaboradores existe', !!mCol);
if (mCol) {
  const L = [{id:'c1',nombre:'JUAN PEREZ'},{id:'c2',nombre:'ANA LOPEZ'}];
  ok('_mergeColaboradores idéntico → changed=false', mCol(clone(L), clone(L), {}).changed === false);
}

// _mergePersonal
const mPer = make(['_mergePersonal'], '_mergePersonal');
ok('_mergePersonal existe', !!mPer);
if (mPer) {
  const L = [{id:'p1',_ts:7,nombre:'X'},{id:'p2',_ts:3}];
  ok('_mergePersonal idéntico → changed=false', mPer(clone(L), clone(L), {}).changed === false);
}

// _mergeTomas (+ _mergeOneToma)
const mTom = make(['_invNorm','_mergeOneToma','_mergeTomas'], '_mergeTomas');
ok('_mergeTomas existe', !!mTom);
if (mTom) {
  const L = [{ id:'t1', estado:'ABIERTA', fechaInicio:'2026-06-26', lineas:[{ material:'TORNILLO', loc:'BODEGA', cantidad:10, _ts:100 }] }];
  ok('_mergeTomas idéntico → changed=false', mTom(clone(L), clone(L), {}).changed === false);
}

// _mergeLibEtapasIntoMerged (+ _mergeLibMap)
const mLib = make(['_mergeLibMap','_mergeLibEtapasIntoMerged'], '_mergeLibEtapasIntoMerged');
ok('_mergeLibEtapasIntoMerged existe', !!mLib);
if (mLib) {
  const st = { projects:[{ towers:[{ levels:[{ aptos:[{ id:'a1', libEtapas:{'0-1':123}, libEtapasTomb:{'0-2':456} }] }] }] }] };
  ok('_mergeLibEtapasIntoMerged idéntico → changed=false', mLib(clone(st), clone(st)) === false);
}

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
