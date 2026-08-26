/* v1287 (compras, 26-ago: "ya generó la orden de renta pero ahora cuando le doy detalle
   no me despliega el botón de generar orden y tengo que hacer la de los andamios"):
   la ORDEN DE RENTA nacida del bloque de HERRAMIENTAS (v1283, rentaDeHerramientas:true)
   queda ligada al pedido con pedidoId — y el candado v927 ("un pedido con sus OC
   generadas no genera más") la contaba como si cubriera los MATERIALES. Resultado: los
   rodos rentados TAPABAN la generación de la orden de andamios/tablón.
   FIX: helper _ocsDeMateriales(pdId) — las rentas de herramientas NO cuentan para el
   candado — aplicado en los 3 gates de generación (botón del detalle, openOrdenCompra,
   re-check de generarOrdenCompra tras el await v940).
   + pedido de Antonio: la leyenda azul de la hoja de renta queda corta
   ("RENTA DEL x AL y · N DÍAS", sin el sermón de la tarifa). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* ── 1. el helper, FUNCIONAL ── */
const zH = ex('function _ocsDeMateriales(');
ok('_ocsDeMateriales existe', zH.length > 40);
if (zH.length > 40) {
  try {
    const f = new Function('getPedidoOrdenes', zH + '\nreturn _ocsDeMateriales("pd1");');
    const ocs = [
      { id: 'a', pedidoId: 'pd1', esRenta: true, rentaDeHerramientas: true },
      { id: 'b', pedidoId: 'pd1', esRenta: true },
      { id: 'c', pedidoId: 'pd1' }
    ];
    const r = f(function(){ return ocs; });
    ok('la renta DE HERRAMIENTAS no cuenta', r.length === 2 && !r.some(o => o.id === 'a'));
    ok('la renta normal (de materiales) SÍ cuenta', r.some(o => o.id === 'b') && r.some(o => o.id === 'c'));
  } catch(e){ ok('helper evaluable', false); console.log('  ' + e.message); }
}

/* ── 2. los 3 gates de generación lo usan ── */
const iBtn = html.indexOf("document.getElementById('pedDetalleOCBtn')");
ok('gate del botón GENERAR en el detalle', /_ocsDeMateriales/.test(html.slice(iBtn - 600, iBtn + 300)));
const zOpen = ex('async function openOrdenCompra(');
ok('candado v927 de openOrdenCompra', /_ocsDeMateriales\(pd\.id\)\.length > 0 && !_editando\b/.test(zOpen));
ok('la exención de EDICIÓN v1144 sigue mirando TODAS las órdenes', /window\._ocEditandoId && existingOcs\.some/.test(zOpen));
const zGen = ex('async function generarOrdenCompra(');
ok('re-check tras el await (v940) también', /_ocsDeMateriales\(pd\.id\)\.length > 0 && !_editandoG/.test(zGen));

/* ── 3. la leyenda azul de la hoja de renta, corta ── */
const iLey = html.indexOf('RENTA DEL ${oc.rentaInicio');
const zLey = html.slice(iLey, iLey + 220);
ok('dice RENTA DEL x AL y · N DÍAS', /DÍAS<\/div>/.test(zLey));
ok('sin el sermón de la tarifa', !/MULTIPLICADA/.test(zLey) && !/TARIFA/.test(zLey));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
