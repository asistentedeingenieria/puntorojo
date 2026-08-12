/* v1192 — DOS PEDIDOS DE ANTONIO EN LA TARJETA DE OC (12-ago):

   1. VER PREVIEW: ver el documento COMO QUEDÓ, en cualquier estado, sin efectos.
      Pendiente → el borrador de siempre (marca BORRADOR). Autorizada → la hoja FINAL,
      pero SIN sellar oc.impreso ("impresa/enviada" queda para cuando de verdad se
      imprime/comparte). Antes la autorizada no se podía VER: solo compartir (v1184).
   2. Menú ⋮: TODAS las acciones de la tarjeta (autorizar, devolver, corregir, recibir,
      entrega, compartir, factura, saldo, OP/DPP, eliminar) viven dentro de un botón de
      tres puntos. A la vista quedan solo VER PREVIEW y el ⋮. Uno abierto a la vez,
      cierra al hacer click afuera o al elegir una acción. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— VER PREVIEW sin efectos —');
const prev = ex(code, 'window.verPreviewOrden = function(');
ok('verPreviewOrden existe', !!prev);
ok('decide borrador por el status (pendiente → borrador, autorizada → final)', /PENDIENTE_AUTORIZACION/.test(prev));
ok('pasa el modo solo-ver', /soloVer: true/.test(prev));
const po = ex(code, 'function printOrdenCompra(');
ok('printOrdenCompra acepta opts', /function printOrdenCompra\(ocId, isDraft, opts\)/.test(code));
ok('el sello "impresa/enviada" NO se pone en modo solo-ver', /!showDraft && !_soloVer && !oc\.impreso/.test(po));

console.log('\n— la tarjeta: VER PREVIEW visible + menú ⋮ —');
// región de la tarjeta: desde la def del botón de compartir hasta el ensamblado del html
const iCard = code.indexOf("compartirOcImg('${oc.id}')");
const zCard = code.slice(iCard, code.indexOf('let _htmlOc', iCard));
ok('la región de la tarjeta se encuentra', iCard > 0 && zCard.length > 500);
ok('botón VER PREVIEW visible en la tarjeta', /verPreviewOrden\('\$\{oc\.id\}'\)/.test(zCard) && /VER PREVIEW/.test(zCard));
ok('el ⋮ existe y abre por _ocMenuToggle', /oc-menu-wrap/.test(zCard) && /_ocMenuToggle\(event,'\$\{oc\.id\}'\)/.test(zCard));
ok('las acciones viven DENTRO del menú (var _accionesMenu)', /const _accionesMenu = \[/.test(zCard) && /class="oc-menu" id="ocmenu-\$\{oc\.id\}"/.test(zCard));
['authBtn','devolverBtn','corregirBtn','recibirBtn','recibirObraBtn','cambiarEntregaBtn','printBtn','facturaBtn','_opBtn'].forEach(b => {
  ok('  · ' + b + ' está en el menú', new RegExp('_accionesMenu = \\[[^\\]]*' + b).test(zCard));
});
ok('ELIMINAR va en el menú con texto (no la ✕ suelta)', /ELIMINAR/.test(zCard) && new RegExp('_accionesMenu = \\[[\\s\\S]*?deleteOrden').test(zCard));
ok('sin acciones no sale el ⋮ (usuario solo-lectura)', /_accionesMenu \? /.test(zCard));
ok('VER BORRADOR ya no está suelto en ESTA tarjeta (lo cubre VER PREVIEW)', !/VER BORRADOR/.test(zCard));

console.log('\n— el toggle del menú —');
const tg = ex(code, 'window._ocMenuToggle = function(');
ok('_ocMenuToggle existe y cierra los demás (uno a la vez)', /querySelectorAll\('\.oc-menu'\)/.test(tg) && /hidden/.test(tg));
ok('click afuera o en una acción cierra el menú (listener global)', /document\.addEventListener\('click'[\s\S]{0,300}\.oc-menu/.test(code));

console.log('\n— CSS —');
ok('.oc-menu flotante (absolute + z-index)', /\.oc-menu\{position:absolute[^}]*z-index/.test(html));
ok('en mobile el menú no se sale por la izquierda', /\.oc-menu\{left:0;right:auto\}/.test(html));

console.log('\n— BODEGA CENTRAL: orden nuevo + ceros ocultos (pedidos de Antonio, 12-ago) —');
// región del template de la sección bodega
const iB = code.indexOf('id="_comprasSecBodega"');
const zB = code.slice(iB, iB + 3000);
ok('la sección de bodega se encuentra', iB > 0);
ok('el buscador y la tabla van PRIMERO (antes de pre-pago/trasiegos)',
  zB.indexOf('_bodegaViewFiltro') >= 0 && zB.indexOf('_bodegaPrepagoWrap') > zB.indexOf('_bodegaViewFiltro'));
ok('pre-pago y trasiegos quedaron DESPUÉS de la tabla', zB.indexOf('_trasiegosWrap') > zB.indexOf('APLICAR AJUSTES'));
ok('las 4 tarjetitas explicativas ya no existen', !/CÓMO LEER LA TABLA/.test(code) || code.indexOf('CÓMO LEER LA TABLA') !== iB);
ok('los renglones en CERO nacen ocultos pero quedan en el DOM (buscables)',
  /data-bcero="\$\{\(!x\.saldo && !x\.camino\) \? 1 : 0\}"/.test(code) && /display:\$\{\(!x\.saldo && !x\.camino\) \? 'none' : 'grid'\}/.test(code));
const zFil = ex(code, 'window._bodegaViewFiltrar = function(');
ok('el filtro: sin búsqueda oculta ceros, BUSCANDO encuentra todo', /bcero/.test(zFil) && /f\s*\?/.test(zFil));

console.log('\n— CATÁLOGO: un solo + para todos —');
ok('queda UN + con permiso doble (admin O proponer)', /data-perm="users\.manage\|precios\.proponer"/.test(code) && /_catAgregarProveedorSmart\(\)/.test(code));
const zSm = ex(code, 'window._catAgregarProveedorSmart = function(');
ok('admin agrega directo, el resto propone (v998)', /openAddProveedorFromCatalog\(\)/.test(zSm) && /_catProponerProveedor\(\)/.test(zSm));
ok('el + de proponer suelto ya no está en el sidebar', !/onclick="_catProponerProveedor\(\)" data-perm="precios\.proponer" data-proponer-cat/.test(code));

console.log('\n— ASISTENCIA DIARIA solo en las obras —');
ok('las tarjetas de asistencia diaria exigen obra asignada (admin ya no las ve)',
  /\(_sub==='asistencia'\) \? \(_uObraKpi \? _kAsist : ''\)/.test(code));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
