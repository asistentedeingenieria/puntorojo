/* v1014 — REGISTRO DE GASTOS POR OBRA (bloques B2 y B4).
   Antonio: "Necesitamos poder tener el registro de todos los gastos. Necesito uno de compras
   general por proyecto donde pueda ver despues un despliegue y pueda ver el detalle de las
   ordenes de compra o ordenes de despacho... y un resumen de que producto se envio a cada
   obra con su monto."

   DECISIÓN DE ARQUITECTURA: el gasto NO se guarda, se DERIVA. La orden de compra ya es la
   foto congelada del precio (guarda items[].precio, subtotal, IVA y total) y v927 prohíbe
   regenerarlas. Una función pura sobre los tres contenedores es idempotente por construcción:
   no hay id que colisionar, no hay merge que hacer, no hay contenedor nuevo, no hace falta
   subir APP_SYNC_VERSION, y recalcular dos veces da exactamente lo mismo. Un array paralelo
   escrito al recibir habría agregado ritual y riesgo de doble escritura sin comprar nada.

   QUÉ CUENTA COMO GASTO (decidido con Antonio):
   - Las ÓRDENES DE COMPRA (serie OC) y las de DESPACHO de bodega (serie DESP).
   - NUNCA las ÓRDENES DE PRODUCCIÓN (serie OP): son un aviso al proveedor, no una compra.
   - Nunca las CANCELADAS. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. el gasto se calcula, no se guarda —');
const zG = ex('function _gastosDeProyecto(');
ok('existe el motor', zG.length > 200);
ok('NO crea un contenedor nuevo', !/state\.gastos/.test(html));
ok('no escribe estado al calcular', !/saveState\(\)/.test(zG));

console.log('\n— 2. se comporta —');
const OCS = [
  { id:'o1', serie:'OC',   numero:'VLA – 1 - OC 1', destinoProyectoId:'p1', status:'AUTORIZADA', proveedorNombre:'SISTEGUA', total:1000, subtotal:1000, ts:5, formaPago:'CRÉDITO 30 DÍAS', credito:30,
    items:[{ name:'LAMINA', qty:10, precio:100 }] },
  { id:'o2', serie:'OP',   numero:'VLA – 1 - OP 1', destinoProyectoId:'p1', status:'AUTORIZADA', proveedorNombre:'SISTEGUA', total:5815.60, ts:4, items:[{ name:'POSTE', qty:434, precio:13.4 }] },
  { id:'o3', serie:'DESP', numero:'VLA – 2 - DESP 1', destinoProyectoId:'p1', status:'AUTORIZADA', proveedorNombre:'BODEGA CENTRAL', total:0, ts:3, esDespacho:true,
    items:[{ name:'AGUA PURA SALVAVIDAS GARRAFON', qty:2, precio:0 }] },
  { id:'o4', serie:'OC',   numero:'VLA – 3 - OC 1', destinoProyectoId:'p1', status:'CANCELADA', proveedorNombre:'X', total:999, ts:2, items:[{ name:'Y', qty:1, precio:999 }] },
  { id:'o5', serie:'OC',   numero:'OTRA – 1 - OC 1', destinoProyectoId:'p9', status:'AUTORIZADA', proveedorNombre:'Z', total:777, ts:1, items:[{ name:'LAMINA', qty:7, precio:111 }] },
];
const MOVS = [
  { id:'m1', tipo:'ENTRADA', k:'AGUA PURA SALVAVIDAS GARRAFON', name:'AGUA PURA SALVAVIDAS GARRAFON', qty:100, precio:21.4, ts:1 },
];
const ctx = {
  state: { projects: [{ id:'p1', name:'VICINIA', materiales:{ ordenes: OCS, pedidos: [] } }], bodegaMat:{ ordenes: [] }, variosMat:{ ordenes: [] }, bodegaMovs: MOVS },
  _ocSerieDe: o => o.serie,
  _ocItemMemKey: s => String(s||'').toUpperCase().trim(),
};
let gastos = null;
try {
  /* v1041: _gastosDeProyecto ahora resuelve el destino con _gastoDestinoDeOrden (deriva el
     destino de las órdenes viejas sin destinoProyectoId) — se extrae junto */
  const src = [ex('function _precioEntradaBodega('), ex('function _gastoDestinoDeOrden('), zG].filter(Boolean).join('\n')
    + '\nvar _destinoProyectoDePedido = function(pd){ return (pd && pd.proyectoId) || ""; };';
  gastos = new Function(...Object.keys(ctx), src + '\n return _gastosDeProyecto("p1");')(...Object.values(ctx));
} catch(e){ console.log('   (no evaluable: ' + e.message + ')'); }

if (gastos) {
  const nums = (gastos.ordenes || []).map(o => o.numero);
  ok('cuenta la orden de compra', nums.some(n => /OC 1/.test(n)));
  ok('NO cuenta la orden de producción', !nums.some(n => /OP/.test(n)));
  ok('no cuenta la cancelada', !nums.some(n => /VLA – 3/.test(n)));
  ok('no cuenta la de otra obra', !nums.some(n => /OTRA/.test(n)));
  ok('sí cuenta el despacho de bodega', nums.some(n => /DESP/.test(n)));
  /* el despacho sale en Q 0 en el papel; su valor es el precio con que el material entró */
  ok('el despacho se valoriza al precio de entrada a bodega', Math.abs(Number(gastos.total) - (1000 + 2 * 21.4)) < 0.01);
  ok('el total no arrastra la producción ni la cancelada', Number(gastos.total) < 5000);
  ok('separa lo comprado de lo despachado', Number(gastos.totalCompra) === 1000 && Math.abs(Number(gastos.totalDespacho) - 42.8) < 0.01);
} else {
  ['compra','no OP','no cancelada','no otra obra','despacho','valorizado','total','separa'].forEach(n => ok(n + ' (evaluable)', false));
}

console.log('\n— 3. el resumen por producto (lo que pidió Antonio) —');
const zR = ex('function _gastosPorProducto(');
ok('existe el resumen producto × obra', zR.length > 100);
let porProd = null;
try {
  porProd = new Function('_ocItemMemKey', 'return (' + zR + ')')(s => String(s||'').toUpperCase().trim())(
    [{ items:[{ name:'LAMINA', qty:10, precio:100 }], serie:'OC' },
     { items:[{ name:'LAMINA', qty:5,  precio:100 }], serie:'OC' },
     { items:[{ name:'TORNILLO', qty:2, precio:50 }], serie:'OC' }]
  );
} catch(e){ console.log('   (no evaluable: ' + e.message + ')'); }
if (porProd) {
  const lam = porProd.find(x => /LAMINA/.test(x.name));
  ok('junta el mismo material de varias órdenes', lam && lam.qty === 15);
  ok('con su monto', lam && lam.monto === 1500);
  ok('y ordena por monto (lo que más pesa arriba)', porProd[0] && /LAMINA/.test(porProd[0].name));
} else { ['junta','monto','ordena'].forEach(n => ok(n + ' (evaluable)', false)); }

console.log('\n— 4. dónde se ve —');
/* v1047: la pestaña GASTOS salió de la obra — vive en COMPRAS; #mat-gastos queda como casa */
ok('hay pestaña GASTOS en materiales', /setMatTab\('gastos'\)/.test(html) && /<div id="mat-gastos"/.test(html));
ok('con su contenedor', /id="mat-gastos"/.test(html));
ok('setMatTab la conoce', /gastos/.test(ex('function setMatTab(')));
ok('hay un total en los KPIs de materiales', /GASTO/i.test(ex('function renderMateriales(')));
/* los montos son plata: mismo gate que el inventario valorizado y los precios de receta */
ok('los montos están gateados por permiso', /receta\.verPrecios/.test(ex('function _puedeVerGastos(')));
ok('la pantalla respeta el gate', /_puedeVerGastos\(\)/.test(ex('function renderGastos(')));
/* v1092 (Antonio): "en la selección de la obra ya no quiero que aparezca el gasto
   acumulado" — el KPI se quitó de la pantalla de MATERIALES de la obra. El gasto sigue
   gateado por _puedeVerGastos donde ahora vive: COMPRAS → GASTOS y el dashboard. */
ok('el KPI de gasto ya no está en la pantalla de materiales', !/GASTO acumulado/.test(ex('function renderMateriales(')));
ok('pero el gasto sigue protegido donde se muestra', (html.match(/_puedeVerGastos\(\)/g) || []).length >= 3);

console.log('\n— 5. lo que no se rompe —');
ok('no toca el contador de órdenes', !/ocCountLabel/.test(zG));
ok('no se agrega ningún merge nuevo', !/matFix|_mergeById/.test(zG));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
