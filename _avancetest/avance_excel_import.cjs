/* v818: parseAvanceExcel — el matcher de aptos. FIX: con aptos de 1 letra (A/B/C/D) el substring
   contaminaba (filas OTROS / "B prima" / "E MONTAÑAS" matcheaban y pisaban el %). Ahora: match
   EXACTO (completo o sin prefijo "Apartamento") o por NÚMERO; substring solo si AMBOS >1 carácter. */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
function extract(name){ const m=html.indexOf('function '+name+'('); if(m<0) return null; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){d--; if(d===0) return html.slice(m,i+1);}} return null; }

ok('parseAvanceExcel existe', html.indexOf('function parseAvanceExcel(')>=0);
const body=extract('parseAvanceExcel');
ok('parseAvanceExcel extraída', !!body);
if(body){
  const fn=new Function(body+'\n return parseAvanceExcel;')();
  const towers=[{ id:'t', name:'TORRE ÚNICA', levels:[
    { id:'t-n2', name:'NIVEL 2', aptos:[{id:'b',name:'B'},{id:'c',name:'C'}] },
    { id:'t-n9', name:'NIVEL 9', aptos:[{id:'a9',name:'A'},{id:'em9',name:'E MONTAÑAS'},{id:'d9',name:'D'}] },
    { id:'t-n5', name:'NIVEL 5', aptos:[{id:'apt305',name:'305'}] }
  ]}];
  const aoa=[
    ['DESCRIPCIÓN','% EJECUTADO A LA FECHA'],
    ['TORRE ÚNICA',''],
    ['NIVEL 2', 0.25],
    ['B', 0.25],
    ['C', 0.25],
    ['NIVEL 9', 0.5],
    ['A', 0.5],
    ['E MONTAÑAS', 0.5],
    ['D', 0.5],
    ['Campamento en obra (bodega, aseos)', 0.1],   // contiene "B" — NO debe contaminar
    ['B prima', 0],                                 // NO debe matchear "B"
    ['NIVEL 5', 0.75],
    ['Apartamento 305', 0.75]                       // numérico sigue andando
  ];
  const res=fn({'AVANCE PR':aoa}, towers);
  ok('sin avisos (encontró el header de %)', Array.isArray(res.avisos) && res.avisos.length===0);
  ok('NIVEL 2 B = 25', res.avance['b']===25);
  ok('NIVEL 2 C = 25', res.avance['c']===25);
  ok('NIVEL 9 A = 50 (no contaminado)', res.avance['a9']===50);
  ok('NIVEL 9 E MONTAÑAS = 50 (no se lo robó "A")', res.avance['em9']===50);
  ok('NIVEL 9 D = 50', res.avance['d9']===50);
  ok('numérico 305 = 75 (Apartamento 305)', res.avance['apt305']===75);
  ok('NINGUNA contaminación: solo 6 aptos con valor', Object.keys(res.avance).length===6);
  ok('B NO quedó en 10 (la fila OTROS no lo pisó)', res.avance['b']!==10);
}

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
