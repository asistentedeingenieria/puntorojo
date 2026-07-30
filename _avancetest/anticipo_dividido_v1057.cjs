/* v1057 — ANTICIPO DIVIDIDO (pedido de Antonio, 29-jul):
   TORELO separa su anticipo en ANTICIPO 1 (Q2,229,082.76 = 25%) + COMPLEMENTO DE
   ANTICIPO (Q891,633.10 = 10%). El anticipo es una fila REAL de p.cobro.rows con
   isAnticipo:true, así que dividirlo es cirugía de datos… PERO el upsert del Excel
   RESUMEN PR reemplaza las filas casando por descripción EXACTA: sin escudo, la
   próxima subida re-crearía "ANTICIPO" y tombstonearía las dos filas divididas.

   Tres piezas:
   1. _v1057EscudoAnticipo(rowsApp, rowsExcel) — PURA: si el Excel trae UNA fila
      ANTICIPO y la app tiene 2+ cuya SUMA cuadra (±ctvos), el Excel adopta las
      filas divididas de la app en lugar de su fila única.
   2. _v1057PctAnticipoFila(r, p) — PURA: el rótulo "SOBRE TOTAL · X%" se deriva
      POR FILA (vp_ci / total con IVA), no del anticipoPct global (35% en ambas
      filas sería mentira: son 25% y 10%).
   3. updateAnticipoPct con 2+ anticipos NO recalcula (tocaría solo la primera). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. el escudo existe y el upsert lo usa —');
const zE = ex('function _v1057EscudoAnticipo(');
ok('existe como función', zE.length > 200);
/* el upsert (RESUMEN PR) lo invoca ANTES de armar _byDesc/reemplazar */
const iUp = html.indexOf('const _byDesc = {};');
const zonaUp = html.slice(Math.max(0, iUp - 600), iUp + 200);
ok('el upsert lo llama', /_v1057EscudoAnticipo\(/.test(zonaUp));

console.log('\n— 2. comportamiento del escudo (función pura) —');
let escudo = null;
try { escudo = new Function('return (' + zE + ')')(); } catch(e){}
ok('se extrae y evalúa', typeof escudo === 'function');
if (escudo) {
  const app = [
    { id:'a1', d:'ANTICIPO 1', vp_ci:2229082.76, isAnticipo:true, _ts:5 },
    { id:'a2', d:'COMPLEMENTO DE ANTICIPO', vp_ci:891633.10, isAnticipo:true, _ts:5 },
    { id:'e1', d:'ESTIMACIÓN #1', vp_ci:96368.45 },
  ];
  const excel = [
    { d:'ANTICIPO', vp_ci:3120715.86, isAnticipo:true },
    { d:'ESTIMACIÓN #1', vp_ci:96368.45 },
    { d:'ESTIMACIÓN #2', vp_ci:83888.82 },
  ];
  const r1 = escudo(app, excel);
  ok('la fila única del Excel se reemplaza por las divididas', Array.isArray(r1) && r1.filter(r=>r.isAnticipo).length === 2 && !r1.some(r=>String(r.d).trim()==='ANTICIPO'));
  ok('las divididas conservan SUS ids (sobreviven al tombstoneo)', r1.some(r=>r.id==='a1') && r1.some(r=>r.id==='a2'));
  ok('quedan PRIMERO (el anticipo encabeza la tabla)', r1[0] && r1[0].isAnticipo && r1[1] && r1[1].isAnticipo);
  ok('las estimaciones del Excel pasan intactas', r1.some(r=>r.d==='ESTIMACIÓN #2'));
  /* suma NO cuadra → manda el Excel (regla de oro: el oficial es el Excel) */
  const appMal = [ { id:'a1', d:'ANTICIPO 1', vp_ci:999, isAnticipo:true }, { id:'a2', d:'COMPLEMENTO DE ANTICIPO', vp_ci:1, isAnticipo:true } ];
  const r2 = escudo(appMal, excel);
  ok('si la suma no cuadra, el Excel gana', r2.some(r=>String(r.d).trim()==='ANTICIPO') && r2.filter(r=>r.isAnticipo).length === 1);
  /* un solo anticipo en la app → comportamiento de siempre (sin tocar nada) */
  const app1 = [ { id:'a0', d:'ANTICIPO', vp_ci:3120715.86, isAnticipo:true } ];
  const r3 = escudo(app1, excel);
  ok('con UN anticipo no interviene', r3.filter(r=>r.isAnticipo).length === 1 && r3.some(r=>String(r.d).trim()==='ANTICIPO'));
  /* tolerancia de centavos (el Excel redondea) */
  const excelCtv = [ { d:'ANTICIPO', vp_ci:3120715.87, isAnticipo:true } ];
  const r4 = escudo(app, excelCtv);
  ok('tolera diferencia de centavos', r4.filter(r=>r.isAnticipo).length === 2);
  /* Excel SIN fila de anticipo → no inventa nada */
  const excelSinAnt = [ { d:'ESTIMACIÓN #1', vp_ci:96368.45 } ];
  const r5 = escudo(app, excelSinAnt);
  ok('sin anticipo en el Excel, adopta las divididas igual (no las pierde)', r5.filter(r=>r.isAnticipo).length === 2);
}

console.log('\n— 3. el % del rótulo se deriva POR FILA —');
const zP = ex('function _v1057PctAnticipoFila(');
ok('existe la derivación', zP.length > 80);
let pctDe = null;
try { pctDe = new Function('return (' + zP + ')')(); } catch(e){}
ok('se extrae y evalúa', typeof pctDe === 'function');
if (pctDe) {
  const p = { totalSinIva: 1000, ivaPct: 0.12, anticipoPct: 0.35 };
  ok('280 de 1120 → 25%', pctDe({ vp_ci: 280 }, p) === 25);
  ok('112 de 1120 → 10%', pctDe({ vp_ci: 112 }, p) === 10);
  ok('sin total → cae al pct global', pctDe({ vp_ci: 280 }, { totalSinIva: 0, anticipoPct: 0.35 }) === 35);
}
ok('renderCobroRow lo usa (ya no el global a secas)', /_v1057PctAnticipoFila\(r,\s*p\)/.test(ex('function renderCobroRow(')));

console.log('\n— 4. updateAnticipoPct no pisa un anticipo dividido —');
const zU = ex('function updateAnticipoPct(');
ok('detecta 2+ anticipos y NO recalcula', /filter\(r\s*=>\s*r\.isAnticipo\)/.test(zU) && /DIVIDIDO/i.test(zU));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
