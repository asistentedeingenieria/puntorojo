/* v1059 — CUENTAS POR PAGAR EN GASTOS (Antonio, 29-jul): "En gastos NO veo el tema de
   cuentas por pagar… saber cuándo se paga y poder tener una cuenta regresiva de qué toca
   pagar y que se pueda marcar cuando ya se realizó el pago de esas OC de crédito."

   Lo que había (v1016): bloque por OBRA en renderGastos + tile POR PAGAR en el dashboard.
   Los agujeros: (1) una OC a crédito de BODEGA (destino '') era INVISIBLE en todas las
   vistas — el dashboard sumaba _cuentasPorPagar(p.id) solo por proyecto (21880) y el
   bloque por obra filtra por pid; (2) no había cuenta regresiva; (3) el pago registrado
   no repintaba el dashboard. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. la cuenta regresiva (pura) —');
const zCR = ex('function _cxpCuentaRegresiva(');
ok('existe', zCR.length > 200);
let cr = null;
try {
  const src = ex('function _fechaLatamADate(') + '\n' + zCR;
  cr = new Function(src + '\nreturn _cxpCuentaRegresiva;')();
} catch(e){ console.log('extract err', e.message); }
ok('extraíble', typeof cr === 'function');
if (cr) {
  const hoy = new Date('2026-07-29T12:00:00').getTime();
  ok('faltando 7 días', /FALTAN 7 D/i.test(cr({ vence: '05/08/2026', vencida: false }, hoy).txt));
  ok('vence mañana', /MAÑANA/i.test(cr({ vence: '30/07/2026', vencida: false }, hoy).txt));
  ok('vence HOY', /VENCE HOY/i.test(cr({ vence: '29/07/2026', vencida: false }, hoy).txt));
  ok('vencida hace 3 días', /VENCIDA HACE 3 D/i.test(cr({ vence: '26/07/2026', vencida: true }, hoy).txt));
  ok('sin fecha no inventa', /SIN FECHA/i.test(cr({ vence: '', vencida: false }, hoy).txt));
  const tono = cr({ vence: '26/07/2026', vencida: true }, hoy);
  ok('vencida en rojo', /B91C1C|DC2626|var\(--red\)/.test(tono.color));
  ok('lejana en calma', !/B91C1C|DC2626/.test(cr({ vence: '20/08/2026', vencida: false }, hoy).color));
}

console.log('\n— 2. el bloque de EMPRESA en el dashboard de GASTOS —');
const zB = ex('function _comprasCxpHTML(');
ok('existe _comprasCxpHTML', zB.length > 400);
ok("usa el derivado SIN filtro de obra (entra la OC de bodega)", /_cuentasPorPagar\(''\)/.test(zB));
ok('con cuenta regresiva', /_cxpCuentaRegresiva/.test(zB));
ok('se puede marcar pagada', /_registrarPagoProv/.test(zB));
ok('y abrir la OC', /_gastosIrAOc/.test(zB));
ok('dice de qué obra es cada cuenta (o BODEGA CENTRAL)', /BODEGA CENTRAL/.test(zB));
ok('gate de plata como el resto de GASTOS', /_puedeVerGastos\(\)/.test(zB) || /_comprasCxpHTML\(\)/.test(html.slice(html.indexOf('_comprasResumenGastos'), html.indexOf('_comprasResumenGastos') + 2200)));
ok('el dashboard lo pinta', /_comprasGastosDashHTML\(\) \+ _comprasCxpHTML\(\)/.test(html));

console.log('\n— 3. el tile POR PAGAR ya no ignora la bodega —');
const zD = ex('function _comprasGastosDashDatos(');
ok("suma con _cuentasPorPagar('') una sola vez", /_cuentasPorPagar\(''\)/.test(zD));
ok('y ya no acumula por proyecto (doble conteo)', !/cxpTotal \+= /.test(zD));

console.log('\n— 4. registrar pago refresca lo que estás viendo —');
const zP = ex('window._registrarPagoProv = async function');
ok('repinta el dashboard además del detalle', /_comprasResumenGastos/.test(zP));

console.log('\n— 5. el bloque por obra también cuenta los días —');
ok('renderGastos usa la cuenta regresiva', /_cxpCuentaRegresiva/.test(ex('function renderGastos(')));

console.log('\n— 6. v1062: la FORMA DE PAGO manda (Antonio: "¿por qué Q0 si ya hay OCs de bodega al crédito?") —');
/* Causa raíz: toda OC de BODEGA nacía con credito:0 a la fuerza (esBodega ? 0 : …, regla
   de cuando bodega solo compraba con tarjeta) y _cuentasPorPagar/_vencimientoOc filtraban
   por ese campo GUARDADO. La OC 5 de NOVEX decía CRÉDITO y no aparecía. Doctrina v1010:
   el vencimiento se CALCULA — los días salen del TEXTO de la forma de pago; el campo
   guardado queda de respaldo para órdenes viejas sin texto. */
const zDC = ex('function _ocDiasCredito(');
ok('existe el derivador', zDC.length > 100);
let diasDe = null;
try { diasDe = new Function(ex('function _diasCredito(') + '\nreturn (' + zDC + ')')(); } catch(e){}
ok('extraíble', typeof diasDe === 'function');
if (diasDe) {
  ok('CRÉDITO 15 DÍAS → 15 aunque el campo diga 0', diasDe({ formaPago: 'CRÉDITO 15 DÍAS', credito: 0 }) === 15);
  ok('TARJETA DE ABASTO → 0', diasDe({ formaPago: 'TARJETA DE ABASTO', credito: 0 }) === 0);
  ok('CONTADO con campo viejo sucio → 0 (el texto manda)', diasDe({ formaPago: 'CONTADO', credito: 30 }) === 0);
  ok('orden vieja SIN texto → cae al campo guardado', diasDe({ formaPago: '', credito: 30 }) === 30);
  ok('COMPRA ANTICIPADA → 0', diasDe({ formaPago: 'COMPRA ANTICIPADA' }) === 0);
}
ok('_cuentasPorPagar filtra con el derivador', /_ocDiasCredito\(o\)/.test(ex('function _cuentasPorPagar(')));
ok('_vencimientoOc también', /_ocDiasCredito\(/.test(ex('function _vencimientoOc(')));
ok('la OC de bodega ya NO nace con credito 0 forzado', !/credito: esBodega \? 0 :/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
