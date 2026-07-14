/* v922 (reporte "los montos NO cuadran" + decisión de Antonio: los precios YA INCLUYEN IVA):
   La app sumaba 12% ENCIMA del precio (fila Q312.18 vs total Q349.64). Ahora:
   - _ocTotalesIvaIncluido(items): total = suma directa qty×precio; desglose informativo
     base = total/1.12, IVA = total − base.
   - chips de renderOcItems y updateOcTotal sin ×1.12 (todo cuadra con las filas).
   - generarOrdenCompra usa el helper + marca oc.ivaIncluido = true.
   - PDF: en OCs nuevas el desglose dice SUBTOTAL (SIN IVA) / IVA 12% (INCLUIDO) / TOTAL.
   Las OCs VIEJAS no se tocan (sus totales quedaron como se autorizaron). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('async function '+name+'('); if(m<0) m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
const casi = (a,b) => Math.abs(a-b) < 0.005;

// ── 1. helper puro ──
const src = extractFn('_ocTotalesIvaIncluido');
ok('_ocTotalesIvaIncluido existe', !!src);
if (src) {
  const f = new Function(src + '\nreturn _ocTotalesIvaIncluido;')();
  const r = f([{ qty: 129, precio: 2.42 }]);
  ok('total = suma directa (caso de la lija: 312.18, no 349.64)', casi(r.total, 312.18));
  ok('desglose: base sin IVA = total/1.12', casi(r.subtotal, 278.7321));
  ok('desglose: IVA = total − base', casi(r.ivaMonto, 33.4479) && casi(r.subtotal + r.ivaMonto, r.total));
  const v = f([]);
  ok('vacío → ceros', v.total === 0 && v.subtotal === 0 && v.ivaMonto === 0);
}

// ── 2. la pantalla ya no infla ×1.12 ──
ok('chips de proveedor sin ×1.12', !/groups\[key\]\.total \+= \(Number\(it\.qty\)\|\|0\) \* \(Number\(it\.precio\)\|\|0\) \* 1\.12/.test(html));
const srcTot = extractFn('updateOcTotal');
ok('updateOcTotal usa el helper (suma directa)', /_ocTotalesIvaIncluido/.test(srcTot) && !/\* 0\.12/.test(srcTot));
ok('el total avisa IVA INCLUIDO', /IVA INCLUIDO/.test(srcTot));

// ── 3. generar y PDF ──
const srcGen = extractFn('generarOrdenCompra');
ok('generarOrdenCompra usa el helper', /_ocTotalesIvaIncluido/.test(srcGen) && !/subtotal \* 0\.12/.test(srcGen));
ok('la OC nueva queda marcada ivaIncluido', /ivaIncluido: true/.test(srcGen));
const srcPrint = extractFn('printOrdenCompra');
ok('PDF: desglose etiquetado como IVA incluido en OCs nuevas', /INCLUIDO/.test(srcPrint) && /ivaIncluido/.test(srcPrint));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
