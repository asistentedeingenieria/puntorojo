/* v1235 (Antonio, 17-ago: "NO ME DEJA CORREGIR... y que la corrección se haga EN PEDIDOS").

   EL BLOQUEO: _ocEditarBorrador re-armaba TODO el pedido, así que el candado v1001
   prohibía corregir si CUALQUIER hermana estaba AUTORIZADA (el material firmado saldría
   dos veces). Caso real: OC1-000010 DEVUELTA no se podía corregir porque el DESP1-000012
   del mismo pedido EF2-17 ya estaba autorizado.

   FIX: (1) al corregir, el modal siembra el pedido RESTANDO lo cubierto por las
   AUTORIZADAS (por clave; presentaciones en unidades) — el candado se retira y el barrido
   v1001 sigue sin tocar autorizadas; (2) la corrección vive EN PEDIDOS: la tarjeta del
   pedido grita DEVUELTA POR FINANZAS + motivo + botón CORREGIR; (3) el botón CORREGIR
   sale de la pestaña de ÓRDENES (solo queda el aviso de dónde corregir). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— 1. la resta de lo autorizado (pura) —');
const zR = ex(code, 'function _ocRestarCubiertoAutorizado(');
ok('existe', !!zR);
try {
  const K = s => String(s||'').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const orders = [{ status:'AUTORIZADA', items:[{ name:'CLAVO', qty:250 }, { name:'CIENTO DE TORNILLO', qty:1, qtyUnidades:100 }] },
                  { status:'DEVUELTA', items:[{ name:'PASTA', qty:9 }] }];
  const f = new Function('getPedidoOrdenes', '_ocItemMemKey', 'return (' + zR + ')')(() => orders, K);
  const arr = [{ name:'CLAVO', qty:250 }, { name:'PASTA', qty:9 }, { name:'CIENTO DE TORNILLO', qty:130 }];
  const out = f(arr, 'pd1');
  ok('EL CASO REAL: lo cubierto por la AUTORIZADA desaparece de la siembra',
    !out.some(it => it.name === 'CLAVO'));
  ok('lo de la DEVUELTA se re-siembra completo (es lo que se corrige)',
    out.some(it => it.name === 'PASTA' && it.qty === 9));
  ok('cobertura PARCIAL resta unidades (presentación cuenta en unidades: 130−100=30)',
    out.some(it => it.name === 'CIENTO DE TORNILLO' && Math.abs(it.qty - 30) < 0.001));
  ok('sin autorizadas devuelve tal cual', new Function('getPedidoOrdenes', '_ocItemMemKey', 'return (' + zR + ')')(() => [], K)(arr, 'x') === arr);
} catch(e){ ok('evalúa aislada', false); console.log('  ' + e.message); }

console.log('\n— 2. el candado se retiró y la siembra resta al editar —');
const zE = ex(code, 'window._ocEditarBorrador = async function(');
ok('el candado "NO SE PUEDE RE-ARMAR" ya no existe', !/NO SE PUEDE RE-ARMAR/.test(zE) && !/NO SE PUEDE RE-ARMAR/.test(html));
ok('el confirm avisa que las autorizadas no se tocan', /YA AUTORIZADAS[\s\S]{0,80}no se tocan|no se tocan[\s\S]{0,80}se re-arma/i.test(zE));
ok('la siembra del modal resta SOLO al corregir (los otros lectores del builder intactos)',
  /if \(window\._ocEditandoId\) ocWorkingItems = _ocRestarCubiertoAutorizado\(ocWorkingItems, pd\.id\)/.test(code));

console.log('\n— 3. la corrección vive EN PEDIDOS —');
const zCard = ex(code, 'function renderPedidoCard(');
ok('la tarjeta del pedido grita DEVUELTA POR FINANZAS con el motivo', /DEVUELTA POR FINANZAS/.test(zCard) && /devolucion && o\.devolucion\.motivo/.test(zCard));
ok('con botón CORREGIR ahí mismo', /_ocEditarBorrador\(/.test(zCard));
ok('la pestaña de ÓRDENES ya no trae el botón CORREGIR (solo señala a PEDIDOS)',
  !/title="Corregir lo que señaló finanzas y volver a generarla"/.test(html) && /CORREGILA DESDE PEDIDOS/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
