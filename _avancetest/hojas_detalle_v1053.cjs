/* v1053 — LAS HOJAS EN ANDROID + el modal VER DETALLE (fotos 4-6 de Antonio).

   Foto 6 (comprobante cortado): NINGUNA de las 3 hojas (OC, solicitud, recibo) llevaba
   <meta viewport> — Android las pinta a ~980px con zoom y las media queries que las hojas
   COPIAN adentro jamás aplican. Un head compartido (_docHeadMeta) lo cura en las tres.

   Foto 5 (VOLVER A LA APP muerto): el onclick viejo hacía window.close() (ignorado en
   Custom Tab/WebView), history.back() (no-op: la ventana nació de window.open('') con
   history.length=1) y un rescate condicionado a !window.closed, que algunos WebView
   reportan MAL tras un close aceptado-pero-ignorado → el rescate nunca corría. El nuevo
   (_docVolverOnclick): close y, si a los 350ms seguimos vivos, navegar al origen SIN
   preguntar nada — si close funcionó, el timer murió con la ventana.

   Foto 4: el modal de detalle de pedido, centrado y ordenado (CSS escopeado al modal). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. el head compartido con viewport —');
const zH = ex('function _docHeadMeta(');
ok('existe y trae el viewport', /name="viewport" content="width=device-width,initial-scale=1"/.test(zH));
ok('y conserva only light (docs de impresión, regla v979)', /color-scheme" content="only light"/.test(zH));
ok('la hoja de OC lo usa', /\$\{_docHeadMeta\(\)\}/.test(ex('function printOrdenCompra(')));
ok('la solicitud lo usa', /\$\{_docHeadMeta\(\)\}/.test(ex('function _solicitudDocHTML(')));
ok('el recibo lo usa (la foto de Antonio)', /\$\{_docHeadMeta\(\)\}/.test(ex('function _reciboDocHTML(')));

console.log('\n— 2. el VOLVER que sí vuelve —');
const zV = ex('function _docVolverOnclick(');
ok('existe', zV.length > 100);
ok('cierra y si sigue vivo navega al origen, SIN window.closed', /window\.close/.test(zV) && /location\.replace/.test(zV) && !/window\.closed/.test(zV));
ok('sin el history.back inútil', !/history\.back/.test(zV));
ok('las tres hojas lo usan', (html.match(/\$\{_docVolverOnclick\(\)\}/g) || []).length >= 3);
ok('el onclick viejo de 3 pasos ya no existe', !/if\(!window\.closed\) location\.replace/.test(html));

console.log('\n— 3. el detalle del pedido, centrado y ordenado —');
ok('título y meta centrados', /#modalPedidoDetalle h3\{text-align:center/.test(html) || /#modalPedidoDetalle h3,\s*\r?\n?#modalPedidoDetalle \.desc\{[^}]*text-align:center/.test(html));
ok('el tracking es una tarjeta con filas parejas', /#modalPedidoDetalle \.pd-tracking\{[^}]*border-radius/.test(html) && /#modalPedidoDetalle \.pd-track-row\{[^}]*grid/.test(html));
ok('las categorías con título centrado', /#modalPedidoDetalle \.pedido-detail-cat-title\{[^}]*text-align:center/.test(html));
ok('en celular los botones apilan parejos', /@media[^{]*\{[^@]*#modalPedidoDetalle \.modal-actions[^}]*flex:1 1 100%/.test(html));

console.log('\n— 4. de paso, el builder ya no interpola sin escapar (hueco v849/v1010) —');
const zB = ex('function openPedidoDetalle(');
ok('los nombres de items van escapados', /esc\(i\.name\)/.test(zB));
ok('los extras también', /esc\(e\.name\)/.test(zB));
ok('el proveedor de la OC también', /esc\(oc\.proveedorNombre\)/.test(zB));
ok('el metal a medida también', /esc\(m\.tipo\)/.test(zB));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
