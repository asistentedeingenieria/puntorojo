/* Estructura oficial de TORELO (v744): 1 torre, niveles 2-21.
   N2: B,C · N3-8: A,B,C,D · N9-13: A,E MONTAÑAS,D · N14-21: E VOLCANES,E CIUDAD. */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function ext(name){ const m=html.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}')); if(!m){ console.log('NO '+name+' FOUND'); process.exit(2);} return m[0]; }
const BUILD = new Function(ext('buildToreloTowers')+'\nreturn buildToreloTowers;')();

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

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
