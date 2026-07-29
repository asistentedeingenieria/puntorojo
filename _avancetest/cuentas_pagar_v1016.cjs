/* v1016 — CUENTAS POR PAGAR (bloque B3, el último de la cadena de gastos).
   Antonio: "quiero que me separes tambien por proyecto el tema de las cuentas por pagar de
   todas las compras que estan a credito... necesito un resumen de cuentas por pagar... con
   detalle de las ordenes de compras a credito."

   DOS COSAS QUE SE CALCULAN Y UNA QUE SE GUARDA:
   - Qué se debe: se DERIVA de las órdenes a crédito menos lo ya pagado. Sin contenedor.
   - Cuándo vence: se CALCULA. Si se guardara, un cambio de fecha lo dejaría mintiendo.
     Cascada explícita, y la pantalla dice cuál fecha usó: factura → recepción real →
     autorización.
   - Los PAGOS sí se guardan (state.pagosProv): son un hecho nuevo que nadie más registra.
     Contenedor nuevo ⇒ ritual de sync completo. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. el vencimiento se calcula, no se guarda —');
const zV = ex('function _vencimientoOc(');
ok('existe', zV.length > 80);
let fV = null;
try { fV = new Function('_fechaLatamADate','_dateALatam', 'return (' + zV + ')')(
  s => { const m = String(s||'').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? new Date(+m[3], +m[2]-1, +m[1]) : null; },
  d => (!d||isNaN(d.getTime())) ? '' : String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear()
); } catch(e){ console.log('   (no evaluable: ' + e.message + ')'); }
if (fV) {
  const conFactura = fV({ credito: 30, factura: { fecha: '01/07/2026' }, recibidoTs: null, autorizadoTs: null });
  ok('cuenta desde la factura cuando la hay', conFactura && conFactura.base === 'FACTURA');
  ok('y suma los días de crédito', conFactura && conFactura.fecha === '31/07/2026');
  const sinFactura = fV({ credito: 15, factura: null, recibidoFecha: '10/07/2026', autorizadoTs: null });
  ok('si no hay factura cuenta desde que se recibió', sinFactura && sinFactura.base === 'RECEPCIÓN');
  ok('con sus días', sinFactura && sinFactura.fecha === '25/07/2026');
  const soloAut = fV({ credito: 30, autorizadoTs: new Date(2026, 6, 1).getTime() });
  ok('y en último caso desde que finanzas autorizó', soloAut && soloAut.base === 'AUTORIZACIÓN');
  ok('sin crédito no hay vencimiento', fV({ credito: 0, factura: { fecha: '01/07/2026' } }) === null);
  ok('sin ninguna fecha tampoco inventa una', fV({ credito: 30 }) === null);
}

console.log('\n— 2. qué se debe —');
const zC = ex('function _cuentasPorPagar(');
ok('existe el motor', zC.length > 200);
const OCS = [
  { id:'a', serie:'OC', numero:'VLA – 1 - OC 1', destinoProyectoId:'p1', status:'AUTORIZADA', proveedorNombre:'SISTEGUA', total:1000, credito:30, autorizadoTs: new Date(2026,6,1).getTime(), ts:5 },
  { id:'b', serie:'OC', numero:'VLA – 2 - OC 1', destinoProyectoId:'p1', status:'AUTORIZADA', proveedorNombre:'HINCAPIE', total:500, credito:0, autorizadoTs: new Date(2026,6,2).getTime(), ts:4 },
  { id:'c', serie:'DESP', numero:'VLA – 3 - DESP 1', destinoProyectoId:'p1', status:'AUTORIZADA', proveedorNombre:'BODEGA CENTRAL', total:200, credito:0, esDespacho:true, ts:3 },
  { id:'d', serie:'OP', numero:'VLA – 4 - OP 1', destinoProyectoId:'p1', status:'AUTORIZADA', proveedorNombre:'SISTEGUA', total:9999, credito:30, ts:2 },
  { id:'e', serie:'OC', numero:'VLA – 5 - OC 1', destinoProyectoId:'p1', status:'AUTORIZADA', proveedorNombre:'X', total:800, credito:15, autorizadoTs: new Date(2026,6,3).getTime(), ts:1 },
];
const PAGOS = [{ id:'pg1', ocId:'e', monto:800, fecha:'20/07/2026' }];
let cxp = null;
try {
  const ctx = {
    state: { projects:[{ id:'p1', name:'VLA', materiales:{ ordenes: OCS } }], bodegaMat:{ordenes:[]}, variosMat:{ordenes:[]}, pagosProv: PAGOS },
    _ocSerieDe: o => o.serie,
    _fechaLatamADate: s => { const m = String(s||'').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? new Date(+m[3], +m[2]-1, +m[1]) : null; },
    _pagosDeOc: ocId => PAGOS.filter(x => x.ocId === ocId),
    _dateALatam: d => (!d||isNaN(d.getTime())) ? '' : String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear(),
  };
  const src = [ex('function _vencimientoOc('), zC].join('\n');
  cxp = new Function(...Object.keys(ctx), src + '\n return _cuentasPorPagar("p1");')(...Object.values(ctx));
} catch(e){ console.log('   (no evaluable: ' + e.message + ')'); }
if (cxp) {
  const ids = (cxp.cuentas || []).map(c => c.id);
  ok('la orden a crédito entra', ids.includes('a'));
  ok('la de contado NO es cuenta por pagar', !ids.includes('b'));
  ok('el despacho de bodega tampoco (ya se pagó)', !ids.includes('c'));
  ok('la orden de producción tampoco', !ids.includes('d'));
  ok('la que ya se pagó completa sale del pendiente', !ids.includes('e'));
  ok('el total debido es solo lo que falta', Number(cxp.total) === 1000);
  ok('y se sabe cuánto se pagó', Number(cxp.totalPagado) === 800);
}

console.log('\n— 3. los pagos se guardan bien —');
ok('contenedor nuevo con union-merge', /_mergeById\(\(state && state\.pagosProv\)/.test(html));
ok('con tombstones', /pagosProvEliminados/.test(html));
ok('el accessor lo crea', /if \(!Array\.isArray\(state\.pagosProv\)\) state\.pagosProv = \[\]/.test(html));
const zReg = ex('window._registrarPagoProv = async function');
ok('registrar un pago sella _ts', /_ts:/.test(zReg));
ok('y sube de inmediato (es plata)', /forceUploadNow/.test(zReg));
ok('no se puede pagar más de lo que se debe', /saldo|resta|excede/i.test(zReg));

console.log('\n— 4. el ritual de sync —');
/* v1036 la subió a 918; lo que importa acá es que sea AL MENOS la de pagosProv */
ok('APP_SYNC_VERSION subió a 917', parseInt((html.match(/APP_SYNC_VERSION = (\d+)/)||[])[1], 10) >= 917);

console.log('\n— 5. la pantalla —');
const zR = ex('function renderGastos(');
ok('la pestaña GASTOS muestra las cuentas por pagar', /_cuentasPorPagar\(/.test(zR));
ok('dice desde qué fecha se cuenta el vencimiento', /base/.test(zR));
ok('marca lo vencido', /VENCID/i.test(zR));
ok('deja registrar el pago', /_registrarPagoProv/.test(zR));

console.log('\n— 6. bodega central: existencia, nombre y precio reales —');
/* Antonio: "cuando se pida como proveedor bodega central se haga una busqueda para ver si esta
   ese producto en existencia... y de una vez se le pone el nombre registrado del producto en la
   bodega... y el precio correcto segun lo que esta en la bodega central." */
const zB = ex('function _bodegaBuscarMaterial(');
ok('existe la búsqueda en bodega', zB.length > 100);
ok('devuelve nombre, saldo y precio', /name:/.test(zB) && /saldo:/.test(zB) && /precio:/.test(zB));
ok('respeta las equivalencias de nombre de la limpia (v1010)', /_matAliasCanon/.test(zB));
const zUp = ex('function updateOcItemProveedor(');
ok('al elegir bodega se busca de verdad', /_bodegaBuscarMaterial\(/.test(zUp));
ok('el nombre de la bodega manda', /item\.name = _res\.name/.test(zUp));
ok('y toma el precio con que entró', /item\.precio = _res\.precio/.test(zUp));
ok('avisa si no alcanza la existencia', /SE DESPACHA LO QUE HAYA/.test(zUp));
/* v1017: si no está con ESE nombre, casi siempre es un problema de nombre y no de
   existencia: se ofrecen los parecidos que sí hay en vez de solo negar */
ok('si no está con ese nombre, ofrece los parecidos', /_bodegaPedirMatch\(/.test(zUp));
/* la equivalencia se sigue en LOS DOS SENTIDOS: el saldo puede estar guardado bajo cualquiera
   de los dos nombres, según con cuál se cargó la existencia */
ok('busca por el canónico y por sus hermanos', /_matAliasMap\(\)/.test(zB));
const zCand = ex('function _bodegaCandidatosParecidos(');
ok('los parecidos salen por palabras en común', zCand.length > 100 && /indexOf\(w\)/.test(zCand));
ok('solo ofrece lo que de verdad hay en existencia', /saldo\) > 0/.test(zCand));
ok('elegir uno deja declarada la equivalencia', /_matFixAdd\(/.test(ex('window._bodegaUnirYUsar = function')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
