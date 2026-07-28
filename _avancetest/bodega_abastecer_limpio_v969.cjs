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


const _v1010deps = `
let _precioIdxCache = null;
function _getProveedores(){ try { return (state && state.proveedoresGlobales) || []; } catch(e){ return []; } }
function _matFixStore(){ try { return (state && state.matFix) || []; } catch(e){ return []; } }
function _precioIndexReset(){ _precioIdxCache = null; }
function _precioIndexProv(){
  if (_precioIdxCache) return _precioIdxCache;
  const idx = {};
  (_getProveedores() || []).forEach(prv => {
    (prv.productos || []).forEach(pr => {
      if (!pr || !pr.nombre) return;
      const precio = Number(pr.precio) || 0;
      if (precio <= 0) return; // sin precio no entra (mismo criterio que _provsDelProducto v990)
      const k = normOcName(pr.nombre);
      if (!k) return;
      (idx[k] = idx[k] || []).push({ id: prv.id, nombre: prv.nombre, precio: precio, unidad: pr.unidad || '', prodNombre: pr.nombre });
    });
  });
  Object.keys(idx).forEach(k => idx[k].sort((a, b) => a.precio - b.precio)); // el más barato primero, igual que findBestProviderForItem
  _precioIdxCache = idx;
  return idx;
}
function _matAliasMap(){
  if (_matAliasMap._cache) return _matAliasMap._cache;
  const m = {};
  (_matFixStore() || []).forEach(f => { if (f && f.tipo === 'ALIAS' && f.key && f.hacia) m[f.key] = f.hacia; });
  _matAliasMap._cache = m;
  return m;
}
function _matAliasCanon(key){
  const m = _matAliasMap();
  let k = key, n = 0;
  /* Sigue la cadena A→B→C hasta el final. El tope de saltos es por si alguien declara un
     círculo (A→B y después B→A): sin él, el while se cuelga para siempre. */
  while (m[k] && m[k] !== k && n < 20) { k = m[k]; n++; }
  return k;
}
function _matEstaOculto(key){
  /* cacheado como el de alias: el colapso lo llama DOS veces por clave dentro del bucle
     caliente, y un .some() lineal sobre matFix por cada una se nota con la lista ampliada */
  if (!_matEstaOculto._cache) {
    const c = {};
    (_matFixStore() || []).forEach(f => { if (f && f.tipo === 'OCULTO' && f.key) c[f.key] = 1; });
    _matEstaOculto._cache = c;
  }
  return !!_matEstaOculto._cache[key];
}
function _matFixReset(){ _matAliasMap._cache = null; _matEstaOculto._cache = null; }
`;
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
    normSrc + '\n' + memSrc + '\n' + uSrc + '\n' + extractFrom('function _bodegaUFmt(') + '\nfunction _bodegaProductosDeReceta(p){ return []; }' + _v1010deps + '\nreturn (' + gSrc + ')'
  )({ projects: [] }, [{ cat: 'X', interno: 'PASTA CAJA', compras: ['PASTA REDIMIX USG 21.8 KG CAJA'] }]);
} catch(e){}
if (typeof gFn === 'function') {
  const p1 = gFn()[0];
  ok('fila del catálogo sale con unidad derivada', p1 && p1.u === 'CAJA');
} else { ok('_bodegaProductosGlobal evaluable con derivación', false); }
// los movimientos también la usan de fallback
ok('_bodegaUnidadDe cae a la derivada', /_bodegaUnidadDelNombre/.test(extractFrom('function _bodegaUnidadDe(')));

// ── 3. v970: U ≡ UND (duda de Antonio) — los sinónimos de pieza se muestran igual ──
const fSrc = extractFrom('function _bodegaUFmt(');
ok('_bodegaUFmt existe', !!fSrc);
let fFn = null;
try { fFn = new Function('return (' + fSrc + ')')(); } catch(e){}
if (typeof fFn === 'function') {
  ok("'U' de receta se muestra UND", fFn('U') === 'UND' && fFn('u') === 'UND' && fFn('PZA') === 'UND');
  ok('otras unidades pasan tal cual', fFn('saco') === 'SACO' && fFn('CIENTO') === 'CIENTO');
  ok('vacío queda vacío', fFn('') === '');
} else { ok('_bodegaUFmt evaluable', false); }
ok('el catálogo global la aplica', /_bodegaUFmt/.test(extractFrom('function _bodegaProductosGlobal(')));
ok('los movimientos la aplican', /_bodegaUFmt/.test(extractFrom('function _bodegaUnidadDe(')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
