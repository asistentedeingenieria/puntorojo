/* v1283 (Antonio, 26-ago: "los RODOS salen como herramienta de bodega pero NO tengo
   en bodega — los necesito ALQUILAR y ya los puse como renta en el catálogo"):
   el circuito de herramientas (v1155: sin costo, las despacha bodega) nunca llega al
   generador de órdenes. Nuevo botón RENTAR en el bloque de herramientas del pedido:
   busca cada herramienta en TODOS los catálogos de proveedores; si está marcada
   SE RENTA (v1281), arma la ORDEN DE RENTA (una por proveedor) con el mismo cálculo
   tarifa × periodos (v1282), ligada al pedido. El pedido queda sellado con
   pd.herrRenta (candado anti-doble + chip RENTA GENERADA ✓). El DESPACHAR de bodega
   sigue vivo para cuando SÍ hay existencia. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* ── 1. el bloque de herramientas ofrece RENTAR y muestra el resultado ── */
const iBloq = html.indexOf('Herramientas de bodega · sin costo');
const zBloq = html.slice(iBloq - 200, iBloq + 2600);
ok('botón RENTAR en el bloque (gated a compras/admin)', /_herrRentarDePedido\(/.test(zBloq) && /compras\.autorizar/.test(zBloq));
ok('chip RENTA GENERADA ✓ cuando ya se rentó', /RENTA GENERADA/.test(zBloq) && /herrRenta/.test(zBloq));
ok('el DESPACHAR de bodega sigue vivo', /_herrDespacharDePedido\(/.test(zBloq));

/* ── 2. el generador ── */
const zFn = ex('window._herrRentarDePedido = async function');
ok('_herrRentarDePedido existe con gate', /can\('compras\.autorizar'\)/.test(zFn));
ok('busca la herramienta en TODOS los proveedores por matchKey + SE RENTA', /_getProveedores\(\)/.test(zFn) && /matchKeyProducto/.test(zFn) && /_prodRentaInfo/.test(zFn));
ok('sin coincidencias avisa que hay que marcar el catálogo', /MARCALAS PRIMERO|NINGUNA/.test(zFn));
ok('agrupa POR PROVEEDOR (una orden de renta por cada uno)', /porProv/.test(zFn));
ok('pregunta DÍAS + inicio (patrón _rentaForm) y valida', /_rentaForm/.test(zFn) && /CUÁNTOS DÍAS/.test(zFn));
ok('re-lee el pedido tras el await (regla v940)', (zFn.match(/_findPedidoGlobal\(/g) || []).length >= 2);
ok('candado anti-doble: si ya tiene herrRenta no genera otra', /herrRenta/.test(zFn.slice(0, zFn.indexOf('prConfirm'))));
ok('usa el cálculo v1282 y la serie RENTA con folio propio', /_rentaCalcItems/.test(zFn) && /serie: 'RENTA'/.test(zFn) && /_primerNumeroLibre/.test(zFn));
ok('la orden queda ligada al pedido y nace PENDIENTE de finanzas', /pedidoId: pd2\.id/.test(zFn) && /PENDIENTE_AUTORIZACION/.test(zFn));
ok('sella el pedido (pd.herrRenta + _ts) y sube YA', /pd2\.herrRenta = /.test(zFn) && /pd2\._ts = Date\.now\(\)/.test(zFn) && /forceUploadNow/.test(zFn));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
