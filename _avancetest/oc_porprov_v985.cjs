/* v985 (pedido de Antonio 26-jul): cuando un pedido genera VARIAS órdenes de compra,
   cada PROVEEDOR depende de su propia logística — la FECHA DE ENTREGA y la FORMA DE
   PAGO se pueden fijar POR PROVEEDOR en las tarjetas del resumen (PRODUCTOS —
   PROVEEDOR Y PRECIO UNITARIO); lo no tocado hereda lo general del modal. El despacho
   de BODEGA CENTRAL no lleva estos controles (no es compra). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── el estado por proveedor y su reset al abrir el modal ──
ok('mapa _ocPorProv por proveedor', /window\._ocPorProv/.test(html));
ok('se resetea al abrir el modal', /window\._ocPorProv = \{\}/.test(html));

// ── las tarjetas del resumen llevan los controles ──
const zR = ex('function renderOcItems(');
ok('cada tarjeta de proveedor lleva FECHA DE ENTREGA propia', /type="date"/.test(zR) && /_ocPorProvSet\(/.test(zR));
ok('y FORMA DE PAGO propia (mismas opciones que la general)', /ocFormaPago/.test(zR) && /formaPago/.test(zR));
ok('el despacho de BODEGA no lleva controles', /_bodega/.test(zR));

// ── al generar, cada OC toma lo suyo con fallback a lo general ──
const iGen = html.indexOf('providerIds.forEach((provId, idx)');
const zGen = html.slice(iGen, iGen + 10000)/* v1201: herramientas; v1282: →10000, la ORDEN DE RENTA nace dentro del lazo */;
ok('fecha de entrega por proveedor con fallback', /_pp\.fechaEntrega \? _fechaInputALatam\(_pp\.fechaEntrega\) : fechaEntregaNueva/.test(zGen));
ok('forma de pago por proveedor con fallback', /_pp\.formaPago \|\| formaPago/.test(zGen));

// ── cuentas bancarias por proveedor (hoja PROVEEDOR del Excel) ──
ok('tabla CUENTAS_PROVEEDORES con 50+ entradas', (html.match(/\{n:"/g) || []).length >= 50 && /const CUENTAS_PROVEEDORES = \[/.test(html));
const zC = ex('function _cuentaDeProveedor(');
let fC = null;
try { fC = new Function('_getProveedores', 'CUENTAS_PROVEEDORES', 'return (' + zC + ')'); } catch(e){}
if (fC) {
  const TAB = [{ n:'SISTEGUA, S.A.', c:'400-022540-9', t:'MONETARIA', b:'INDUSTRIAL' }];
  const f1 = fC(() => [], TAB);
  ok('cae a la tabla del Excel cuando la ficha está vacía', (f1('sistegua, s.a.') || {}).numeroCuenta === '400-022540-9');
  const f2 = fC(() => [{ nombre:'SISTEGUA, S.A.', pago:{ numeroCuenta:'999', tipoCuenta:'ahorro', banco:'bam' } }], TAB);
  const r2 = f2('SISTEGUA, S.A.') || {};
  ok('la ficha del proveedor en la app MANDA sobre la tabla', r2.numeroCuenta === '999' && r2.tipoCuenta === 'AHORRO' && r2.banco === 'BAM');
  ok('proveedor sin cuenta → null (no imprime bloque)', fC(() => [], TAB)('OTRO, S.A.') === null);
} else ok('_cuentaDeProveedor evaluable', false);
// el doc imprime el bloque con CONTADO/TRANSFERENCIA
ok('la OC imprime la cuenta con CONTADO o TRANSFERENCIA', /CONTADO\|TRANSFERENCIA/.test(html) && /_cuentaDeProveedor\(oc\.proveedorNombre\)/.test(html));
ok('bloque centrado: nombre / cuenta / tipo / banco', /CUENTA \$\{_cb\.tipoCuenta\}/.test(html) && /BANCO \$\{_cb\.banco\}/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
