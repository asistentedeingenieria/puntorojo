/* v1274 (Antonio, 24-ago: "en VICINIA DEL CARMEN la de compras arma el pedido; quiero
   que UNICAMENTE EN ESE PROYECTO pueda editar SUS propios pedidos cuando aun NO los
   haya mandado a finanzas — puso mal la cantidad y al generar la OC ya no puede
   cambiarla"). Decisiones de Antonio (preguntadas): cantidades + AGREGAR materiales
   (el formulario completo), y editable mientras NO tenga NINGUNA orden.
   DISEÑO: botón EDITAR en la tarjeta (solo VDC via _vdcModoObs + pedido PROPIO + sin
   órdenes + vivo + no-solicitud) → reabre el formulario NUEVO PEDIDO precargado en
   MODO EDICIÓN (_pedidoEditId): al enviar, submitPedido ACTUALIZA el pedido en su
   lugar — mismo id y mismo número, SIN quemar correlativo, con sello _ts (union-merge
   v972) y re-subida de la copia sellada del QR (v1240, los renglones viajan en ella).
   El modo se limpia en TODO cambio de pestaña y en limpiar formulario — un modo
   colgado convertiría un pedido nuevo en una edición silenciosa del viejo. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* ── 1. la puerta: _pedidoEditarVDC con TODOS los candados ── */
const zE = ex('window._pedidoEditarVDC = function');
ok('_pedidoEditarVDC existe', zE.length > 300);
ok('solo pedidos PROPIOS (solicitanteUsername)', /solicitanteUsername/.test(zE));
ok('sin NINGUNA orden (getPedidoOrdenes)', /getPedidoOrdenes\(pd\.id\)/.test(zE));
ok('las solicitudes de etapa NO se editan', /esSolicitudEtapa/.test(zE));
ok('RECIBIDO y CANCELADO no se editan', /RECIBIDO/.test(zE) && /CANCELADO/.test(zE));
ok('cierra el panel de COMPRAS antes de abrir el formulario (patrón v1256)', /_cerrarPanelBodegaDom/.test(zE));
ok('precarga items, specs, extras y metal', /pedidoFormItems = Object\.assign\(\{\}, pd\.items/.test(zE) && /pedidoExtraMaterials = /.test(zE) && /pedidoMetalMedida = /.test(zE));
ok('las herramientas vuelven al formulario (v1155 las separa al guardar)', /HERRAMIENTAS DE BODEGA::/.test(zE));
ok('nivel/apto se re-seleccionan por RÓTULO (el pedido no guarda ids)', /textContent/.test(zE));
ok('fecha DD/MM/AAAA → input ISO', /(\d\{2\})/.test(zE) || /match\(/.test(zE));
ok('banner de modo edición visible', /_pedidoEditBanner/.test(zE));

/* ── 2. el modo NUNCA queda colgado ── */
const zTab = ex('function setPedidoTab(');
ok('setPedidoTab limpia el modo edición SIEMPRE', /_pedidoEditId = null/.test(zTab));
const zReset = ex('async function resetPedidoForm(');
ok('resetPedidoForm también lo limpia', /_pedidoEditId = null/.test(zReset));

/* ── 3. submitPedido: rama de ACTUALIZACIÓN ── */
const iSub = html.indexOf('async function submitPedido(');
const zSub = html.slice(iSub, iSub + 22000);
ok('en edición NO se quema correlativo (guard del bloque de numeración)', /if \(!window\._pedidoEditId\) \{[\s\S]{0,200}pedidoCounter/.test(zSub));
ok('la rama de edición verifica FRESCO que siga sin órdenes', /_pedidoEditId[\s\S]{0,900}getPedidoOrdenes\(_epd\.id\)/.test(zSub));
ok('actualiza EN el lugar y sella _ts (union-merge v972)', /_epd\.items = pedido\.items/.test(zSub) && /_epd\._ts = Date\.now\(\)/.test(zSub));
ok('re-sube la copia sellada del QR con los renglones nuevos (v1240)', /_pedVerifSubir\(_epd, p\)/.test(zSub));
ok('deja rastro en el historial del pedido', /EDITADO POR/.test(zSub));
ok('el número NO se toca (no copia numero al editar)', !/_epd\.numero =/.test(zSub));

/* ── 4. el botón en la tarjeta, con el candado completo ── */
const zCard = ex('function renderPedidoCard(');
ok('botón EDITAR gated: VDC + propio + sin órdenes + vivo + no-solicitud', /_vdcModoObs\(p\)/.test(zCard) && /_pedidoEditarVDC\(/.test(zCard) && /getPedidoOrdenes\(pd\.id\)/.test(zCard) && /solicitanteUsername/.test(zCard));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
