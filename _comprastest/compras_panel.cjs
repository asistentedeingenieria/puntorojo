/* FASE 1 · v1040 — COMPRAS: la ubicación BODEGA CENTRAL del menú pasa a llamarse COMPRAS y
   adentro viven 5 secciones: BODEGA CENTRAL · PEDIDOS · ÓRDENES DE COMPRA · INVENTARIOS ·
   GASTOS (las últimas 4 por proyecto, con selector). ÓRDENES e INVENTARIOS salen de la obra.

   Plan aprobado por Antonio (29-jul) con sus 4 decisiones:
   - permiso = la casilla menu.bodega RE-ETIQUETADA (quien entra hoy sigue entrando)
   - el selector cambia el proyecto activo LOCAL (jamás sincroniza) y VOLVER restaura la obra
   - regla de oro: NINGÚN dato se toca — nodos se MUEVEN y se devuelven (patrón v1007/v1018)

   El congelador datos_congelados.cjs corre aparte y garantiza que la serie 'BODEGA – N', el
   proveedor _bodega y las OCs históricas quedan intactos. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. el renombre (solo UI) —');
const zM = ex('function _bloqueEmpresaHTML(');
ok("el cuadro del menú dice COMPRAS", /'COMPRAS'/.test(zM) && !/'BODEGA CENTRAL',\s*'EXISTENCIAS/.test(zM));
ok('y sigue abriendo el mismo panel', /_abrirPanelBodega/.test(zM));
ok('la casilla se re-etiquetó SIN cambiar la clave', /key: 'menu\.bodega', label: 'VER COMPRAS/.test(html));
const zP = ex('function _abrirPanelBodega(');
ok('el panel se titula COMPRAS', /<h2[^>]*>COMPRAS\.<\/h2>/.test(zP));
ok('el botón de la barra de pedidos dice COMPRAS', />COMPRAS<\/button>/.test(html));
/* v1023 dejó una inconsistencia: el botón mostraba por materiales.bodega pero la función
   exigía menu.bodega — quien lo veía comía un toast rojo */
ok('y muestra con el MISMO permiso que exige la función', /data-perm="menu\.bodega\|users\.manage"[^>]*>COMPRAS</.test(html));

console.log('\n— 2. las cinco secciones —');
/* la barra se arma en su propia función (los botones nacen de un molde con data-comprastab) */
const zB = ex('function _comprasBarraHTML(');
ok('la barra existe con atributo propio (data-comprastab, NO data-mattab)',
  /data-comprastab="' \+ t \+ '"/.test(zB)
  && ['bodega','pedidos','ordenes','inventarios','gastos'].every(t => new RegExp("btn\\('" + t + "'").test(zB))
  && !/data-mattab/.test(zB));
ok('la barra envuelve en móvil (regla v986)', /mat-tabs ped-tabs-bar/.test(zB));
ok('el panel la pinta', /_comprasBarraHTML\(\)/.test(zP));
const zT = ex('function _comprasSetTab(');
ok('existe el conmutador', zT.length > 300);
/* setMatTab pisa los .active de TODOS los .mat-tab — la barra de secciones se re-aplica AL FINAL */
ok('re-aplica su activo DESPUÉS de despachar (setMatTab lo pisa)', zT.indexOf('data-comprastab') > zT.indexOf('setMatTab'));
ok('la sección sobrevive al repintado (window._comprasTab)', /window\._comprasTab = t/.test(zT) && /_comprasSetTab\(window\._comprasTab/.test(zP));
ok('cada sección despacha su render por setMatTab (reuso, no duplicado)', /setMatTab\('pedidos'\)/.test(zT) && /setMatTab\('ordenes'\)/.test(zT) && /setMatTab\('inventario'\)/.test(zT) && /setMatTab\('gastos'\)/.test(zT));

console.log('\n— 3. MOVER nodos, nunca duplicar (patrón v1007/v1018) —');
const zL = ex('function _comprasLlevarNodos(');
const zD = ex('function _comprasDevolverNodos(');
ok('existe el llevar', zL.length > 200);
ok('existe el devolver', zD.length > 200);
['mat-receta','mat-pedidos','mat-ordenes','mat-inventario','mat-gastos'].forEach(id => {
  ok('se presta ' + id, new RegExp("'" + id + "'").test(zL));
});
ok('deja marca para poder devolver', /_comprasCasa/.test(zL) && /insertBefore\(marca/.test(zL));
ok('el devolver usa la marca', /_comprasCasa/.test(zD) && /insertBefore\(/.test(zD));
/* ⚠️ LA REGLA CRÍTICA (v1007): devolver ANTES de destruir el panel — si no, la obra pierde
   MATERIALES hasta recargar */
const zC = ex('function _cerrarPanelBodegaDom(');
ok('el cierre devuelve ANTES de destruir', /_comprasDevolverNodos/.test(zC) && zC.indexOf('_comprasDevolverNodos') < zC.indexOf('.remove()'));
ok('los contenedores siguen EXISTIENDO en la obra (son la casa)', /<div id="mat-ordenes"/.test(html) && /<div id="mat-inventario"/.test(html));

console.log('\n— 4. la obra queda limpia —');
ok('la barra de la obra ya no tiene ÓRDENES DE COMPRA', !/data-mattab="ordenes" onclick/.test(html));
ok('ni INVENTARIOS', !/data-mattab="inventario" onclick/.test(html));
const zSMT = ex('function setMatTab(');
ok('el fallback de pestañas se recortó', /\['receta','pedidos','avanceapto'\]/.test(zSMT));
ok('el badge de órdenes vive en la sección de COMPRAS', /tabBadge-ordenes/.test(zB) && !/data-mattab="ordenes"[^>]*>[^<]*<span id="tabBadge-ordenes">/.test(html));
/* generar OCs volvía con setView('materiales')+setMatTab('ordenes') — pestaña que ya no está */
const zGen = ex('async function generarOrdenCompra(');
ok('generar OCs cae en la sección de COMPRAS si el panel está abierto', /window\._comprasTab = 'ordenes'/.test(zGen));
ok('y si no, avisa dónde quedó', /ÓRDENES DE COMPRA/.test(zGen) && /setMatTab\('pedidos'\)/.test(zGen));
/* dentro del panel, el botón COMPRAS de la barra de pedidos abriría el panel sobre sí mismo */
ok('el botón COMPRAS se esconde dentro del panel', /#_bodegaPanelModal \.ped-tabs-bar button\[onclick\*="_abrirPanelBodega"\]\{display:none!important\}/.test(html));

console.log('\n— 5. el selector de proyecto —');
const zSecs = ex('function _comprasSeccionesHTML(');
ok('cada sección por-proyecto trae selector nativo', (zSecs.match(/_comprasSelectorHTML\(\)/g) || []).length >= 4 && /_comprasSeccionesHTML\(\)/.test(zP));
const zSel = ex('function _comprasSelectorHTML(');
ok('es un select data-nativo (no lo captura el picker v925)', /data-nativo/.test(zSel));
ok('lista las obras y marca la activa', /\.projects\)/.test(zSel) && /activeProjectId/.test(zSel));
const zCam = ex('window._comprasCambiarProyecto = function');
ok('cambiar usa setActiveProject (local-only, nunca sincroniza)', /setActiveProject\(/.test(zCam));
ok('y repinta el panel entero (cae en la misma sección)', /_cerrarPanelBodegaDom\(\)/.test(zCam) && /_abrirPanelBodega\(\)/.test(zCam));
/* VOLVER restaura la obra en la que se estaba — entrar a COMPRAS no te mueve la obra */
ok('al abrir se recuerda la obra de origen', /_comprasObraOrigen/.test(zP));
const zCer = ex('function _cerrarPanelBodega(');
ok('VOLVER la restaura', /_comprasObraOrigen/.test(zCer) && /setActiveProject\(/.test(zCer));
ok('y solo el VOLVER — no los 10 repintados internos', !/_comprasObraOrigen/.test(zC));

console.log('\n— 6. GASTOS: resumen por proyecto, todo DERIVADO —');
const zG = ex('function _comprasGastosResumen(');
let resumen = null;
try {
  resumen = new Function('state', '_gastosDeProyecto', 'return (' + zG + ')');
} catch(e){}
ok('existe como función pura', !!resumen);
if (resumen) {
  const fakeState = { projects: [ { id: 'p1', name: 'OBRA A' }, { id: 'p2', name: 'OBRA B' }, null ] };
  const fakeGastos = pid => pid === 'p1' ? { total: 100, ordenes: [1,2] } : { total: 40.5, ordenes: [3] };
  const r = resumen(fakeState, fakeGastos)();
  ok('una fila por obra', Array.isArray(r) && r.length === 2);
  ok('con su total y su conteo', r && r[0] && r[0].total === 100 && r[0].n === 2 && r[1].total === 40.5 && r[1].n === 1);
  ok('no escribe nada (mismo state de entrada)', JSON.stringify(fakeState.projects.length) === '3');
} else { ['filas','totales','puro'].forEach(n => ok(n, false)); }
ok('la sección lo pinta', /_comprasResumenGastos/.test(zP) || /_comprasResumenGastos/.test(zT));
ok('respetando el permiso de precios', /_puedeVerGastos/.test(zT) || /_puedeVerGastos/.test(zP));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
