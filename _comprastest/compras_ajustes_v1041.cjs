/* v1041 — AJUSTES DE COMPRAS (feedback de Antonio con fotos, 29-jul):
   1. PEDIDOS: fuera PEDIR DE RECETA y + NUEVO PEDIDO; fuera la receta prestada ("es la misma
      que hemos estado manejando"). Queda la LISTA + una vista nueva: COSTO DE LA RECETA con
      montos, visible para TODO el que entra a COMPRAS (sin receta.verPrecios).
   2. GASTOS: "no estás incluyendo todo" — las órdenes ANTERIORES a v1013 no guardaron su
      destino y el filtro las dejaba fuera (la OC de SISTEGUA Q5,815.60 de la foto). El destino
      se deriva del pedido que las originó. + VER OC que redirige a la orden exacta.
   3. BODEGA CENTRAL: ÚLTIMOS MOVIMIENTOS pasa a historial desplegable (patrón de los 6 que
      ya existen, preferencia en localStorage). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. PEDIDOS: solo la lista + el costo —');
const zL = ex('function _comprasLlevarNodos(');
ok('la receta ya NO se presta', !/'mat-receta'/.test(zL) && !/'mat-receta'/.test(ex('function _comprasDevolverNodos(')));
ok('la barra de PEDIR/NUEVO se esconde dentro del panel', /#_bodegaPanelModal #mat-pedidos \.ped-tabs-bar\{display:none!important\}/.test(html));
const zSecs = ex('function _comprasSeccionesHTML(');
ok('el mini-tab viejo (receta/pedidos) se fue', !/data-mattab="receta"/.test(zSecs));
ok('hay sub-vista propia: LISTA y COSTO DE LA RECETA', /data-comprasped="lista"/.test(zSecs) && /data-comprasped="costo"/.test(zSecs) && /COSTO DE LA RECETA/.test(zSecs));
const zT = ex('function _comprasSetTab(');
ok('entrar a PEDIDOS aterriza en la LISTA aunque el form quedara abierto', /setPedidoTab\('lista'\)/.test(zT));

console.log('\n— 2. el COSTO de la receta, con montos, sin permiso extra —');
const zC = ex('function _comprasRecetaCosto(');
let costo = null;
try { costo = new Function('_getProveedores','_recetaV2EtapaNivel','precioDeProductoReceta','return (' + zC + ')'); } catch(e){}
ok('existe como función pura', !!costo && zC.length > 400);
/* dentro de COMPRAS los montos los ve cualquiera que entró: NO hay can() acá */
ok('no gatea por receta.verPrecios (el acceso a COMPRAS es la puerta)', !/can\(/.test(zC));
if (costo) {
  const p = { materiales: { recetaV2: { formato:'estandar', etapas:['1RA ETAPA','2DA ETAPA'], niveles: { l1:{}, l2:{} } } } };
  const nivel = (pp, lid, ei) => ei === 0 ? { 'TABLAYESO': lid === 'l1' ? 10 : 5.2, 'CLAVO': 100 } : {};
  const precio = (provs, name) => name === 'TABLAYESO' ? { precio: 80, rendimiento: 1 } : { precio: 0 };
  const r = costo(() => [], nivel, precio)(p);
  /* 10 + ceil(5.2)=6 → 16 planchas × Q80 = 1280; el clavo queda SIN PRECIO y no inventa monto */
  ok('suma los niveles con ceil por nivel', r && r.etapas[0].filas.find(f => f.name === 'TABLAYESO').qty === 16);
  ok('subtotal = cantidad × precio', r.etapas[0].filas.find(f => f.name === 'TABLAYESO').sub === 1280);
  ok('material sin precio no inventa monto y se cuenta', r.sinPrecio === 1 && r.total === 1280);
  ok('receta no estándar devuelve null (no revienta)', costo(() => [], () => null, precio)({ materiales: {} }) === null);
} else { ['ceil','subtotal','sin precio','null'].forEach(n => ok(n, false)); }
ok('la sub-vista lo pinta', /_comprasRecetaCostoHTML/.test(html) && /_comprasRecetaCosto\(/.test(ex('function _comprasRecetaCostoHTML(')));

console.log('\n— 3. GASTOS incluye TODO (el agujero de las órdenes viejas) —');
const zD = ex('function _gastoDestinoDeOrden(');
let dest = null;
try { dest = new Function('state','_destinoProyectoDePedido','return (' + zD + ')'); } catch(e){}
ok('existe el resolvedor de destino', !!dest);
if (dest) {
  const st = { projects: [ { id:'p1', materiales:{ pedidos:[{ id:'pd9', proyectoId:'p1' }] } }, { id:'p2', materiales:{ pedidos:[] } } ] };
  const f = dest(st, pd => pd.proyectoId || '');
  ok('con destino guardado, se respeta', f({ destinoProyectoId:'p2' }) === 'p2');
  /* EL CASO DE LA FOTO: OC vieja sin destino, nacida de un pedido de la obra */
  ok('sin destino, se deriva del pedido origen', f({ pedidoId:'pd9' }) === 'p1');
  const f2 = dest(st, () => '');
  ok('pedido viejo sin proyectoId: manda la obra donde vive', f2({ pedidoId:'pd9' }) === 'p1');
  ok('sin pedido no se inventa pertenencia', f({ pedidoId:'nope' }) === '' && f({}) === '');
} else { ['respeta','deriva','obra donde vive','no inventa'].forEach(n => ok(n, false)); }
ok('_gastosDeProyecto lo usa', /_gastoDestinoDeOrden\(o\)/.test(ex('function _gastosDeProyecto(')));
ok('cuentas por pagar también', /_gastoDestinoDeOrden\(o\)/.test(ex('function _cuentasPorPagar(')));

console.log('\n— 4. VER OC: del gasto a la orden exacta —');
ok('cada fila del gasto tiene su botón', /_gastosIrAOc\(/.test(ex('function renderGastos(')));
const zIr = ex('window._gastosIrAOc = function');
ok('cae en la sección de órdenes de COMPRAS', /_comprasTab = 'ordenes'/.test(zIr));
ok('abre el historial por si ya se recibió', /oc_historial_visible_/.test(zIr));
ok('los despachos avisan que viven en bodega', /DESPACHO/.test(zIr));
const zRO = ex('function renderOrdenesList(');
ok('la fila de la OC tiene ancla', /id="ocitem-\$\{oc\.id\}"/.test(zRO));
ok('y al llegar se resalta y se trae a la vista', /_comprasIrAOcId/.test(zRO) && /scrollIntoView/.test(zRO));

console.log('\n— 5. ÚLTIMOS MOVIMIENTOS desplegable —');
const zP = ex('function _abrirPanelBodega(');
ok('el título togglea', /_bodegaMovsToggle/.test(zP));
ok('muestra el conteo y MOSTRAR/OCULTAR', /MOSTRAR/.test(zP) && /OCULTAR/.test(zP));
ok('la preferencia se guarda', /bodega_movs_visible/.test(html));
ok('cerrado por defecto (historial, no muro)', /getItem\('bodega_movs_visible'\) === '1'/.test(zP));
ok('existe el toggle', /window\._bodegaMovsToggle = function/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
