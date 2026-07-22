/* v955 (reporte de Antonio: "NO ME CUADRAN LOS AVANCES POR APARTAMENTO" — con el Excel
   AVANCE PR a la vista: la app tenía T3 N10-13 en 0% y N1 bajado, cuando el Excel decía
   96%/45%). BUG del matcher de parseAvanceExcel: findNivel comparaba por SUBSTRING, y
   'NIVEL 11'.indexOf('NIVEL 1') === 0 => los niveles 10-13 del Excel caían en el NIVEL 1
   de la app: sus apartamentos numerados no matcheaban (quedaban congelados) y sus filas
   "Pasillo" PISABAN al pasillo del NIVEL 1 (por eso el N1 bajó).
   FIX: niveles se matchean por NÚMERO EXACTO (o nombre exacto); substring solo cuando
   ninguno trae número (SOTANO). Además: las filas que no matchean ya NO se descartan en
   silencio — van a `avisos` y el import las muestra. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const src = extractFn('parseAvanceExcel');
let fn = null;
try { fn = new Function('return (' + src + ')')(); } catch(e){}
ok('parseAvanceExcel evaluable', typeof fn === 'function');

if (typeof fn === 'function') {
  // torres estilo ESSENZA: NIVEL 1..13, aptos <nivel><unidad> + PASILLO
  const mkNivel = (t, n) => ({ id: t+'-n'+n, name: 'NIVEL '+n, aptos: [
    { id: t+'-n'+n+'-a1', name: 'APARTAMENTO '+n+'01' },
    { id: t+'-n'+n+'-a2', name: 'APARTAMENTO '+n+'02' },
    { id: t+'-n'+n+'-ap', name: 'PASILLO' }
  ]});
  const towers = [{ id:'t3', name:'TORRE 3', levels: [1,2,10,11,12,13].map(n => mkNivel('t3', n)) }];
  const sheet = [
    ['NOMBRE','% AVANCE'],
    ['TORRE 3', 0.89],
    ['NIVEL 1', 0.94], ['Apartamento 101', 1], ['Apartamento 102', 1], ['Pasillo', 0.75],
    ['NIVEL 2', 0.96], ['Apartamento 201', 1], ['Apartamento 202', 1], ['Pasillo', 0.75],
    ['NIVEL 11', 0.96], ['Apartamento 1101', 1], ['Apartamento 1102', 1], ['Pasillo', 0.5],
    ['NIVEL 12', 0.45], ['Apartamento 1201', 1], ['Apartamento 1202', 0.25], ['Pasillo', 0],
    ['NIVEL 13', 0], ['Azotea', 0]
  ];
  const r = fn({ 'AVANCE PR': sheet }, towers);
  const av = r.avance || {};
  ok('NIVEL 11 del Excel cae en el NIVEL 11 de la app (no en el 1)', av['t3-n11-a1'] === 100 && av['t3-n11-a2'] === 100);
  ok('NIVEL 12: apto parcial con su % correcto', av['t3-n12-a2'] === 25);
  ok('el pasillo del NIVEL 1 conserva SU valor (75), no el de N12 (0)', av['t3-n1-ap'] === 75);
  ok('el pasillo del NIVEL 11 recibe su 50', av['t3-n11-ap'] === 50);
  ok('el pasillo del NIVEL 12 recibe su 0', av['t3-n12-ap'] === 0);
  ok('los aptos de NIVEL 1 y 2 siguen bien', av['t3-n1-a1'] === 100 && av['t3-n2-a1'] === 100);
  // filas sin match reportadas (Azotea no existe en towers)
  ok('las filas sin matchear se REPORTAN en avisos', Array.isArray(r.avisos) && r.avisos.some(a => /AZOTEA|sin match|SIN MATCH/i.test(String(a))));
}

// ── el import muestra los avisos del avance (ya no se descartan) ──
const iPR = html.indexOf('CARGAR DESDE "RESUMEN PR"');
const zona = iPR > -1 ? html.slice(iPR, iPR + 8000) : '';
ok('el import muestra los avisos del parser de avance', /_av\.avisos/.test(zona));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
