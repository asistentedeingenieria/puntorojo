/* v936 (flujo BODEGA CENTRAL — explicación de Antonio):
   El supervisor pide su etapa COMPLETA sin saber qué materiales se manejan en oficina;
   solo compras lo sabe. CAUSA de que "no quedó bien": en autoAssignOcProviders el
   CATÁLOGO de precios gana primero, y los materiales de bodega SÍ tienen precio en el
   catálogo → siempre se asignaban al proveedor del catálogo (la memoria '_bodega' de
   v921 solo aplicaba sin match). Fix en 3 piezas:
   (1) LISTA GLOBAL DE MATERIALES DE BODEGA (state.bodegaItemsGlobal, key=_ocItemMemKey,
       administran compras.autorizar/users.manage) — decisión: GLOBAL, todas las obras.
   (2) autoAssignOcProviders: la lista de bodega gana ANTES que el catálogo → esos
       items salen pre-asignados a BODEGA CENTRAL (despacho). EXCEPCIÓN: pedidos de
       ABASTECIMIENTO (compras le está COMPRANDO ese material al proveedor).
   (3) ABASTECER BODEGA: compras elige productos DESDE la receta (cantidades SUGERIDAS
       por la receta, ajustables) → pedido a OFICINA CENTRAL — ABASTECIMIENTO → OC real.
       No toca etapasPedidas ni la cobertura del supervisor (sin recetaKeys). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const normSrc = extractFn('normOcName');
const norm = normSrc ? new Function('return ' + normSrc)() : (s => String(s).toUpperCase().trim());
const memKeySrc = extractFn('_ocItemMemKey');
const memKey = memKeySrc ? new Function('normOcName', 'return ' + memKeySrc)(norm) : (s => String(s).toUpperCase());

// ── 1. lista global + helpers ──
const srcEs = extractFn('_esItemBodega');
ok('_esItemBodega existe', !!srcEs);
if (srcEs) {
  const st = { bodegaItemsGlobal: { [memKey('CLAVO CON ROLDANA 1"')]: 1 } };
  const fn = new Function('state', '_ocItemMemKey', 'return ' + srcEs)(st, memKey);
  ok('material marcado ⇒ es de bodega', fn('CLAVO CON ROLDANA 1"') === true);
  ok('material no marcado ⇒ no', fn('PLANCHA DE TABLAYESO') === false);
}
const srcTog = extractFn('_toggleItemBodega');
ok('_toggleItemBodega existe', !!srcTog);
if (srcTog) {
  // v959: el gate es el helper _puedeGestionarBodega (bodega|compras|admin) — se inyecta.
  const srcGate = extractFn('_puedeGestionarBodega');
  const st = {};
  let toast = '';
  const mk = canFn => new Function('state', '_ocItemMemKey', 'can', 'showToast', 'saveState', 'CloudSync',
    srcGate + '\nreturn ' + srcTog)(st, memKey, canFn, m => { toast = m; }, () => {}, { forceUploadNow: () => ({ catch: () => {} }) });
  const fn = mk(perm => perm === 'compras.autorizar');
  fn('FULMINANTE TIRA CAL. 27');
  ok('marca (compras puede)', st.bodegaItemsGlobal && st.bodegaItemsGlobal[memKey('FULMINANTE TIRA CAL. 27')] === 1);
  fn('FULMINANTE TIRA CAL. 27');
  ok('desmarca al segundo toque', !st.bodegaItemsGlobal[memKey('FULMINANTE TIRA CAL. 27')]);
  const fnSin = mk(() => false);
  fnSin('OTRA COSA');
  ok('sin permiso no toca la lista', !st.bodegaItemsGlobal[memKey('OTRA COSA')] && /COMPRAS|ADMIN|PERMISO|BODEGA/.test(toast));
}

// ── 2. la lista de bodega gana ANTES que el catálogo (la causa raíz) ──
const srcAuto = extractFn('autoAssignOcProviders');
const iBodega = srcAuto.indexOf('_esItemBodega('), iCat = srcAuto.indexOf('findBestProviderForItem(');
ok('bodega se evalúa ANTES del catálogo de precios', iBodega > -1 && iCat > iBodega);
ok('asigna _bodega y marca el item', /proveedorId = '_bodega'/.test(srcAuto) && /esBodega = true/.test(srcAuto));
ok('EXCEPCIÓN abastecimiento: ahí compras COMPRA, no despacha', /esAbastecimiento/.test(srcAuto) && /OFICINA CENTRAL/.test(srcAuto));

// ── 3. modal ABASTECER BODEGA ──
const srcProd = extractFn('_bodegaProductosDeReceta');
ok('_bodegaProductosDeReceta existe', !!srcProd);
if (srcProd) {
  const fn = new Function('_ocItemMemKey', 'return ' + srcProd)(memKey);
  const p = { materiales: { recetaV2: { version: 3, formato: 'estandar', niveles: {
    n1: { 0: [ { m: 'CLAVO', nc: 'CLAVO CON ROLDANA 1"', u: 'UNI', tn: 100, aptos: { a: 60, b: 60 } } ], 1: [], 2: [], 3: [] },
    n2: { 0: [ { m: 'CLAVO', nc: 'CLAVO CON ROLDANA 1"', u: 'UNI', aptos: { c: 78 } } ], 1: [ { m: 'PLANCHA', u: 'UNI', tn: 50, aptos: {} } ], 2: [], 3: [] },
  } } } };
  const out = fn(p);
  const clavo = out.find(x => x.name === 'CLAVO CON ROLDANA 1"');
  ok('deduplica por nombre real entre niveles/etapas', out.length === 2 && !!clavo);
  ok('total sugerido: tn manda y sin tn suma aptos (100+78)', clavo && clavo.total === 178);
  ok('sin receta devuelve vacío sin tronar', Array.isArray(fn({})) && fn({}).length === 0);
}
const srcModal = extractFn('_abrirModalBodega');
ok('modal ABASTECER BODEGA a nivel body (regla v913)', /document\.body\.appendChild/.test(srcModal));
ok('gate de permiso compras/admin', /_puedeGestionarBodega\(\)/.test(srcModal)); // v959: helper bodega|compras|admin
ok('checkbox DE BODEGA por producto', /_toggleItemBodega\(/.test(srcModal));
ok('fecha de entrega obligatoria (v915) con calendario', /type="date"/.test(srcModal) && /_hoyInputISO\(\)/.test(srcModal));
const srcGen = extractFn('_bodegaGenerarPedido');
ok('_bodegaGenerarPedido existe', !!srcGen);
ok('pedido a OFICINA CENTRAL — ABASTECIMIENTO', /OFICINA CENTRAL — ABASTECIMIENTO/.test(srcGen));
ok('marcado esAbastecimiento + esDeReceta (memoria de proveedor aprende)', /esAbastecimiento: true/.test(srcGen) && /esDeReceta: true/.test(srcGen));
ok('NO toca la cobertura del supervisor (sin recetaKeys)', srcGen.indexOf('recetaKeys') === -1);
ok('correlativo + subida inmediata', /pedidoCounter/.test(srcGen) && /forceUploadNow/.test(srcGen));

// ── 4. botón en la pestaña de pedidos ──
// v960: un solo botón en la toolbar; v963: la ENTRADA la decide Antonio (materiales.bodega|admin)
ok('botón BODEGA CENTRAL gateado a bodega|admin', /data-perm="materiales\.bodega\|users\.manage"[^>]*onclick="_abrirPanelBodega\(\)"/.test(html) && /ABASTECER/.test(extractFn('_abrirPanelBodega')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
