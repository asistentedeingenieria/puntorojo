/* v1189 — LA RECETA YA CUENTA EN PRESENTACIONES: NO SE CONVIERTE DOS VECES

   EL CASO (11-ago, pedido VLA-19): la receta dice "CIENTO DE TORNILLO DE 1" PUNTA FINA: 38"
   — 38 CIENTOS (3,800 tornillos), porque la receta cuenta por NOMBRE DE COMPRA (v905: nc).
   Pero la conversión v1161 (pensada para pedidos MANUALES, donde el supervisor pide
   unidades) trató el 38 como unidades: ceil(38/100) = 1 ciento. La OC salía con UN ciento
   donde la obra necesita TREINTA Y OCHO.

   EL FIX: la conversión se salta cuando el pedido es DE RECETA (esDeReceta o recetaQty —
   los viejos no llevan el flag pero sí recetaQty). En manuales todo sigue igual: 500
   unidades de tornillo → 5 CIENTOS con el factor recordado en la línea (v1161 intacto). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const bld = ex(code, 'function buildPedidoOcItems(');
ok('buildPedidoOcItems existe', !!bld);

console.log('— la puerta: receta NO se re-convierte —');
ok('detecta pedido de receta por flag O por recetaQty (los viejos no llevan flag)',
  /const _presYaConvertida = !!\(pd && \(pd\.esDeReceta \|\| pd\.recetaQty\)\)/.test(bld));
ok('la conversión v1161 queda SOLO para manuales', /if \(_pf && it\.qty > 0 && !_presYaConvertida\)/.test(bld));
ok('la conversión en sí no cambió (manuales intactos: ceil, factor y unidades recordadas)',
  /it\.qtyUnidades = it\.qty;/.test(bld) && /it\.qty = Math\.ceil\(it\.qty \/ _pf\.factor\);/.test(bld));

console.log('\n— _presFactor sigue puro e intacto (v1161) —');
const srcPf = ex(code, 'function _presFactor(');
if (srcPf) {
  const f = new Function(srcPf + '\nreturn _presFactor;')();
  ok('CIENTO DE → factor 100', f('CIENTO DE TORNILLO DE 1" PUNTA FINA').factor === 100);
  ok('material suelto → null', f('CLAVO CON ROLDANA 1"') === null);
  /* v1190 (Antonio): "cada tira trae 10" — 100 fulminantes pedidos a mano = 10 tiras en la OC.
     Mismo 10 que la receta usa desde v978. La receta NO se re-convierte (puerta v1189). */
  const _fu = f('FULMINANTE TIRA CAL. 27 AMARILLO');
  ok('FULMINANTE TIRA → factor 10 (v1190)', _fu && _fu.factor === 10 && /TIRA/.test(_fu.etiqueta));
  ok('100 fulminantes manuales → 10 tiras', Math.ceil(100 / _fu.factor) === 10);
  ok('otro material con TIRA en el nombre pero sin FULMINANTE no se toca', f('TIRA DE MADERA 8\'') === null);
}

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
