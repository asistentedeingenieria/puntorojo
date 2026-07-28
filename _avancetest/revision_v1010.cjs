/* v1010 — ARREGLOS DE LA REVISIÓN ADVERSARIAL (30 hallazgos confirmados de 37).
   Los cuatro que impedían desplegar:

   1. XSS ALMACENADO. El nombre y la unidad del material se interpolaban CRUDOS en tres
      pantallas. La vía real no es teórica: recetaV2Solicitar toma el nombre de un prompt
      libre (permiso receta.edit), al aprobarse queda en la receta, _bodegaProductosDeReceta
      lo mete en la lista y —como ningún proveedor lo tiene— cae justo en la pantalla de
      limpia, que SOLO abre quien tiene users.manage. O sea: lo escribe un encargado y se
      ejecuta en la sesión del administrador. Regresión del blindaje v849.
   2. RENDIMIENTO. v1010 construyó el índice de precios porque _provsDelProducto es un triple
      bucle, pero CARGAR EXISTENCIAS quedó en el camino viejo: con la lista ampliada serían
      ~900 filas × ~658 productos de catálogo en un solo string síncrono.
   3. LA FUSIÓN PERDÍA EL PRECIO. Al unir AGUA PURIFICADA (Q23 de HINCAPIE) hacia
      AGUA SALVAVIDAS (sin proveedor), la fila resultante quedaba en '—': exactamente lo
      contrario de lo que pidió Antonio.
   4. LA FUSIÓN PERDÍA EL SALDO. Los movimientos de bodega están sellados con la clave del
      nombre original; al colapsar la fila, la existencia quedaba huérfana y el pre-llenado
      de faltantes dejaba de funcionar. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. XSS: ninguna pantalla interpola el nombre crudo —');
[['la limpia', 'function _abrirLimpiaCatalogo('],
 ['ABASTECER', 'function _abrirModalBodega('],
 ['el panel de bodega', 'function _abrirPanelBodega(']].forEach(([nom, fn]) => {
  const z = ex(fn);
  ok(nom + ' escapa el nombre del material', z.length > 200 && !/\$\{x\.name\}/.test(z));
  ok(nom + ' escapa la unidad', !/\$\{x\.u \|\| ''\}/.test(z) && !/\$\{x\.u \? ' · ' \+ x\.u/.test(z));
});
/* el cableado por índice (v740) NO se toca: los nombres nunca van en un onclick */
ok('los nombres siguen fuera de los onclick', !/onclick="[^"]*\$\{x\.name\}/.test(html));

console.log('\n— 2. CARGAR EXISTENCIAS usa el índice, no el triple bucle —');
const zCarga = ex('function _abrirCargaExistencias(');
ok('ya no llama _provsDelProducto por fila', !/_provsDelProducto\(x\.name\)/.test(zCarga));
ok('usa el índice cacheado', /_precioIndexProv\(\)/.test(zCarga));
ok('y lo refresca al abrir', /_precioIndexReset\(\)/.test(zCarga));

console.log('\n— 3. la fusión conserva el precio y el saldo —');
const zProds = ex('function _bodegaProductosGlobal(');
ok('el precio se busca también por los nombres unidos', /_nombres/.test(zProds) && /x\.keys/.test(zProds));
ok('la fila arrastra las claves fusionadas', /destino.keys/.test(zProds));

// se comporta: unir un material CON precio hacia uno SIN precio deja precio en la fila
const FIX = [{ id:'f1', tipo:'ALIAS', key:'AGUA PURIFICADA GARRAFON', hacia:'AGUA PURA SALVAVIDAS GARRAFON', _ts:1 }];
const PROVS = [{ id:'p1', nombre:'HINCAPIE', productos:[{ nombre:'AGUA PURIFICADA GARRAFON', unidad:'UND', precio:23 }] }];
const ctx = {
  CATALOGO_COMPRAS: [{ cat:'X', interno:'AGUA', compras:['AGUA PURA SALVAVIDAS GARRAFON'] }],
  state: { projects: [], proveedoresGlobales: PROVS, matFix: FIX },
  _getProveedores: () => PROVS,
  _matFixStore: () => FIX,
  _ocItemMemKey: s => String(s||'').toUpperCase().replace(/\s+/g,' ').trim(),
  normOcName: s => String(s||'').toUpperCase().replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim(),
  _bodegaUFmt: u => (u ? String(u).toUpperCase() : ''),
  _bodegaUnidadDelNombre: () => 'UND',
  _bodegaProductosDeReceta: () => [],
};
let prods = null;
try {
  const src = ['let _precioIdxCache = null;',
    ex('function _precioIndexProv('), ex('function _precioIndexReset('),
    ex('function _matAliasMap('), ex('function _matAliasCanon('), ex('function _matEstaOculto('),
    ex('function _matFixReset('), zProds].filter(Boolean).join('\n');
  prods = new Function(...Object.keys(ctx), src + '\n return _bodegaProductosGlobal();')(...Object.values(ctx));
} catch(e){ console.log('   (no evaluable: ' + e.message + ')'); }

if (prods) {
  const agua = prods.filter(x => /AGUA/.test(x.name));
  ok('el agua sale UNA sola vez', agua.length === 1);
  ok('con el nombre canónico que eligió Antonio', agua[0] && /SALVAVIDAS/.test(agua[0].name));
  ok('Y CON EL PRECIO del material que unió', agua[0] && Number(agua[0].precio) === 23);
  ok('sabiendo de qué proveedor viene', agua[0] && /HINCAPIE/.test(String(agua[0].provNombre || '')));
  ok('el nombre unido queda como alias de búsqueda', agua[0] && /PURIFICADA/.test(String(agua[0].alias || '')));
  ok('y la fila recuerda las claves fundidas (para el saldo)', agua[0] && Array.isArray(agua[0].keys) && agua[0].keys.length === 2);
} else {
  ['una vez','canónico','precio','proveedor','alias','claves'].forEach(n => ok(n + ' (evaluable)', false));
}

console.log('\n— 4. el saldo del material unido no queda huérfano —');
const zModal = ex('function _abrirModalBodega(');
ok('el pre-llenado suma el saldo de todas las claves fundidas', /x\.keys/.test(zModal));

console.log('\n— 5. lo barato que igual conviene —');
ok('_matEstaOculto está cacheado como el de alias', /_matEstaOculto\._cache/.test(html));
/* los cachés cuelgan de la propia función, no de variables sueltas: así cada una se puede
   extraer y evaluar aislada — cinco tests viejos se rompieron por eso y quedó como regla */
ok('los cachés son autocontenidos', /_matAliasMap\._cache/.test(html) && !/let _matAliasCache/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
