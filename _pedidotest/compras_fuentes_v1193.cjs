/* v1193 — TODO EN UN SOLO LADO (Antonio, 12-ago): "los pedidos de abastecimiento también
   se manejen dentro de la pestaña de pedidos y en proyecto diga ABASTECIMIENTO al igual
   que las órdenes de compra. También los de PROYECTOS VARIOS... y que dentro de esa
   pestaña ya salga los nombres de los proyectos en cada orden de pedido y orden de compra.
   Todo esto para que no tengamos todo regado en diferentes lados."

   DISEÑO: dos entradas ESPECIALES en el selector PROYECTO de COMPRAS (_abasto/_varios).
   No tocan state.activeProjectId (los datos no se mueven de sus contenedores v964/v1002):
   un modo local (window._comprasProyEspecial) hace que renderPedidosList y
   renderOrdenesList lean del store correspondiente vía un PROXY con forma de proyecto.
   El modo solo muerde con el panel de COMPRAS abierto — las vistas de obra no cambian.
   Las acciones ya eran globales (_findPedidoGlobal/_bodegaFindOc), nada que cablear. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— el resolver del modo especial —');
const res = ex(code, 'function _comprasFuenteEspecial(');
ok('existe', !!res);
ok('solo muerde con el panel de COMPRAS abierto (las obras no cambian)', /_bodegaPanelModal/.test(res));
ok('ABASTECIMIENTO lee del store de bodega', /_bodegaMatStore\(\)/.test(res) && /ABASTECIMIENTO/.test(res));
ok('PROYECTOS VARIOS lee de su store', /_variosMatStore\(\)/.test(res) && /PROYECTOS VARIOS/.test(res));
ok('el proxy tiene forma de proyecto (materiales/name/id)', /materiales: _bodegaMatStore\(\)/.test(res) && /id: '_abasto'/.test(res));

console.log('\n— el selector y el cambio —');
const sel = ex(code, 'function _comprasSelectorHTML(');
ok('el selector ofrece las dos entradas', /value="_abasto"/.test(sel) && /value="_varios"/.test(sel));
ok('marca la seleccionada por el modo (no por activeProjectId)', /_comprasProyEspecial/.test(sel));
const cam = ex(code, 'window._comprasCambiarProyecto = function(');
ok('elegir especial NO toca el proyecto activo', /_abasto/.test(cam) && /_varios/.test(cam) && /setActiveProject/.test(cam));
ok('elegir una obra APAGA el modo especial', /window\._comprasProyEspecial = ''/.test(cam));

console.log('\n— las dos listas leen del proxy —');
const rp = ex(code, 'function renderPedidosList(');
ok('renderPedidosList: fuente especial o proyecto activo', /_comprasFuenteEspecial/.test(rp) && /_esp \? _esp\.proxy : activeProj\(\)/.test(rp));
ok('en modo especial NO se filtra por obra (el contenedor es la unidad)', /_esp \? _todos/.test(rp));
const ro = ex(code, 'function renderOrdenesList(');
ok('renderOrdenesList: fuente especial o proyecto activo', /_comprasFuenteEspecial/.test(ro) && /_esp \? _esp\.proxy : activeProj\(\)/.test(ro));
ok('en modo especial las órdenes del contenedor van TODAS (sin filtro de obra ni DPP ajenos)', /_esp \? _ordTodas/.test(ro));

console.log('\n— el nombre del proyectito en cada tarjeta de VARIOS —');
const card = ex(code, 'function renderPedidoCard(');
ok('la tarjeta de pedido muestra el nombre del proyecto pequeño', /_varios/.test(card) && /proyectoPedido/.test(card));

console.log('\n— el COSTO DE LA RECETA no aplica a los modos especiales —');
const secs = ex(code, 'function _comprasSeccionesHTML(');
ok('la sub-pestaña de costo se esconde en modo especial', /_comprasProyEspecial \? ''/.test(secs));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
