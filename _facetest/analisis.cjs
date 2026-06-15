/* TDD: _analizarCaras (PURA) decide QUÉ caras conviene re-tomar.
   Recalibrado v676 para poblaciones con rasgos parecidos: umbrales MÁS estrictos para no marcar
   a casi todos. Separación (dist mín. a OTRA persona): <0.38 = se confunde (crítico), 0.38–0.46 =
   se parece (recomendado), >=0.46 = OK. 1 toma / intraMax>0.60 = crítico. */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/function _analizarCaras\([\s\S]*?\n\}/);
if (!m) { console.log('NO _analizarCaras FOUND'); process.exit(2); }
const fn = new Function(m[0] + '\nreturn _analizarCaras;')();

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? pass++ : (fail++, console.log('FAIL ' + name));
const byId = (arr, id) => arr.find(x => x.id === id) || {};
const has = (r, txt) => (r.motivos || []).some(x => x.toUpperCase().includes(txt));
const TRES = (c) => [[c, 0, 0], [c + 0.03, 0, 0], [c, 0.03, 0]];
const DFAR = { id: 'D', nombre: 'DORA', descs: TRES(50) };

// S1: bien separadas → ok
{
  const r = fn([{ id: 'A', nombre: 'ANA', descs: TRES(0) }, { id: 'B', nombre: 'BETO', descs: TRES(9) }]);
  ok('S1 bien separadas => ok', byId(r, 'A').nivel === 'ok' && byId(r, 'B').nivel === 'ok');
}
// S2: MUY cercanas (sep ~0.19) → CRÍTICO "se confunde"
{
  const r = fn([{ id: 'A', nombre: 'ANA', descs: TRES(0) }, { id: 'B', nombre: 'BORIS', descs: TRES(0.22) }]);
  ok('S2 muy cercanas => critico', byId(r, 'A').nivel === 'critico');
  ok('S2 motivo confunde', has(byId(r, 'A'), 'CONFUNDE'));
  ok('S2 con quien', !!byId(r, 'A').colisionaCon);
}
// S3: cercanas (sep ~0.40) → RECOMENDADO "se parece"
{
  const r = fn([{ id: 'G', nombre: 'GINA', descs: TRES(0) }, { id: 'H', nombre: 'HUGO', descs: TRES(0.43) }]);
  ok('S3 cercanas => recomendado', byId(r, 'G').nivel === 'recomendado');
  ok('S3 motivo se parece', has(byId(r, 'G'), 'PARECE'));
}
// S3b: separación MODERADA (sep ~0.49) → OK (la recalibración: NO sobre-marcar)
{
  const r = fn([{ id: 'M', nombre: 'MIA', descs: TRES(0) }, { id: 'N', nombre: 'NICO', descs: TRES(0.52) }]);
  ok('S3b moderadas => ok (no sobre-marca)', byId(r, 'M').nivel === 'ok' && byId(r, 'N').nivel === 'ok');
}
// S4: 1 sola toma → CRÍTICO
{
  const r = fn([{ id: 'C', nombre: 'CARO', descs: [[20, 0, 0]] }, DFAR]);
  ok('S4 una toma => critico', byId(r, 'C').nivel === 'critico');
  ok('S4 motivo 1 toma', has(byId(r, 'C'), '1 TOMA'));
}
// S5: 2 tomas → RECOMENDADO
{
  const r = fn([{ id: 'E', nombre: 'ELO', descs: [[30, 0, 0], [30.03, 0, 0]] }, DFAR]);
  ok('S5 dos tomas => recomendado', byId(r, 'E').nivel === 'recomendado');
}
// S6: tomas inconsistentes (intraMax > 0.6) → CRÍTICO
{
  const r = fn([{ id: 'F', nombre: 'FELI', descs: [[40, 0, 0], [41, 0, 0]] }, DFAR]);
  ok('S6 inconsistentes => critico', byId(r, 'F').nivel === 'critico');
  ok('S6 motivo inconsistente', has(byId(r, 'F'), 'INCONSIST'));
}

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
