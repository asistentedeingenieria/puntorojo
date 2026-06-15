/* TDD: _analizarCaras (PURA) decide QUÉ caras conviene re-tomar, según cómo decide el kiosko.
   Por persona calcula: separación (distancia mínima a OTRA persona registrada), consistencia
   interna (distancia máxima entre sus propias tomas) y nº de tomas. Devuelve nivel + motivos.
   Umbrales atados a los del kiosko (auto<0.44, margen 0.10): sep<0.40 = se confunde (crítico),
   0.40–0.52 = se parece (recomendado); 1 toma = crítico; 2 = recomendado; intraMax>0.60 = crítico. */
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

const TRES = (c) => [[c, 0, 0], [c + 0.03, 0, 0], [c, 0.03, 0]]; // 3 tomas consistentes centradas en c
const DFAR = { id: 'D', nombre: 'DORA', descs: TRES(50) };

// S1: dos personas bien separadas, 3 tomas consistentes → ambas OK
{
  const r = fn([{ id: 'A', nombre: 'ANA', descs: TRES(0) }, { id: 'B', nombre: 'BETO', descs: TRES(9) }]);
  ok('S1 bien separadas => ok', byId(r, 'A').nivel === 'ok' && byId(r, 'B').nivel === 'ok');
}
// S2: dos personas MUY cercanas (sep ~0.2) → CRÍTICO "se confunde", con quién
{
  const r = fn([{ id: 'A', nombre: 'ANA', descs: TRES(0) }, { id: 'B', nombre: 'BORIS', descs: TRES(0.22) }]);
  ok('S2 muy cercanas => critico', byId(r, 'A').nivel === 'critico' && byId(r, 'B').nivel === 'critico');
  ok('S2 motivo confunde', has(byId(r, 'A'), 'CONFUNDE'));
  ok('S2 dice con quien', !!byId(r, 'A').colisionaCon);
}
// S3: parecidas (sep ~0.45) → RECOMENDADO "se parece"
{
  const r = fn([{ id: 'G', nombre: 'GINA', descs: TRES(0) }, { id: 'H', nombre: 'HUGO', descs: TRES(0.45) }]);
  ok('S3 parecidas => recomendado', byId(r, 'G').nivel === 'recomendado');
  ok('S3 motivo se parece', has(byId(r, 'G'), 'PARECE'));
}
// S4: 1 sola toma → CRÍTICO
{
  const r = fn([{ id: 'C', nombre: 'CARO', descs: [[20, 0, 0]] }, DFAR]);
  ok('S4 una toma => critico', byId(r, 'C').nivel === 'critico');
  ok('S4 motivo 1 toma', has(byId(r, 'C'), '1 TOMA'));
}
// S5: 2 tomas (consistentes, separada) → RECOMENDADO
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
