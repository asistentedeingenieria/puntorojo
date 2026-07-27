/* v996 (reporte de Antonio 27-jul): hizo un pedido para un PROYECTO PEQUEÑO / REPARACIÓN
   llamado TIFFANY y el pedido salió titulado "VICINIA DEL CARMEN – 1" —el proyecto activo—
   con "TIFFANY · MANUAL" en letra chica. "NO DEBERÍA DE SER ASÍ."

   FIX: un pedido de proyecto MANUAL se titula y se numera con SU proyecto: TIFFANY – 1,
   TIFFANY – 2… Su correlativo cuenta solo entre los pedidos de ESE proyecto, así que dos
   clientes distintos no comparten numeración ni se pisan.
   Los pedidos siguen guardándose dentro del proyecto activo (no cambia el almacenamiento):
   lo que cambia es el PREFIJO y el conjunto sobre el que se busca el primer número libre. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zN = ex('window.nextPedidoCode = function');
let f = null;
try { f = new Function('_primerNumeroLibre', 'return (' + zN.slice(zN.indexOf('function')) + ')')(
  function(usados){ var s={}; (usados||[]).forEach(function(n){ var v=parseInt(n,10); if(v>0) s[v]=true; }); var i=1; while(s[i]) i++; return i; }
); } catch(e){}
if (!f) { ok('nextPedidoCode evaluable', false); }
else {
  const mk = pedidos => ({ name:'VICINIA DEL CARMEN', materiales:{ pedidos, ordenes: [] } });
  // sin proyecto manual: como siempre
  ok('pedido normal usa el nombre del proyecto', f(mk([])) === 'VICINIA DEL CARMEN – 1');
  ok('y sigue su propia serie', f(mk([{ numero:'VICINIA DEL CARMEN – 1' }])) === 'VICINIA DEL CARMEN – 2');
  // proyecto manual: título y serie propios
  ok('el pedido MANUAL se titula con SU proyecto', f(mk([]), 'TIFFANY') === 'TIFFANY – 1');
  const conTiffany = mk([{ numero:'VICINIA DEL CARMEN – 1' }, { numero:'TIFFANY – 1', proyectoManual:true, proyectoPedido:'TIFFANY' }]);
  ok('el correlativo manual NO cuenta los del proyecto', f(conTiffany, 'TIFFANY') === 'TIFFANY – 2');
  ok('y el del proyecto NO cuenta los manuales', f(conTiffany) === 'VICINIA DEL CARMEN – 2');
  const dosClientes = mk([
    { numero:'TIFFANY – 1', proyectoManual:true, proyectoPedido:'TIFFANY' },
    { numero:'CASA LOPEZ – 1', proyectoManual:true, proyectoPedido:'CASA LOPEZ' }
  ]);
  ok('cada cliente lleva su propia numeración', f(dosClientes, 'TIFFANY') === 'TIFFANY – 2' && f(dosClientes, 'CASA LOPEZ') === 'CASA LOPEZ – 2');
  ok('el nombre del cliente se normaliza (espacios/mayúsculas)', f(mk([]), '  tiffany  ') === 'TIFFANY – 1');
}

// el submit pasa el proyecto manual al generador
const zS = ex('async function submitPedido(');
/* v1002: el pedido manual se guarda en PROYECTOS VARIOS, así que su serie se cuenta sobre
   ESE contenedor (más los manuales viejos que quedaron en proyectos) — si no, TIFFANY – 2
   se numeraría contra los pedidos de la obra abierta. */
ok('submitPedido numera con el proyecto del pedido', zS.includes("nextPedidoCode(_contNum, proyectoTipo === 'MANUAL' ? proyectoPedido : '')"));
ok('y la base de esa serie es el contenedor de varios', zS.includes('_variosPedidosTodos()'));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
