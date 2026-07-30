/* v1071 — BUG (Antonio, 30-jul, con foto): en el modal de generar OC escribe "TRASIEGO" en
   el picker de proveedor y sale SIN RESULTADOS.
   CAUSA RAÍZ A: `let currentPedidoDetalleId` (L19826) NO es propiedad de window, y
   _trasOpcionesDeItem/_dppOpcionesDeItem/_dppOrdenesSinBorrador leían
   window.currentPedidoDetalleId → undefined → _findPedidoGlobal(undefined) → null →
   destino '' → lista vacía SIEMPRE. (TRASIEGO nunca apareció desde v1068; COMPRA PRE-PAGO
   funcionaba en v1068 y la ROMPÍ en v1070 al agregarle el guard de destino.)
   CAUSA RAÍZ B (latente): _destinoProyectoDePedido devuelve pd.proyectoId || '' — los
   pedidos viejos de obra no traen proyectoId y habrían quedado sin opciones igual.
   FIX: _pedidoDestinoActual() — variable directa (mismo scope) + respaldo con la obra
   donde VIVE el pedido (_findPedidoGlobal().projectId, patrón _gastoDestinoDeOrden v1041). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. el resolvedor del destino del pedido en curso —');
const zD = ex('function _pedidoDestinoActual(');
ok('existe _pedidoDestinoActual', zD.length > 120);
let dest = null;
try { dest = new Function('currentPedidoDetalleId','_findPedidoGlobal','_destinoProyectoDePedido','return (' + zD + ')'); } catch(e){}
ok('es pura (solo lee lo que se le inyecta)', !!dest);
if (dest) {
  const destDe = pd => (pd && !pd.esBodega && !pd.esVarios && !pd.proyectoManual && pd.proyectoId) ? String(pd.proyectoId) : '';
  /* pedido de obra CON proyectoId */
  const f1 = dest('pd1', () => ({ pd: { id: 'pd1', proyectoId: 'p9' }, projectId: 'p9' }), destDe);
  ok('pedido de obra: devuelve su proyecto', f1() === 'p9');
  /* EL CASO REAL: pedido viejo SIN proyectoId, viviendo en la obra p9 */
  const f2 = dest('pd1', () => ({ pd: { id: 'pd1' }, projectId: 'p9' }), destDe);
  ok('pedido viejo sin proyectoId: manda la obra donde vive', f2() === 'p9');
  /* bodega y varios NO tienen obra destino: la opción debe seguir oculta */
  const f3 = dest('pd1', () => ({ pd: { id: 'pd1', esBodega: true }, projectId: null }), destDe);
  ok('bodega sigue sin destino', f3() === '');
  const f4 = dest('pd1', () => ({ pd: { id: 'pd1', esVarios: true }, projectId: null }), destDe);
  ok('varios sigue sin destino', f4() === '');
  /* sin pedido abierto no revienta */
  ok('sin pedido abierto devuelve vacío', dest(null, () => null, destDe)() === '' && dest('x', () => null, destDe)() === '');
}

console.log('\n— 2. el bug: nadie vuelve a leer window.currentPedidoDetalleId —');
ok('cero usos de window.currentPedidoDetalleId (no existe: es un let)', !/window\.currentPedidoDetalleId/.test(html));
ok('_trasOpcionesDeItem usa el resolvedor', /_pedidoDestinoActual\(/.test(ex('function _trasOpcionesDeItem(')));
ok('_dppOpcionesDeItem usa el resolvedor', /_pedidoDestinoActual\(/.test(ex('function _dppOpcionesDeItem(')));
const zSB = ex('function _dppOrdenesSinBorrador(');
ok('_dppOrdenesSinBorrador lee la variable directa', /_findPedidoGlobal\(currentPedidoDetalleId\)/.test(zSB) && !/window\.currentPedidoDetalleId/.test(zSB));

console.log('\n— 3. generar: el mismo destino derivado (o el DPP/TRAS nace huérfano) —');
const zGen = ex('async function generarOrdenCompra(');
const iEsp = zGen.indexOf('_espIds');
const zEsp = iEsp > -1 ? zGen.slice(iEsp) : '';
ok('el guard de destino usa el resolvedor', /_pedidoDestinoActual\(\)/.test(zEsp));
ok('el DPP guarda ESE destino (no el crudo del pedido)', /destinoProyectoId: _destD/.test(zEsp));
ok('el TRAS también', /_destT = _destD|const _destT = _destD/.test(zEsp));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
