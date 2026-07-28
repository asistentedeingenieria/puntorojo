/* v1010 (pedido de Antonio 28-jul):
   "mi abastecer bodega debe de estar en todo momento actualizado con mi catalogo de precios.
    Necesito que jale TODA la informacion con todo y precios."

   CAUSA RAÍZ (workflow de trazas): _bodegaProductosGlobal() tenía DOS fuentes — la constante
   hard-codeada CATALOGO_COMPRAS (246 nombres, foto congelada del Excel del 23-jul) y las
   recetas — y NUNCA consultaba state.proveedoresGlobales, donde viven los ~658 productos con
   precio. Por eso AGUA PURIFICADA GARRAFON de TIENDA DE CONVENIENCIA HINCAPIE no aparecía, y
   por eso no había columna de precio: el objeto de fila ni siquiera tenía el campo.
   Peor: cada Excel de precios que sube Antonio agranda el catálogo y deja la constante igual,
   así que la brecha CRECE con cada importación.

   El patrón ya existía a 300 líneas: CARGAR EXISTENCIAS jala precios con _provsDelProducto
   desde v993. Esto lo replica en ABASTECER. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zProds = ex('function _bodegaProductosGlobal(');
const zModal = ex('function _abrirModalBodega(');
const zIdx   = ex('function _precioIndexProv(');

// ── 1. la tercera fuente existe ──
ok('_bodegaProductosGlobal consulta el catálogo de proveedores', /_precioIndexProv\(|_getProveedores\(/.test(zProds));
ok('hay un índice de precios cacheado', zIdx.length > 40);
ok('el índice se puede invalidar', html.includes('function _precioIndexReset('));
/* TRAMPA: _catUnidadIndex() YA llama a _bodegaProductosGlobal() para llenar la columna
   UNIDAD del catálogo maestro. Si ahora _bodegaProductosGlobal pidiera la unidad AUTO del
   catálogo, el ciclo se cierra y se cuelga. Debe leer prod.unidad CRUDO. */
ok('no se cierra el ciclo con la unidad automática', !/_catUnidadAuto\(|_catUnidadIndex\(/.test(zProds));

// ── 2. se comporta: el producto que solo vive en un proveedor APARECE, con su precio ──
const CATALOGO_FAKE = [{ cat:'SEGURIDAD', interno:'ECOFILTRO / AGUA PURIFICADA', compras:['AGUA PURA SALVAVIDAS GARRAFON'] }];
const PROVS_FAKE = [
  { id:'p1', nombre:'TIENDA DE CONVENIENCIA HINCAPIE, S.A.', productos:[{ nombre:'AGUA PURIFICADA GARRAFON', unidad:'UND', precio:23 }] },
  { id:'p2', nombre:'SISTEGUA, S.A.', productos:[
      { nombre:'LAMINA DE FIBROCEMENTO 1/2 X 4 X 8', unidad:'', precio:180 },
      { nombre:'AGUA PURIFICADA GARRAFON', unidad:'UND', precio:19.5 },
      { nombre:'TORNILLO SIN PRECIO', unidad:'UND', precio:0 } ]},
];
const ctx = {
  CATALOGO_COMPRAS: CATALOGO_FAKE,
  state: { projects: [], proveedoresGlobales: PROVS_FAKE },
  _getProveedores: () => PROVS_FAKE,
  _ocItemMemKey: s => String(s||'').toUpperCase().replace(/\s+/g,' ').trim(),
  normOcName: s => String(s||'').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\(.*?\)/g,'').replace(/[^A-Z0-9½¼¾\.\"\' X]/g,' ').replace(/\s+/g,' ').trim(),
  _bodegaUFmt: u => (u ? String(u).toUpperCase() : ''),
  _bodegaUnidadDelNombre: () => 'UND',
  _bodegaProductosDeReceta: () => [],
  _matAliasCanon: n => n,
  _matEstaOculto: () => false,
};
let prods = null;
try {
  // el caché vive fuera de las funciones extraídas: se declara acá para poder evaluarlas
  const src = ['let _precioIdxCache = null;', zIdx, ex('function _precioIndexReset('), zProds].filter(Boolean).join('\n');
  const f = new Function(...Object.keys(ctx), src + '\n return _bodegaProductosGlobal();');
  prods = f(...Object.values(ctx));
} catch(e){ console.log('   (no evaluable: ' + e.message + ')'); }

if (prods) {
  const agua = prods.filter(x => /AGUA PURIFICADA/.test(x.name));
  const lamina = prods.find(x => /FIBROCEMENTO/.test(x.name));
  ok('el producto que SOLO está en el catálogo de precios aparece', agua.length >= 1);
  ok('trae su precio', agua[0] && Number(agua[0].precio) === 19.5);
  ok('con varios proveedores muestra el MÁS BARATO (igual que la OC)', agua[0] && agua[0].precio === 19.5);
  ok('y avisa cuántos proveedores lo venden', agua[0] && Number(agua[0].nProv) === 2);
  ok('la unidad sale del proveedor cuando la tiene', agua[0] && agua[0].u === 'UND');
  ok('el material sin unidad cae al clasificador por nombre', lamina && lamina.u === 'UND');
  ok('el producto con precio 0 no inventa un precio', (prods.find(x => /SIN PRECIO/.test(x.name)) || {}).precio == null);
  ok('lo que ya estaba del Excel de compras NO se pierde', prods.some(x => /SALVAVIDAS/.test(x.name)));
} else {
  ['aparece','precio','más barato','nProv','unidad prov','unidad nombre','precio 0','no se pierde'].forEach(n => ok(n + ' (evaluable)', false));
}

/* "EN TODO MOMENTO ACTUALIZADO": el caché solo debe vivir mientras dura una apertura del
   modal — sirve para no repetir el triple bucle fila por fila, no para guardar precios entre
   sesiones. Si sobrevive, Antonio edita un precio y ABASTECER le sigue mostrando el viejo. */
ok('el caché se tira al abrir ABASTECER', /_precioIndexReset\(\)/.test(zModal));
ok('y al importar el Excel de precios', (html.match(/_precioIndexReset\(\)/g) || []).length >= 3);

// ── 3. la pantalla muestra el precio ──
ok('la grilla de ABASTECER tiene una columna más', /grid-template-columns:34px minmax\(0,1fr\) \d+px 110px/.test(zModal));
ok('el encabezado dice PRECIO', /<span[^>]*>PRECIO/.test(zModal) || zModal.includes('>PRECIO<'));
ok('la fila pinta el precio del material', /x\.precio/.test(zModal));

// ── 4. LEE, NUNCA ESCRIBE (state.proveedoresGlobales viaja por LAST-WRITE-WINS) ──
/* Sin union-merge ni tombstones: cualquier escritura disparada por abrir el modal puede pisar
   el catálogo que otro editó en otro dispositivo. Misma regla que fijó v994. */
ok('abrir ABASTECER no guarda estado', !/saveState\(\)/.test(zModal));
ok('ni sube nada a la nube', !/forceUploadNow/.test(zModal));
ok('el índice no muta los productos del catálogo', !/\.unidad\s*=|\.precio\s*=/.test(zIdx));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
