/* v868: AMORTIZADO ACUMULADO por proyecto (COBRO) + Dashboard ejecutivo.
   Criterio del user: SOLO estimaciones PAGADAS (lo ya descontado del anticipo). El helper
   _amortPagadaProyecto(p) suma rowValues(r,cfg).amCI de las filas sc==='PAGADO' — rowValues ya
   excluye el ANTICIPO (isAnticipo) y las SIN AMORT. (noAmort). Referencia: anticipo total =
   contratado neto × anticipoPct. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── funcional: cadena REAL cobroConfig + rowValues + _amortPagadaProyecto ──
const cfgSrc = extractFn('cobroConfig'), rvSrc = extractFn('rowValues'), apSrc = extractFn('_amortPagadaProyecto');
ok('_amortPagadaProyecto existe', !!apSrc);
if (cfgSrc && rvSrc && apSrc) {
  const fn = new Function(cfgSrc + '\n' + rvSrc + '\n' + apSrc + '\nreturn _amortPagadaProyecto;')();
  const p = { amortPct: 0.25, anticipoPct: 0.25, cobro: { rows: [
    { d:'ANTICIPO', vp_ci: 250000, isAnticipo: true, sc: 'PAGADO' },   // anticipo NO amortiza
    { d:'EST 1', vp_ci: 100000, sc: 'PAGADO' },                        // 25,000
    { d:'EST 2', vp_ci: 200000, sc: 'PAGADO' },                        // 50,000
    { d:'EST 3', vp_ci: 400000, sc: 'EMITIDA' },                       // no pagada → no cuenta
    { d:'EST 4', vp_ci: 100000, sc: 'PAGADO', noAmort: true },         // SIN AMORT. → 0
    null                                                                // fila rota no revienta
  ] } };
  ok('suma solo amort de PAGADAS (75,000)', Math.abs(fn(p) - 75000) < 0.01);
  ok('proyecto sin cobro → 0', fn({}) === 0);
  ok('null → 0', fn(null) === 0);
  const p30 = { amortPct: 0.30, cobro: { rows: [ { vp_ci: 100000, sc: 'PAGADO' } ] } };
  ok('respeta amortPct del proyecto (30% → 30,000)', Math.abs(fn(p30) - 30000) < 0.01);
}

// ── estructural: KPI en COBRO ──
ok('COBRO: tarjeta Amortizado acumulado', /cobroKpis[\s\S]{0,2400}Amortizado acumulado/.test(html));
ok('COBRO: subtítulo referencia el anticipo', /Amortizado acumulado[\s\S]{0,300}DEL ANTICIPO/.test(html));

// ── estructural: Dashboard ejecutivo ──
ok('Dashboard: tarjeta Amortizado acumulado en dashKpis', /dashKpis[\s\S]{0,2600}Amortizado acumulado/.test(html));
ok('Dashboard: acumula _amortPagadaProyecto en el loop global', /totalAmortizado\s*\+=\s*_amortPagadaProyecto\(p\)/.test(html));
ok('Dashboard: fila por proyecto muestra AMORTIZADO', /proj-row-stats[\s\S]{0,900}AMORTIZADO/.test(html));

// v871: la tarjeta AMORTIZADO va JUNTO a PENDIENTE DE PAGO (antes de Avance físico promedio)
const iPend = html.indexOf('Pendiente de pago</div>');
const iAmort = html.indexOf('Amortizado acumulado</div>', iPend);
const iAvance = html.indexOf('Avance físico promedio</div>');
ok('Dashboard: orden Pendiente → Amortizado → Avance físico', iPend >= 0 && iAmort > iPend && iAvance > iAmort);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
