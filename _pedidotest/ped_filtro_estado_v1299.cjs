/* v1299 (Antonio, 27-ago: "en pedidos quiero poder filtrar las que dicen PENDIENTE DE
   AUTORIZACIÓN, EN COMPRAS, APROBADO OC GENERADA etc — ver una por una con base a su
   status"): la barra vieja (v1204) filtraba por el pd.status CRUDO en 3 canastas
   gruesas (SOL / COMPRA / REC), pero la TARJETA enseña el estado DERIVADO de
   _estadoPedidoMostrar ("PENDIENTE DE AUTORIZACIÓN" cuando está APROBADO con OC
   pendiente, "APROBADO · OC GENERADA", "EN COMPRAS"…) — el filtro no cuadraba con lo
   que se ve. Ahora la barra arma UN CHIP POR CADA ESTADO PRESENTE (con su conteo),
   derivado con la MISMA función que pinta la tarjeta — lo que decís ver es lo que
   filtrás. TODOS y RECIBIDOS (historial directo) se quedan; un filtro apuntando a un
   estado que ya no existe se auto-resetea (patrón v1204 de las series). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const iBar = html.indexOf('const _pedBar =');
const z = html.slice(iBar - 1800, iBar + 1400);
ok('los chips se derivan con la MISMA función de la tarjeta', /_estadoPedidoMostrar\(pd, getPedidoOrdenes\(pd\.id\)\)/.test(z));
ok('un chip por estado PRESENTE con su conteo', /_estCounts/.test(z) && /_estOrden\.map/.test(z));
/* v1302: mismo look que la barra de estados de ÓRDENES — TODOS LOS ESTADOS + (N) */
ok('rótulo de órdenes y conteos entre paréntesis', /TODOS LOS ESTADOS<\/button>/.test(z) && /RECIBIDOS \(\$\{_hist\.length\}\)/.test(z) && /\(\$\{_estCounts\[t\]\}\)/.test(z));
ok('el filtro compara contra el estado DERIVADO', /_estDe\[pd\.id\] === _fPed/.test(z));
ok('filtro huérfano se auto-resetea', /!_estCounts\[window\._pedEstadoFiltro\]/.test(z));
ok('las canastas viejas SOL/COMPRA ya no filtran por status crudo', !/pd\.status === 'SOLICITADO'\)\.length/.test(z) && !/_fPed === 'SOL'/.test(z));
ok('el estado viaja escapado en el onclick (regla v1167)', /&quot;|JSON\.stringify\(t\)/.test(z));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
