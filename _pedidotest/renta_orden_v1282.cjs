/* v1282 · ORDEN DE RENTA — FASES B y C (generación + control de devolución + hoja).
   B: al GENERAR, lo marcado SE RENTA sale de su grupo y nace en su PROPIA orden serie
   RENTA. Se pregunta UNA vez cuántos DÍAS y desde cuándo; cada renglón guarda
   tarifa/periodo/periodos y su precio EFECTIVO = tarifa × periodos COMPLETOS (ceil:
   15 días con tarifa semanal = 3 semanas) — así total, gasto, CxP y hoja cuadran
   solos con qty × precio, sin tocar ningún consumidor.
   C: la tarjeta muestra RENTA · VENCE dd/mm (rojo si venció) y el botón EQUIPO
   DEVUELTO ✓ (AUTORIZADA, compras/admin) que sella la devolución; la hoja y el QR
   titulan ORDEN DE RENTA con su ventana. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* ── 1. cálculo PURO ── */
const srcCalc = ex('function _rentaCalcItems(');
let f = null; try { f = new Function(srcCalc + '; return _rentaCalcItems;')(); } catch(e){}
ok('_rentaCalcItems evalúa', typeof f === 'function');
if (f) {
  const r1 = f([{ name: 'ANDAMIO', qty: 4, tarifa: 60, periodo: 'DIA' }], 15)[0];
  ok('tarifa diaria × 15 días → 15 periodos, precio Q900', r1.periodos === 15 && r1.precio === 900);
  const r2 = f([{ name: 'RODO', qty: 2, tarifa: 100, periodo: 'SEMANA' }], 15)[0];
  ok('tarifa semanal con 15 días → 3 SEMANAS completas (ceil)', r2.periodos === 3 && r2.precio === 300);
  const r3 = f([{ name: 'CAMA', qty: 1, tarifa: 900, periodo: 'MES' }], 15)[0];
  ok('tarifa mensual con 15 días → 1 MES completo', r3.periodos === 1 && r3.precio === 900);
  const r4 = f([{ name: 'CAMA', qty: 1, tarifa: 900, periodo: 'MES' }], 45)[0];
  ok('45 días con tarifa mensual → 2 meses', r4.periodos === 2 && r4.precio === 1800);
  const r5 = f([{ name: 'X', qty: 1, tarifa: 10 }], 3)[0];
  ok('sin periodo → DÍA por defecto', r5.periodos === 3 && r5.precio === 30);
}

/* ── 2. detección del renglón rentable ── */
const zDet = ex('function _ocItemRentaPeriodo(');
ok('_ocItemRentaPeriodo: busca el producto del catálogo del proveedor y respeta la variante', /matchKeyProducto/.test(zDet) && /_prodRentaInfo/.test(zDet) && /variante/.test(zDet));
ok('bodega/pre-pago/trasiego jamás son renta', /_bodega/.test(zDet) && /_dpp:/.test(zDet) && /_tras:/.test(zDet));

/* ── 3. la generación ── */
const iGen = html.indexOf('async function generarOrdenCompra(');
const zGen = html.slice(iGen, iGen + 30000);
ok('pregunta los DÍAS una sola vez (con inicio) antes de generar', /CUÁNTOS DÍAS SE RENTA/.test(zGen) && /_rentaForm/.test(zGen));
ok('sin días válidos NO se genera', /LA ORDEN DE RENTA NO SE GENERÓ/.test(zGen));
ok('el grupo se parte: lo rentable sale con splice', /_rentaItems\.forEach\(it => \{ const _ix = items\.indexOf\(it\); if \(_ix >= 0\) items\.splice\(_ix, 1\); \}\)/.test(zGen));
ok('la orden de renta nace serie RENTA con su ventana', /esRenta: true, serie: 'RENTA', rentaDias/.test(zGen) && /rentaInicio/.test(zGen) && /rentaFin/.test(zGen));
ok('folio propio de la serie RENTA', /_usadosSerie\['RENTA'\]/.test(zGen));
ok('si el grupo quedó vacío (todo era renta) no nace una OC vacía', /if \(!items\.length\) return;/.test(zGen));
ok('la orden de renta nace sellada (union-merge v972)', /ocR\._ts = ocR\.ts/.test(zGen));

/* ── 4. tarjeta: VENCE + EQUIPO DEVUELTO ── */
const iFila = html.indexOf('const _filaOc = oc =>');
const zFila = html.slice(iFila, iFila + 22000);
ok('chip RENTA con VENCE (rojo si venció) y EQUIPO DEVUELTO', /RENTA \$\{oc\.rentaDias/.test(zFila) && /VENCE/.test(zFila) && /EQUIPO DEVUELTO/.test(zFila) && /rentaDevuelta/.test(zFila));
const zDev = ex('window._rentaMarcarDevuelta = async function');
ok('_rentaMarcarDevuelta: re-lee tras el await (v940) y sella', /_bodegaFindOc/.test(zDev) && /rentaDevuelta/.test(zDev) && /_ts = Date\.now\(\)/.test(zDev));

/* ── 5. hoja y QR titulan ORDEN DE RENTA ── */
ok('la hoja titula ORDEN DE RENTA', /esRenta \? 'ORDEN DE RENTA'/.test(html));
const _mTit = (html.match(/esRenta \? 'ORDEN DE RENTA'/g) || []).length;
ok('el banner del QR (copia sellada) también', _mTit >= 2);
ok('la hoja muestra la ventana de renta (DEL x AL y · N DÍAS)', /RENTA DEL/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
