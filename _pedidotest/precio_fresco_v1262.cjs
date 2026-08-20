/* v1262 (Antonio, 18-ago: "a compras NO le sale bien la madera del catálogo y NO salen
   los precios que ya se cambiaron" — el catálogo dice Q80.816 y la OC ofrecía Q79.11):
   CAUSA RAÍZ: el índice de precios por proveedor se cachea (_precioIdxCache) y solo se
   reseteaba al abrir bodega/carga/limpia/import — NUNCA al abrir GENERAR OC ni cuando
   LLEGAN datos remotos (el merge de proveedores) ni al autorizar una solicitud de precio.
   Compras trabajaba con el índice congelado de su sesión.
   Mismo remedio que el precedente de matFix ("el índice quedó viejo tras el merge", 10890):
   1. openOrdenCompra resetea al abrir (índices frescos, patrón v1010).
   2. applyRemote resetea tras el merge de proveedoresGlobales.
   3. autorizarSolicitudPrecio resetea al escribir el precio nuevo. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

ok('openOrdenCompra abre con el índice de precios FRESCO', /_precioIndexReset\(\)/.test(ex('function openOrdenCompra(')));
ok('applyRemote resetea el índice tras el merge de proveedores', (function(){
  const i = html.indexOf('merged.proveedoresGlobales = _mProv.list');
  return i > 0 && /_precioIndexReset\(\)/.test(html.slice(i, i + 500)); })());
ok('autorizar una solicitud de precio refresca el índice', /_precioIndexReset\(\)/.test(ex('function autorizarSolicitudPrecio(')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
