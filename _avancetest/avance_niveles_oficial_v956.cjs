/* v956 (reporte de Antonio: "¿Por qué los porcentajes de cada NIVEL no están
   actualizados?" — los cuadritos de los aptos sí cambiaron, el número del nivel no).
   CAUSA: el render usa p.cobro.avanceLevels/avanceTorres (el % "oficial" que dejó una
   subida de PDF VIEJA) con PRIORIDAD ABSOLUTA sobre el promedio de aptos (línea
   ~30301), y el import del Excel AVANCE PR solo escribía avanceAptos — los niveles
   quedaban congelados para siempre.
   FIX: parseAvanceExcel ahora también captura el % de las filas TORRE/NIVEL del Excel
   (ponderado por costo, el número que Antonio espera) y el import los guarda en
   avanceLevels/avanceTorres con sello avanceMetaTs; _mergeCobroProyecto propaga el
   juego más nuevo entre dispositivos. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. el parser captura el % de TORRE y NIVEL ──
const src = extractFn('parseAvanceExcel');
let fn = null;
try { fn = new Function('return (' + src + ')')(); } catch(e){}
ok('parseAvanceExcel evaluable', typeof fn === 'function');
if (typeof fn === 'function') {
  const towers = [{ id:'t3', name:'TORRE 3', levels: [
    { id:'t3-n1', name:'NIVEL 1', aptos:[{id:'a101',name:'APARTAMENTO 101'},{id:'p1',name:'PASILLO'}] },
    { id:'t3-n11', name:'NIVEL 11', aptos:[{id:'a1101',name:'APARTAMENTO 1101'}] }
  ]}];
  const sheet = [
    ['NOMBRE','% AVANCE'],
    ['TORRE 3', 0.89],
    ['NIVEL 1', 0.94], ['Apartamento 101', 1], ['Pasillo', 0.75],
    ['NIVEL 11', 0.96], ['Apartamento 1101', 1]
  ];
  const r = fn({ 'AVANCE PR': sheet }, towers);
  ok('captura el % del NIVEL (ponderado del Excel)', r.niveles && r.niveles['t3-n1'] === 94 && r.niveles['t3-n11'] === 96);
  ok('captura el % de la TORRE', r.torres && r.torres['t3'] === 89);
  ok('los aptos siguen normal', r.avance && r.avance['a101'] === 100);
}

// ── 2. el import guarda los niveles/torres oficiales con sello ──
const iPR = html.indexOf('CARGAR DESDE "RESUMEN PR"');
const zona = iPR > -1 ? html.slice(iPR, iPR + 9000) : '';
ok('el import escribe avanceLevels desde el Excel', /_av\.niveles/.test(zona) && /avanceLevels/.test(zona));
ok('el import escribe avanceTorres desde el Excel', /_av\.torres/.test(zona) && /avanceTorres/.test(zona));
ok('sella avanceMetaTs', /avanceMetaTs = Date\.now\(\)/.test(zona));

// ── 3. el merge propaga el juego más nuevo ──
const srcM = extractFn('_mergeCobroProyecto');
ok('_mergeCobroProyecto propaga avanceLevels/avanceTorres por avanceMetaTs', /avanceMetaTs/.test(srcM) && /avanceLevels/.test(srcM));
const srcById = extractFn('_mergeById');
let fm = null;
try { fm = new Function('_mergeById', 'return (' + srcM + ')')(new Function('return ('+srcById+')')()); } catch(e){}
if (typeof fm === 'function') {
  const lp = { cobro: { rows: [], avanceLevels: { 'n1': 94 }, avanceTorres: { 't3': 89 }, avanceMetaTs: 2000 } };
  const rp = { cobro: { rows: [], avanceLevels: { 'n1': 23 }, avanceTorres: { 't3': 51 }, avanceMetaTs: 1000 } };
  const chg = fm(lp, rp);
  ok('el juego local más nuevo gana', chg === true && rp.cobro.avanceLevels['n1'] === 94 && rp.cobro.avanceTorres['t3'] === 89);
  ok('idempotente', fm(JSON.parse(JSON.stringify(rp)), rp) === false);
}

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
