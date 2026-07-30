/* v1069 — TOPE DE Q10,000 POR ORDEN DE COMPRA (pedido de Antonio, 30-jul):
   "las ordenes de compra NO sobrepasen los Q10,000... si alguna OC de algun proveedor
   sobrepasa ese monto quiero que automaticamente se divida y se generen mas ordenes de
   compra para el mismo proveedor".
   Decisiones: aplica SOLO a compras reales (serie OC) — no a despachos, DPP, trasiegos,
   OP ni COMPRA ANTICIPADA (la madre de SISTEGUA es de Q325,000 a propósito); el tope es
   sobre el total CON IVA (los precios ya lo traen, v922); las líneas grandes se parten
   por cantidades (enteras si la cantidad original era entera); una UNIDAD > Q10k no se
   puede partir — sale sola con aviso. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. el repartidor puro: _ocLotesPorTope —');
const zL = ex('function _ocLotesPorTope(');
let lotesDe = null;
try { lotesDe = new Function('return (' + zL + ')')(); } catch(e){}
ok('existe como función pura (sin globals — sandbox-friendly)', !!lotesDe && zL.length > 300);
if (lotesDe) {
  const suma = lote => lote.reduce((a, x) => a + x.qty * x.precio, 0);
  /* bajo el tope: UN solo lote, intacto */
  const r0 = lotesDe([{ name: 'A', qty: 10, precio: 65 }], 10000);
  ok('bajo el tope no divide', r0.lotes.length === 1 && !r0.dividido);
  /* EL CASO DE ANTONIO: 500 tablas × Q65 = Q32,500 → tandas de 153 (Q9,945) */
  const r1 = lotesDe([{ name: 'TABLA', qty: 500, precio: 65 }], 10000);
  ok('500×65 se parte en 4 órdenes', r1.lotes.length === 4 && r1.dividido);
  ok('ninguna tanda pasa el tope', r1.lotes.every(l => suma(l) <= 10000.001));
  ok('las cantidades son ENTERAS y suman 500', r1.lotes.every(l => l.every(x => Math.round(x.qty) === x.qty)) && r1.lotes.reduce((a, l) => a + l.reduce((b, x) => b + x.qty, 0), 0) === 500);
  /* varias líneas: se agrupan sin pasar el tope */
  const r2 = lotesDe([{ name: 'A', qty: 100, precio: 65 }, { name: 'B', qty: 80, precio: 60 }, { name: 'C', qty: 30, precio: 12 }], 10000);
  ok('líneas se agrupan sin pasar el tope', r2.lotes.every(l => suma(l) <= 10000.001) && r2.lotes.reduce((a, l) => a + l.length, 0) >= 3);
  /* cantidad decimal: se parte en decimales, no se inventan enteros */
  const r3 = lotesDe([{ name: 'M', qty: 250.5, precio: 80 }], 10000);
  ok('cantidad decimal se parte y suma igual', Math.abs(r3.lotes.reduce((a, l) => a + l.reduce((b, x) => b + x.qty, 0), 0) - 250.5) < 0.001 && r3.lotes.every(l => suma(l) <= 10000.001));
  /* una UNIDAD que sola pasa el tope: no hay forma de partirla */
  const r4 = lotesDe([{ name: 'EQUIPO', qty: 1, precio: 15000 }], 10000);
  ok('unidad indivisible va sola y se marca', r4.lotes.length === 1 && r4.indivisible);
  const r5 = lotesDe([{ name: 'EQUIPO', qty: 2, precio: 15000 }, { name: 'A', qty: 10, precio: 65 }], 10000);
  ok('dos unidades caras: una por orden + el resto aparte', r5.lotes.length >= 2 && r5.indivisible && Math.abs(r5.lotes.reduce((a, l) => a + suma(l), 0) - (30000 + 650)) < 0.01);
} else { ['bajo tope','4 órdenes','tanda tope','enteras','agrupan','decimal','indivisible','dos caras'].forEach(n => ok(n, false)); }

console.log('\n— 2. generarOrdenCompra: la división corre al generar —');
const zGen = ex('async function generarOrdenCompra(');
ok('bloque v1069 presente, DESPUÉS del lazo (ventanas v985/v993 intactas)', /_ocLotesPorTope\(/.test(zGen) && zGen.indexOf('_ocLotesPorTope') > zGen.indexOf('providerIds.forEach((provId, idx)'));
ok('solo serie OC: fuera despachos, producción, prepago y trasiegos', /_ocSerieDe\(_oc0\) !== 'OC'/.test(zGen) || /_ocSerieDe\(.{0,12}\) !== 'OC'/.test(zGen));
ok('la COMPRA ANTICIPADA no se divide (la madre es grande a propósito)', /COMPRA\\s\*ANTICIPADA[\s\S]{0,80}continue/.test(zGen));
ok('cada orden nueva con su folio correlativo', /_primerNumeroLibre\(_usadosSerie\['OC'\]/.test(zGen));
ok('totales recalculados con IVA incluido (v922)', /_ocTotalesIvaIncluido\(_loteI\)|_ocTotalesIvaIncluido\(lote/.test(zGen));
ok('la original se reemplaza en created y en el contenedor (nunca se duplica)', /created\.splice\(/.test(zGen) && /ordenes\.splice\(/.test(zGen));
ok('sellos _ts en las divididas', /ts: _tL, _ts: _tL/.test(zGen));
ok('avisa cuánto se dividió', /SE DIVIDI/.test(zGen));
ok('y avisa la unidad indivisible', /NO SE PUEDE PARTIR|INDIVISIBLE/i.test(zGen));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
