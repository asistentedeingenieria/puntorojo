/* v1081 — DASHBOARD DE RENTABILIDAD · Fase 1a: el avance en lenguaje de 4 ETAPAS.
   Antonio (30-jul): "EN PRINCIPIO SON CUATRO ETAPAS PERO EN EL AVANCE AGREGO DOS POR TEMAS
   DE FOTOS". El código lo confirma: ETAPAS (L11701) tiene 6 pasos con umbrales 15/25/40/50/
   75/100, y la receta, los gastos y la planilla ya hablan de 1RA..4TA ETAPA. El agrupamiento
   sale de los umbrales: 25 / 50 / 75 / 100.
     1RA = ESTRUCTURA + PRIMERA CARA          (pasos 1-2)
     2DA = REFUERZOS DE MADERA + FORRO 2ª CARA (pasos 3-4)
     3RA = ESTRUCTURA CIELO Y FORRO            (paso 5)
     4TA = MASILLA COMPLETA                    (paso 6)
   Cada etapa económica vale 25% del apartamento. NO se captura nada: se deriva del avance
   que ya existe. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
/* la tabla vive en el scope del módulo (igual que en la app): se extrae del código REAL */
const _mRE = html.match(/const RENT_ETAPAS = \[[\s\S]*?\];/);
const RENT_ETAPAS = _mRE ? new Function('return ' + _mRE[0].replace(/^const RENT_ETAPAS = /, '').replace(/;$/, ''))() : [];

console.log('\n— 1. el mapa de 6 pasos → 4 etapas —');
ok('existe la tabla de etapas económicas', RENT_ETAPAS.length === 4 && RENT_ETAPAS[0].nombre === '1RA ETAPA' && RENT_ETAPAS[3].pasos === 6);
const zM = ex('function _rentEtapasDeApto(');
let f = null;
try { f = new Function('aptoCompleted','RENT_ETAPAS', 'return (' + zM + ')'); } catch(e){}
ok('existe _rentEtapasDeApto y es pura', !!f && zM.length > 150);
if (f) {
  /* el apto reporta cuántos de los 6 pasos tiene listos; devolvemos cuántas ETAPAS ECONÓMICAS */
  const de = n => f(() => n, RENT_ETAPAS)({});
  ok('sin nada hecho: 0 etapas', de(0) === 0);
  ok('solo estructura (1 de 6): NINGUNA etapa cobrable todavía', de(1) === 0);
  ok('estructura + 1ª cara (2 de 6): 1RA ETAPA lista', de(2) === 1);
  ok('refuerzos (3 de 6): sigue en 1', de(3) === 1);
  ok('+ forro 2ª cara (4 de 6): 2DA ETAPA lista', de(4) === 2);
  ok('+ cielo (5 de 6): 3RA ETAPA lista', de(5) === 3);
  ok('masilla (6 de 6): las 4 completas', de(6) === 4);
  ok('un valor raro no rompe', de(99) === 4 && de(-3) === 0);
}

console.log('\n— 2. el avance del apartamento, en dinero de etapas —');
const zA = ex('function _rentAvanceApto(');
let a = null;
try { a = new Function('_rentEtapasDeApto','RENT_ETAPAS', 'return (' + zA + ')'); } catch(e){}
ok('existe _rentAvanceApto', !!a && zA.length > 40); // es una linea: etapas hechas / 4
if (a) {
  const av = n => a(() => n, RENT_ETAPAS)({});
  ok('cada etapa vale 25%', av(0) === 0 && av(1) === 0.25 && av(2) === 0.5 && av(3) === 0.75 && av(4) === 1);
}

console.log('\n— 3. el avance del PROYECTO (promedio por apartamento) —');
const zP = ex('function _rentAvanceProyecto(');
let pr = null;
try { pr = new Function('_rentAvanceApto', 'return (' + zP + ')'); } catch(e){}
ok('existe _rentAvanceProyecto', !!pr && zP.length > 200);
if (pr) {
  /* stub: el avance de cada apto viene en el propio objeto para poder probar sin la app */
  const fp = pr(x => (x && x.av) || 0);
  const proy = { towers: [
    { levels: [ { aptos: [{ av: 1 }, { av: 0.5 }] }, { aptos: [{ av: 0 }] } ] },
    { levels: [ { aptos: [{ av: 0.25 }] } ] }
  ] };
  const r = fp(proy);
  ok('promedia TODOS los aptos de todas las torres', Math.abs(r.pct - (1 + 0.5 + 0 + 0.25) / 4) < 0.0001);
  ok('reporta cuántos apartamentos son', r.aptos === 4);
  ok('y cuántos están terminados', r.terminados === 1);
  ok('proyecto sin torres: 0 y no revienta', fp({}).pct === 0 && fp({ towers: [] }).aptos === 0);
  ok('el porcentaje nunca se sale de 0..1', fp({ towers: [{ levels: [{ aptos: [{ av: 5 }] }] }] }).pct <= 1);
}

console.log('\n— 4. avance por ETAPA (para la curva S y el valor ganado) —');
const zE = ex('function _rentAvancePorEtapa(');
let pe = null;
try { pe = new Function('_rentEtapasDeApto','RENT_ETAPAS', 'return (' + zE + ')'); } catch(e){}
ok('existe _rentAvancePorEtapa', !!pe && zE.length > 200);
if (pe) {
  const fe = pe(x => (x && x.et) || 0, RENT_ETAPAS);
  const proy = { towers: [{ levels: [{ aptos: [{ et: 4 }, { et: 2 }, { et: 0 }, { et: 1 }] }] }] };
  const r = fe(proy);
  ok('devuelve las 4 etapas', Array.isArray(r) && r.length === 4);
  ok('1RA: la tienen 3 de 4 aptos', Math.abs(r[0].pct - 0.75) < 0.0001 && r[0].hechos === 3);
  ok('2DA: 2 de 4', Math.abs(r[1].pct - 0.5) < 0.0001);
  ok('3RA: 1 de 4', Math.abs(r[2].pct - 0.25) < 0.0001);
  ok('4TA: 1 de 4', Math.abs(r[3].pct - 0.25) < 0.0001 && r[3].nombre === '4TA ETAPA');
}

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
