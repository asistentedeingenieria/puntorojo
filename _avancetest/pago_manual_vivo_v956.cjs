/* v956 (reporte de Antonio 22-jul: "en LIQUIDACIÓN PROVEEDORES el avance por apartamento
   tampoco se actualiza" — el apto 1202 con etapas 1-4 PAGADAS 100% mostraba 1 cuadrito).
   CAUSA: la vista de cuadritos usa `a.pagoManual` (override que dejó el importador de
   pagos v703-v733) con PRIORIDAD ABSOLUTA sobre los pagos reales (paidPct5), y NADA lo
   actualiza al pagar por el flujo normal — cuadritos y % de nivel/torre congelados.
   FIX: _pagoPcts5(p, apto) = por etapa, el MAYOR entre lo importado y lo pagado real
   (no retrocede, no pierde el histórico importado). Las 4 lecturas (cuadritos, KPIs,
   % torre, % nivel) usan el helper. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── helper: fusión por etapa ──
const src = extractFn('_pagoPcts5');
ok('_pagoPcts5 existe', !!src);
let fn = null;
try { fn = new Function('getEtapasP', 'paidPct5', 'return (' + src + ')')(
  () => [1,2,3,4,5],
  (p, aid, i) => (p._vivo || [])[i] || 0
); } catch(e){}
ok('_pagoPcts5 evaluable', typeof fn === 'function');
if (typeof fn === 'function') {
  // caso 1202: importado [100,0,0,0,0] + pagos reales et1-4 al 100 => fusión
  let r = fn({ _vivo: [100,100,100,100,0] }, { id:'a', pagoManual: [100,0,0,0,0] });
  ok('los pagos reales GANAN al override viejo', JSON.stringify(r) === JSON.stringify([100,100,100,100,0]));
  // histórico importado por delante de los pagos => se conserva
  r = fn({ _vivo: [100,0,0,0,0] }, { id:'a', pagoManual: [100,100,50,0,0] });
  ok('el histórico importado no se pierde', JSON.stringify(r) === JSON.stringify([100,100,50,0,0]));
  // sin override => pagos reales tal cual
  r = fn({ _vivo: [100,50,0,0,0] }, { id:'a' });
  ok('sin override usa los pagos reales', JSON.stringify(r) === JSON.stringify([100,50,0,0,0]));
}

// ── las 4 lecturas de la vista ACTIVA usan el helper (y ya no el ternario crudo) ──
const iZona = html.indexOf('function renderPlanillaAptoSquares5(p, apto)');
const zona = iZona > -1 ? html.slice(iZona, iZona + 7000) : '';
ok('zona activa localizada', zona.length > 3000);
ok('las 4 lecturas usan _pagoPcts5', (zona.match(/_pagoPcts5\(/g) || []).length >= 4);
ok('sin ternario crudo de pagoManual en la vista activa', !/\?\s*a(pto)?\.pagoManual/.test(zona));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
