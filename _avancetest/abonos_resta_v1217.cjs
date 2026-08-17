/* v1217 — LA RESTA DE ABONOS DE VLA (el pendiente crítico de planillas-vla-abonos).

   VLA arrancó pagando ABONOS sin precios de etapa (18 pagos esAbono:true, targetPct:0,
   ingresados por comando el 14-ago). El plan de Antonio: "cuando se ponga el valor total
   de la etapa en MODELOS Y COSTOS ya la app calcule cuánto se le puede pagar después con
   base a lo que hemos ido agregando". Dos defectos que había que cerrar ANTES de que
   cargue precios:

   1. BLOQUEO: paidPct5/_paidPct hacen Math.max(targetPct || 100) — el targetPct:0 del
      abono es falsy ⇒ contaba como 100% y la etapa aparecía PAGADA COMPLETA (la app se
      negaría a pagar el resto: "ya pagada al 100%").
   2. DOBLE PAGO: al pagar por % el bruto = total × pct sin descontar lo ya abonado.

   FIX: los esAbono no cuentan para el %; y al crear un pago por % se descuenta del NETO
   el pool de abonos del MISMO apto+etapa (Σ bruto esAbono − Σ abonoAplicado ya usado),
   registrando `abonoAplicado` en el pago (derivado, self-heal si se elimina un pago). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— 1. los abonos NO cuentan como % pagado —');
const zPP = ex(code, 'function paidPct5(');
ok('paidPct5 excluye esAbono', /!x\.esAbono/.test(zPP));
try {
  const f = new Function('return (' + zPP + ')')();
  const p = { planilla: { pagos: [
    { tipo:'ETAPA', aptoId:'a1', stageIdx:0, esAbono:true, esExtra:true, targetPct:0, pctDelta:0, bruto:600 },
    { tipo:'ETAPA', aptoId:'a1', stageIdx:0, targetPct:40 },
  ] } };
  ok('EL CASO VLA: abono targetPct 0 ya no vale 100% (da 40, el pago real)', f(p,'a1',0) === 40);
  ok('solo abonos ⇒ 0% pagado (la etapa sigue pagable)', f({ planilla:{ pagos:[{ tipo:'ETAPA', aptoId:'a1', stageIdx:0, esAbono:true, targetPct:0 }] } },'a1',0) === 0);
} catch(e){ ok('paidPct5 evalúa', false); }
ok('el _paidPct del modal de agregar pagos también excluye esAbono',
  /x\.tipo==='ETAPA' && !x\.esAbono && x\.aptoId===aptoId/.test(code));

console.log('\n— 2. el pool de abonos del apto+etapa (derivado) —');
const zPool = ex(code, 'window._abonoPendienteAptoEtapa = function(');
ok('existe', !!zPool);
try {
  const fPool = new Function('window', 'return (' + zPool + ')')({});
  const p2 = { planilla: { pagos: [
    { tipo:'ETAPA', aptoId:'a1', stageIdx:0, esAbono:true, bruto:600 },
    { tipo:'ETAPA', aptoId:'a1', stageIdx:0, esAbono:true, bruto:200 },
    { tipo:'ETAPA', aptoId:'a1', stageIdx:0, targetPct:40, abonoAplicado:300 },
    { tipo:'ETAPA', aptoId:'a1', stageIdx:1, esAbono:true, bruto:999 },
    { tipo:'ETAPA', aptoId:'a2', stageIdx:0, esAbono:true, bruto:999 },
  ] } };
  ok('suma abonos y resta lo ya aplicado (600+200−300=500), SOLO del mismo apto+etapa', fPool(p2,'a1',0) === 500);
  ok('sin abonos da 0', fPool({ planilla:{ pagos:[] } },'a1',0) === 0);
} catch(e){ ok('pool evalúa', false); }
const zAp = ex(code, 'window._abonoAplicarANeto = function(');
ok('el aplicador existe', !!zAp);
try {
  const fPool2 = () => 500;
  const fAp = new Function('window', 'return (' + zAp + ')')({ _abonoPendienteAptoEtapa: fPool2 });
  const r1 = fAp({}, 'a1', 0, 900);
  ok('pool 500 sobre neto 900 ⇒ descuenta 500, neto 400', r1.abonoAplicado === 500 && r1.neto === 400);
  const r2 = fAp({}, 'a1', 0, 300);
  ok('pool 500 sobre neto 300 ⇒ descuenta 300, neto 0 (nunca negativo)', r2.abonoAplicado === 300 && r2.neto === 0);
} catch(e){ ok('aplicador evalúa', false); }

console.log('\n— 3. los TRES creadores de pagos descuentan y registran abonoAplicado —');
ok('pagarEtapaPlanilla (la definición viva) aplica la resta',
  /_abonoAplicarANeto\(p, aid, stageIdx/.test(ex(code.slice(code.lastIndexOf('window.pagarEtapaPlanilla = async function')), 'window.pagarEtapaPlanilla = async function')));
ok('_crearPagoEtapaPlanilla (vía solicitud v883) aplica la resta',
  /_abonoAplicarANeto/.test(ex(code, 'function _crearPagoEtapaPlanilla(')));
ok('el modal de agregar pagos (v328) aplica la resta', /_abonoAplicarANeto\(p, pc\.aptoId, pc\.etapaIdx/.test(code));
ok('los pagos guardan abonoAplicado (>=3 sitios)', (code.match(/abonoAplicado/g) || []).length >= 8);

console.log('\n— 4. lo descontado SE VE (previews y confirmación) —');
ok('la confirmación de pago muestra el abono previo descontado', /Abono previo/.test(ex(code, 'window._buildGenerarPagoBodyHTML = function(')));
ok('el preview del modal v328 lo muestra', /ABONO PREVIO/.test(code));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
