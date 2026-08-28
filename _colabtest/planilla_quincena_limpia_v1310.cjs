/* v1310 (Antonio, 28-ago): la LIQUIDACIÓN GENERADA de la quincena pasada seguía saliendo
   en VDC. Sonar: los 12 pagos sueltos de Nelson (12/8, Q8,026.02) son GEMELOS EXACTOS de
   los 12 ya pagados en pln-4826me9b (14/8, archivada) — armarlos = pagar DOBLE. Causa:
   el pool de pagos sueltos es acumulativo SIN corte de quincena y nada detecta gemelos
   (familia v1252/VLA-47: generación repetida por sync + union-merge que revive).
   FIX: (a) pago suelto de quincena ANTERIOR o GEMELO de uno ya en planilla se APARTA —
   no sale en la barra ni cuenta en DISPONIBLES; (b) sección colapsada APARTADOS donde se
   ven con su motivo y se pueden eliminar (✕ con lápida v891). NADA se borra solo. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* 1) helpers PUROS — extraer y evaluar */
const mKey = html.match(/function _pagoGemeloKey\(pg\)\{[\s\S]*?\n  \}/);
const mMot = html.match(/function _pagoSueltoMotivo\(pg, selladasKeys, qHoy, qDe\)\{[\s\S]*?\n  \}/);
ok('helpers existen', !!mKey && !!mMot);
if (mKey && mMot) {
  const f = new Function(mKey[0] + ';' + mMot[0] + '; return { k: _pagoGemeloKey, m: _pagoSueltoMotivo };')();
  const a = { colaborador: 'NELSON B', aptoName: '1301', stageIdx: 0, neto: 960.25, ts: Date.now() };
  ok('gemelos comparten llave', f.k(a) === f.k({ ...a, ts: 123, id: 'otro' }));
  ok('etapa o monto distinto = llave distinta', f.k(a) !== f.k({ ...a, stageIdx: 1 }) && f.k(a) !== f.k({ ...a, neto: 960.26 }));
  const qDe = ts => (ts > 1000 ? 'HOY' : 'VIEJA');
  ok('GEMELO manda sobre todo', f.m(a, new Set([f.k(a)]), 'HOY', qDe) === 'GEMELO');
  ok('quincena anterior se aparta', f.m({ ...a, ts: 5 }, new Set(), 'HOY', qDe) === 'QUINCENA_ANTERIOR');
  ok('pago fresco y sin gemelo pasa', f.m(a, new Set(), 'HOY', qDe) === '');
} else { fail += 5; }

/* 2) los dos filtros ganadores excluyen apartados */
ok('pagosPlanilla con modo apartados', /function pagosPlanilla\(p, soloApartados\)/.test(html));
ok('pagosPlanilla filtra por motivo', /soloApartados \? !!_m : !_m/.test(html));
const disp = html.slice(html.indexOf('function _pagosDisponiblesParaArmar'), html.indexOf('function _calcTotalesPlanilla'));
ok('_pagosDisponiblesParaArmar excluye apartados', disp.includes('_pagosApartadoCtx') && disp.includes('_pagoSueltoMotivo'));

/* 3) sección APARTADOS en el render ganador (con eliminación con lápida) */
const rend = html.slice(html.indexOf("window.renderPlanillaPagosList = function(canAuth){\n    const p = activeProj();"), html.indexOf('function excelTableRows'));
ok('render lista los apartados aunque no haya pagos frescos', rend.includes('pagosPlanilla(p, true)') && rend.includes("SIN PAGOS GENERADOS</div>' + apartHtml"));
ok('sección con motivo visible', rend.includes('QUINCENA') && rend.includes('DUPLICADO'));
ok('cada apartado se puede eliminar (lápida v891)', rend.includes("eliminarPagoPlanillaGenerada"));

/* 4) contexto compartido entre los dos closures via window */
ok('ctx exportado', html.includes('window._pagosApartadoCtx = _pagosApartadoCtx') && html.includes('window._pagoSueltoMotivo = _pagoSueltoMotivo'));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
