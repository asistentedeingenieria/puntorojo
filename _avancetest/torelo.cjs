/* Estructura oficial de TORELO (v744): 1 torre, niveles 2-21.
   N2: B,C · N3-8: A,B,C,D · N9-13: A,E MONTAÑAS,D · N14-21: E VOLCANES,E CIUDAD. */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function ext(name){ const m=html.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}')); if(!m){ console.log('NO '+name+' FOUND'); process.exit(2);} return m[0]; }
const BUILD = new Function(ext('buildToreloTowers')+'\nreturn buildToreloTowers;')();
const MODELOS = new Function(ext('buildToreloModelos')+'\nreturn buildToreloModelos;')();
const NIV = new Function(ext('_modeloNivelesTexto')+'\nreturn _modeloNivelesTexto;')();

let pass=0, fail=0;
const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

const towers=BUILD();
ok('1 torre', Array.isArray(towers) && towers.length===1);
const t=towers[0];
ok('torre con id y name', !!t.id && !!t.name);
const lv=t.levels;
ok('20 niveles (2..21)', lv.length===20);
const byName={}; lv.forEach(l=>byName[l.name]=l);
ok('niveles del 2 al 21', !!byName['NIVEL 2'] && !!byName['NIVEL 21'] && !byName['NIVEL 1'] && !byName['NIVEL 22']);

const aptos=(name)=>(byName[name].aptos||[]).map(a=>a.name);
ok('N2 = B,C', eq(aptos('NIVEL 2'), ['B','C']));
ok('N3 = A,B,C,D', eq(aptos('NIVEL 3'), ['A','B','C','D']));
ok('N8 = A,B,C,D', eq(aptos('NIVEL 8'), ['A','B','C','D']));
ok('N9 = A,E MONTAÑAS,D', eq(aptos('NIVEL 9'), ['A','E MONTAÑAS','D']));
ok('N13 = A,E MONTAÑAS,D', eq(aptos('NIVEL 13'), ['A','E MONTAÑAS','D']));
ok('N14 = E VOLCANES,E CIUDAD', eq(aptos('NIVEL 14'), ['E VOLCANES','E CIUDAD']));
ok('N21 = E VOLCANES,E CIUDAD', eq(aptos('NIVEL 21'), ['E VOLCANES','E CIUDAD']));

// totales
let totalAptos=0; lv.forEach(l=>totalAptos+=l.aptos.length);
ok('total aptos = 2 + 6*4 + 5*3 + 8*2 = 57', totalAptos === (2 + 6*4 + 5*3 + 8*2));

// forma de cada apto: id, name UPPER, stages[6] en false, photos, acuses
const a0=byName['NIVEL 9'].aptos[1];
ok('apto name en MAYÚSCULA', a0.name==='E MONTAÑAS');
ok('apto stages [false x6]', Array.isArray(a0.stages) && a0.stages.length===6 && a0.stages.every(s=>s===false));
ok('apto tiene id/photos/acuses', !!a0.id && typeof a0.photos==='object' && typeof a0.acuseRecepciones==='object');

// ids de nivel únicos
const ids={}; let dup=false; lv.forEach(l=>{ if(ids[l.id])dup=true; ids[l.id]=1; });
ok('ids de nivel únicos', !dup);
// ids de apto únicos en todo el proyecto
const aids={}; let adup=false; lv.forEach(l=>l.aptos.forEach(a=>{ if(aids[a.id])adup=true; aids[a.id]=1; }));
ok('ids de apto únicos', !adup);

// ── buildToreloModelos: 7 modelos + aptoModelMap (apto→su nombre) ──
const mm=MODELOS(towers);
ok('7 modelos', mm.modelos.length===7);
ok('modelos = A,B,C,D,E CIUDAD,E MONTAÑAS,E VOLCANES', eq(mm.modelos.map(m=>m.key).slice().sort(), ['A','B','C','D','E CIUDAD','E MONTAÑAS','E VOLCANES']));
ok('cada modelo nombre=key y costos [0x6]', mm.modelos.every(m=>m.nombre===m.key && Array.isArray(m.costos) && m.costos.length===6 && m.costos.every(c=>c===0)));
let mapOk=true; lv.forEach(l=>l.aptos.forEach(a=>{ if(mm.aptoModelMap[a.id]!==a.name) mapOk=false; }));
ok('aptoModelMap: cada apto → su nombre', mapOk);
// preservar costos por key al re-construir
const mm2=MODELOS(towers, [{key:'A', costos:[100,200,0,0,0,0]}, {key:'E MONTAÑAS', costos:[5,6,7,8,9,10]}]);
ok('preserva costos de A', eq(mm2.modelos.find(m=>m.key==='A').costos, [100,200,0,0,0,0]));
ok('preserva costos de E MONTAÑAS', eq(mm2.modelos.find(m=>m.key==='E MONTAÑAS').costos, [5,6,7,8,9,10]));

// ── _modeloNivelesTexto: niveles donde aplica cada modelo ──
ok('A → Niveles 3-13', NIV(towers, mm.aptoModelMap, 'A')==='Niveles 3-13');
ok('B → Niveles 2-8', NIV(towers, mm.aptoModelMap, 'B')==='Niveles 2-8');
ok('C → Niveles 2-8', NIV(towers, mm.aptoModelMap, 'C')==='Niveles 2-8');
ok('D → Niveles 3-13', NIV(towers, mm.aptoModelMap, 'D')==='Niveles 3-13');
ok('E MONTAÑAS → Niveles 9-13', NIV(towers, mm.aptoModelMap, 'E MONTAÑAS')==='Niveles 9-13');
ok('E VOLCANES → Niveles 14-21', NIV(towers, mm.aptoModelMap, 'E VOLCANES')==='Niveles 14-21');
ok('E CIUDAD → Niveles 14-21', NIV(towers, mm.aptoModelMap, 'E CIUDAD')==='Niveles 14-21');
ok('modelo inexistente → vacío', NIV(towers, mm.aptoModelMap, 'ZZZ')==='');
ok('case-insensitive', NIV(towers, mm.aptoModelMap, 'e volcanes')==='Niveles 14-21');

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
