/* v960 (feedback de Antonio sobre v959): la bodega central es GENERAL, no por proyecto.
   - UN solo botón en la toolbar (BODEGA CENTRAL); ABASTECER vive DENTRO del panel.
   - El catálogo de compra (_bodegaProductosGlobal) une las recetas de TODOS los proyectos.
   - La recepción no depende del proyecto activo: _bodegaFindOc busca la OC en todos los
     proyectos y el panel lista las OCs POR RECIBIR con su botón. */
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
// ── 1. UN solo botón en la toolbar de PEDIDOS ──
const botonesPanel = (html.match(/data-perm="[^"]*"[^>]*onclick="_abrirPanelBodega\(\)"/g) || []).length;
const botonesAbastecerToolbar = (html.match(/data-perm="[^"]*"[^>]*onclick="_abrirModalBodega\(\)"/g) || []).length;
ok('botón BODEGA CENTRAL en la toolbar', botonesPanel === 1);
ok('SIN botón ABASTECER suelto en la toolbar', botonesAbastecerToolbar === 0);
// ...pero ABASTECER sigue accesible desde el panel
const zPanel = extractFrom('function _abrirPanelBodega(');
ok('ABASTECER vive dentro del panel', /_abrirModalBodega\(\)/.test(zPanel));

// ── 2. catálogo GLOBAL: unión de recetas de todos los proyectos ──
const gSrc = extractFrom('function _bodegaProductosGlobal(');
ok('_bodegaProductosGlobal existe', !!gSrc);
const recSrc = extractFrom('function _bodegaProductosDeReceta(');
const normSrc = extractFrom('function normOcName(');
const memSrc = extractFrom('function _ocItemMemKey(');
let gFn = null;
const fakeReceta = (nombre, total) => ({ materiales: { recetaV2: { niveles: { L1: { 0: [{ m: nombre, u: 'UND', tn: total, aptos: {} }] } } } } });
const fakeState = { projects: [ fakeReceta('PLANCHA 1/2"', 10), fakeReceta('PLANCHA 1/2"', 5), fakeReceta('MASILLA', 3) ] };
try {
  // v968/v970: el catálogo global ahora usa CATALOGO_COMPRAS + derivación/normalización de unidad
  gFn = new Function('state', 'CATALOGO_COMPRAS',
    normSrc + '\n' + memSrc + '\n' + recSrc + '\n' + extractFrom('function _bodegaUnidadDelNombre(') + '\n' + extractFrom('function _bodegaUFmt(') + '\n' + _v1010deps + '\nreturn (' + gSrc + ')'
  )(fakeState, []);
} catch(e){}
ok('_bodegaProductosGlobal evaluable', typeof gFn === 'function');
if (typeof gFn === 'function') {
  const prods = gFn();
  ok('une por clave canónica (2 materiales, no 3)', prods.length === 2);
  const plancha = prods.find(x => /PLANCHA/.test(x.name));
  ok('suma los totales entre proyectos', plancha && plancha.total === 15);
}
// los dos consumidores usan el catálogo global
ok('_abrirModalBodega usa el catálogo global', /_bodegaProductosGlobal\(\)/.test(extractFrom('function _abrirModalBodega(')));
ok('el panel usa el catálogo global', /_bodegaProductosGlobal\(\)/.test(zPanel));

// ── 3. recepción multi-proyecto ──
const fSrc = extractFrom('function _bodegaFindOc(');
ok('_bodegaFindOc existe y recorre todos los proyectos', !!fSrc && /state\.projects|state && state\.projects/.test(fSrc));
ok('_ocAbrirRecibido busca en todos los proyectos', /_bodegaFindOc/.test(extractFrom('function _ocAbrirRecibido(')));
ok('_ocConfirmarRecibido busca en todos los proyectos', /_bodegaFindOc/.test(extractFrom('function _ocConfirmarRecibido(')));

// ── 4. panel con sección POR RECIBIR ──
ok('helper _bodegaOcsPorRecibir existe', !!extractFrom('function _bodegaOcsPorRecibir('));
ok('el panel lista POR RECIBIR con su botón', /POR RECIBIR/.test(zPanel) && /_ocAbrirRecibido/.test(zPanel));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
