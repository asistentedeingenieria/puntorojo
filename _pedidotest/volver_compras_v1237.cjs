/* v1237 (Antonio, 17-ago, dos reportes):
   1. "Cuando le doy corregir me saca de la página" — _ocEditarBorrador cierra el panel de
      COMPRAS para abrir el modal de generar, y al cerrar el modal el usuario quedaba
      tirado en la vista de la obra. FIX: bandera _ocVolverACompras + closeModal
      ('ordenCompra') re-abre el panel de COMPRAS si de ahí venía.
   2. "¿Por qué me sale esa herramienta si NO la pidieron?" — SÍ la pidieron: viene en
      pd.herramientas (v1155, la marcó el solicitante en el formulario), pero la HOJA
      impresa no la mostraba. Ahora la solicitud imprime el bloque HERRAMIENTAS DE
      BODEGA · SIN COSTO. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— 1. corregir te DEVUELVE a COMPRAS —');
const zE = ex(html, 'window._ocEditarBorrador = async function(');
ok('al corregir se recuerda si venías del panel de COMPRAS',
  /_ocVolverACompras = !!document\.getElementById\('_bodegaPanelModal'\)/.test(zE));
const zC = ex(html, 'function closeModal(');
ok('cerrar el modal de generar re-abre COMPRAS si de ahí venías',
  /_ocVolverACompras/.test(zC) && /_abrirPanelBodega/.test(zC) && /'ordenCompra'/.test(zC));

console.log('\n— 2. la hoja del pedido imprime las herramientas —');
const zDoc = ex(html, 'function _solicitudDocHTML(');
ok('el bloque HERRAMIENTAS DE BODEGA · SIN COSTO está en la hoja',
  /HERRAMIENTAS DE BODEGA · SIN COSTO/.test(zDoc) && /pd\.herramientas/.test(zDoc));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
