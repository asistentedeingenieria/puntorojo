/* v1249 (caso vivo PLYWOOD OKUME/OKOOUME, 17-ago). Tres piezas de la misma herida — el
   material EVENTUAL escrito libre se vuelve "otro producto" para la app:
   1. AUTOCOMPLETADO en los eventuales: sugerencias del catálogo GLOBAL (Excel + recetas +
      catálogo maestro por proveedor, v1010) — un toque y el nombre queda EXACTO y la
      unidad se llena sola. La vía libre sigue viva (sin match se escribe normal).
      Regla v1167: NINGÚN dato de usuario viaja por atributo — la elección va por ÍNDICE
      (_extraSugLista) y el value de la fila se escapa (½" truncaba el attr al re-pintar).
   2. El candado del precio SOLO cuando protege algo: si el proveedor elegido NO tiene
      precio de catálogo para el producto, el campo es editable con aviso SIN PRECIO EN
      CATÁLOGO (antes mostraba el último precio usado y no dejaba corregirlo).
   3. "La descripción NO debe salir con doble medida": si la ESPECIFICACIÓN no agrega
      nada al nombre (todos sus tokens ya están), el corchete [spec] no se imprime. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— 1. autocompletado en los eventuales —');
const zR = ex('function renderExtraMaterials(');
ok('la fila del nombre dispara sugerencias al escribir', /_extraSugerir\(/.test(zR) && /onblur/.test(zR));
ok('el value de la fila va ESCAPADO (regla v1167: la ½" truncaba el attr)', /replace\(\/"\/g, ?'&quot;'\)/.test(zR));
ok('la elección va por ÍNDICE, no por nombre en atributo (regla v1167)', /_extraSugLista/.test(html) && /_extraSugElegir\(/.test(html));
const zE = ex('window._extraSugElegir = function');
ok('elegir pone el nombre EXACTO del catálogo y llena la unidad', /\.name = /.test(zE) && /unit/.test(zE) && /renderExtraMaterials\(\)/.test(zE));
const zS = ex('window._extraSugerir = function');
ok('la fuente es el catálogo GLOBAL (Excel + recetas + maestro, v1010)', /_bodegaProductosGlobal\(\)/.test(zS));

console.log('— 2. candado de precio solo-si-protege —');
const zO = ex('function renderOcItems(');
ok('consulta si el proveedor tiene precio de catálogo para el producto', /_precioIndexProv\(\)\[normOcName\(it\.name\)\]/.test(zO));
ok('sin precio de catálogo, el campo es editable con aviso', /SIN PRECIO EN CATÁLOGO/.test(zO));
ok('el candado sigue firme cuando SÍ hay precio (regla v1010 intacta)', /para cambiarlo enviá una solicitud/.test(zO));
const zU = ex('function updateOcPrecio(');
ok('el guard duro de updateOcPrecio (v923) tiene la MISMA excepción — no un bypass',
  /_sinCat/.test(zU) && /_precioIndexProv\(\)\[normOcName\(/.test(zU) && /PEDÍ EL CAMBIO POR SOLICITUD/.test(zU));

console.log('— 3. la spec redundante no se imprime —');
const zSpec = ex('function _specRedundante(');
ok('existe _specRedundante', zSpec.length > 80);
let f = null;
try { f = new Function('normOcName', 'return (' + zSpec + ')')(function(t){ return String(t||'').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\[.*?\]/g,'').replace(/\(.*?\)/g,'').replace(/[^A-Z0-9½¼¾\.\"\' X]/g,' ').replace(/\s+/g,' ').trim(); }); } catch(e){}
if (f) {
  ok('la doble medida se detecta (caso real del plywood)', f('PLYWOOD OKOUME 4\' X 8\' X ½"', '½" X 4\' X 8\'') === true);
  ok('una spec ÚTIL se conserva', f('TABLA ULTRALIGHT ½"', 'MARCA TRUPER') === false);
} else ok('_specRedundante evaluable', false);
ok('buildPedidoOcItems la usa antes de armar el corchete', /_specRedundante\(/.test(ex('function buildPedidoOcItems(')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
