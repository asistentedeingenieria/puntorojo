/* v969 (pedidos de Antonio 23-jul):
   1. ABASTECER no considera NADA de la receta ("no tiene nada que ver") — fuera la
      columna TOTAL RECETA, el sugerido (data-bsug) y la mención en el texto. La receta
      solo entra cuando la OC de obra elige que un producto salga de bodega (despacho).
   2. Unidad derivada del NOMBRE de compra (el Excel no traía columna de unidad): CAJA,
      SACO, CUB→CUBETA, GAL→GALÓN, ROLLO, LB→LIBRA, PAR, CIENTO... y 'UND' para lo demás.
      La unidad real de la receta (si existe) tiene prioridad sobre la derivada. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFrom(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. ABASTECER sin receta ──
const zAb = extractFrom('function _abrirModalBodega(');
ok('sin columna TOTAL RECETA', !/TOTAL RECETA/.test(zAb));
ok('sin sugerido de receta (data-bsug)', !/data-bsug/.test(zAb) && !/total de la receta/i.test(zAb));
ok('el prefill de FALTANTES (por saldo) se queda', /_bodegaSaldos/.test(zAb));

// ── 2. unidad derivada del nombre ──
const uSrc = extractFrom('function _bodegaUnidadDelNombre(');
ok('_bodegaUnidadDelNombre existe', !!uSrc);
let uFn = null;
try { uFn = new Function('return (' + uSrc + ')')(); } catch(e){}
ok('evaluable', typeof uFn === 'function');
if (typeof uFn === 'function') {
  ok('CAJA', uFn('PASTA REDIMIX USG 21.8 KG CAJA') === 'CAJA');
  ok('CUB → CUBETA', uFn('ADITIVO MEJORADOR SIKALATEX-N CUB') === 'CUBETA');
  ok('GAL → GALÓN', uFn('ADITIVO MEJORADOR SIKALATEX-N GAL') === 'GALÓN');
  ok('LBS → LIBRA', uFn('LBS. ALAMBRE GALVANIZADO CAL. 14') === 'LIBRA');
  ok('CIENTO', uFn('CIENTO DE TORNILLO DE 1" PUNTA FINA') === 'CIENTO');
  ok('ROLLO', uFn('ROLLO NYLON NEGRO (72"X60m)') === 'ROLLO');
  ok('SACO', uFn('SACO POLVO DE MARMOL ORDINARIO') === 'SACO');
  ok('lo demás es UND', uFn('TABLA DUROCK ½” X 4’ X 8’') === 'UND');
}
// _bodegaProductosGlobal rellena la unidad vacía con la derivada (receta manda si existe)
const gSrc = extractFrom('function _bodegaProductosGlobal(');
ok('el catálogo global deriva unidades', /_bodegaUnidadDelNombre/.test(gSrc));
const normSrc = extractFrom('function normOcName(');
const memSrc = extractFrom('function _ocItemMemKey(');
let gFn = null;
try {
  gFn = new Function('state', 'CATALOGO_COMPRAS',
    normSrc + '\n' + memSrc + '\n' + uSrc + '\nfunction _bodegaProductosDeReceta(p){ return []; }\nreturn (' + gSrc + ')'
  )({ projects: [] }, [{ cat: 'X', interno: 'PASTA CAJA', compras: ['PASTA REDIMIX USG 21.8 KG CAJA'] }]);
} catch(e){}
if (typeof gFn === 'function') {
  const p1 = gFn()[0];
  ok('fila del catálogo sale con unidad derivada', p1 && p1.u === 'CAJA');
} else { ok('_bodegaProductosGlobal evaluable con derivación', false); }
// los movimientos también la usan de fallback
ok('_bodegaUnidadDe cae a la derivada', /_bodegaUnidadDelNombre/.test(extractFrom('function _bodegaUnidadDe(')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
