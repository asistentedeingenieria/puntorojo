/* v1214 (Antonio, 14-ago: "en las ordenes de compra de los proyectos varios NO me esta
   dejando despachar de las compras que ya tenemos en pre pago... que SIEMPRE FUNCIONE").

   El guard v1070 de _dppOpcionesDeItem corta si el pedido "no tiene obra destino", y
   _pedidoDestinoActual devolvía '' A PROPÓSITO para varios/manual — regla de cuando un
   despacho con destino vacío dejaba el gasto sin acreditar. Desde v1209 el dash de GASTOS
   · PROYECTOS VARIOS acredita los DPP/TRAS por el NOMBRE del proyectito (o.proyecto), así
   que el guard quedó obsoleto para varios: la opción COMPRA PRE-PAGO nunca aparecía.

   FIX: los pedidos de varios/manual devuelven el destino '_varios:<NOMBRE>' — marcador que
   NUNCA es id de obra (ninguna obra se acredita ese gasto por error) pero que pasa los
   guards y deja generar el DPP. La atribución del gasto sigue por nombre (v1209). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— 1. _pedidoDestinoActual: el proyectito ES un destino —');
const z = ex(code, 'function _pedidoDestinoActual(');
ok('existe', !!z);
try {
  const mk = (pd, projectId, destinoReal) => new Function('currentPedidoDetalleId', '_findPedidoGlobal', '_destinoProyectoDePedido',
    'return (' + z + ')')('pd-1', () => ({ pd: pd, projectId: projectId || '' }), () => destinoReal || '');

  ok('EL CASO REAL: pedido de PROYECTOS VARIOS → _varios:<nombre>',
    mk({ esVarios: true, proyectoPedido: 'CASA ARQ JC' })() === '_varios:CASA ARQ JC');
  ok('pedido de proyecto MANUAL también',
    mk({ proyectoManual: true, proyectoPedido: 'TIFFANY' })() === '_varios:TIFFANY');
  ok('el nombre se normaliza a MAYÚSCULAS',
    mk({ esVarios: true, proyectoPedido: ' casa arq jc ' })() === '_varios:CASA ARQ JC');
  ok('un pedido de OBRA sigue devolviendo su obra (sin cambio)',
    mk({ proyectoId: 'p-1' }, 'p-1', 'p-1')() === 'p-1');
  ok('ABASTECER BODEGA sigue sin destino (entrada a bodega ≠ despacho a un proyecto)',
    mk({ esBodega: true })() === '');
  ok('pedido de varios SIN nombre sigue bloqueado (no hay a quién acreditar)',
    mk({ esVarios: true })() === '');
} catch(e){ ok('evalúa aislada', false); console.log('  ' + e.message); }

console.log('\n— 2. el marcador NUNCA se confunde con una obra —');
ok('el prefijo _varios: no es un id de proyecto (los ids son p-/proj-)', /_varios:/.test(z));
const zT = ex(code, 'function _trasSigno(');
ok('_trasSigno compara ids exactos — el marcador no le suma a ninguna obra', /String\(o\.destinoProyectoId \|\| ''\) === String\(pid\)/.test(zT));

console.log('\n— 3. el TRASIEGO hacia un proyectito guarda el NOMBRE del proyectito —');
ok('el nombre de destino cae a proyectoOc cuando el destino no es una obra',
  /\.name \|\| proyectoOc \|\| _destT\)/.test(html) || /\.name \|\| proyectoOc \|\| _destT/.test(code));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
