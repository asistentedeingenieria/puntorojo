/* v1066 — TRASIEGOS DE MATERIAL OBRA→OBRA (Antonio, 30-jul): "llevar un registro de
   movimientos de materiales que se hacen a veces de una obra a otra obra".
   Decisiones de Antonio: (1) SÍ mueve el GASTO entre obras, (2) SOLO compras puede
   registrarlos, (3) queda DIRECTO al registrarse (sin autorización).

   Diseño: orden serie TRAS en state.bodegaMat.ordenes (union-merge v972 gratis — sin
   cambio de sync) con esDespacho:true (hereda exclusiones de POR RECIBIR y cuentas por
   pagar; nace AUTORIZADA así que jamás pasa por autorizarOrden ni toca el ledger) +
   esTrasiego:true + origen/destino. El GASTO es 100%% derivado: _gastosDeProyecto SUMA el
   monto a la obra destino y lo RESTA a la origen (_trasSigno) — el total de empresa
   queda neto. Precio congelado al registrar: entrada a bodega → catálogo. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. el signo del gasto (puro) —');
const zS = ex('function _trasSigno(');
ok('existe', zS.length > 100);
let signo = null;
try { signo = new Function('return (' + zS + ')')(); } catch(e){}
ok('extraíble', typeof signo === 'function');
if (signo) {
  const t = { esTrasiego: true, origenProyectoId: 'pA', destinoProyectoId: 'pB' };
  ok('a la obra DESTINO le suma', signo(t, 'pB') === 1);
  ok('a la obra ORIGEN le resta', signo(t, 'pA') === -1);
  ok('a las demás no les toca nada', signo(t, 'pC') === 0);
  ok('una orden normal no es trasiego', signo({ destinoProyectoId: 'pB' }, 'pB') === 0);
}

console.log('\n— 2. el registro (solo compras, directo) —');
const zR = ex('window._trasRegistrar = async function');
ok('existe el flujo', zR.length > 1200);
ok('SOLO compras (decisión de Antonio)', /can\('compras\.autorizar'\)/.test(zR) && /SOLO COMPRAS/.test(zR));
ok('origen y destino obligatorios y distintos', /origen === destino/.test(zR));
ok('nace AUTORIZADA directo (decisión de Antonio)', /status:\s*'AUTORIZADA'/.test(zR) && !/PENDIENTE_AUTORIZACION/.test(zR));
ok('serie TRAS con folio derivado', /serie:\s*'TRAS'/.test(zR) && /_primerNumeroLibre/.test(zR));
ok('esDespacho (exclusiones) + esTrasiego (rama propia)', /esDespacho:\s*true/.test(zR) && /esTrasiego:\s*true/.test(zR));
ok('vive en la bodega central (union-merge v972)', /_bodegaMatStore\(\)/.test(zR));
ok('precio congelado: entrada a bodega → catálogo', /_precioEntradaBodega/.test(zR) && /precioDeProductoReceta/.test(zR));
ok('avisa si algún material queda sin precio (movería Q0)', /sinPrecio/.test(zR));
ok('sella y sube de una (dinero)', /_ts:\s*t/.test(zR) && /forceUploadNow/.test(zR));
ok('captura por oninput (prConfirm destruye el modal antes del await)', /window\._trasForm/.test(zR));

console.log('\n— 3. el gasto viaja de una obra a la otra —');
const zG = ex('function _gastosDeProyecto(');
ok('_gastosDeProyecto tiene la rama del trasiego', /esTrasiego/.test(zG) && /_trasSigno/.test(zG));
ok('el monto va CON SIGNO (resta en la origen)', /signo \*/.test(zG) || /\* signo/.test(zG));
ok('renderGastos lo rotula', /TRASIEGO/.test(ex('function renderGastos(')));

console.log('\n— 4. el documento imprimible —');
ok('el impreso muestra el dinero del trasiego', /esDespacho = !!oc\.esDespacho && !oc\.esPrepago && !oc\.esTrasiego/.test(html));
ok('con su título propio', /TRASIEGO DE MATERIAL/.test(html));
ok('y el origen → destino', /origenProyectoNombre/.test(html) && /destinoProyectoNombre/.test(html));

console.log('\n— 5. la tarjeta en BODEGA CENTRAL —');
const zT = ex('function _trasiegosHTML(');
ok('existe la vista', zT.length > 500);
ok('lista los trasiegos con su documento', /printOrdenCompra/.test(zT) && /esTrasiego/.test(zT));
/* v1088 (Antonio): 'el registro de trasiego eliminalo porque ahora se registra a la hora de
   crear la oc' — el alta manual se fue; el trasiego nace del pedido (v1068). */
ok('ya NO hay botón de alta manual: el trasiego nace de la OC', !/onclick="window\._trasRegistrar\(\)"/.test(html) && /TRASIEGO/.test(html));
ok('el contenedor vive en la sección bodega, junto al pre-pago', /_bodegaPrepagoWrap"><\/div>[\s\S]{0,200}_trasiegosWrap/.test(html));
ok('y el panel lo pinta', /_trasiegosWrap'\)[\s\S]{0,80}_trasiegosHTML\(\)/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
