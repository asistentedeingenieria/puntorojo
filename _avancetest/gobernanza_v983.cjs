/* v983 (pedidos de Antonio 26-jul, tercera ronda):
   1. CANDADO DE ETAPA, raíz final: el self-heal de ensureDataV9 corría en el ARRANQUE,
      cuando la receta aligerada (v930) aún NO está adjunta → _etapaItemsParaPedir veía
      0 disponibles y no liberaba. Ahora renderRecetaPedir libera candados huérfanos
      JUSTO antes de pintar (todo cargado) y sube el cambio.
   2. INVENTARIO: el listado de la toma es el CATÁLOGO GENERAL DE BODEGA CENTRAL
      (_bodegaProductosGlobal: Excel de compras + recetas), busca también por alias
      interno, muestra la unidad, y SIEMPRE ofrece la vía de texto libre.
   3. SOLICITUD: sin línea ARRIBA de la firma; el detalle deja UN solo botón
      COMPARTIR SOLICITUD (imprimir salió del modal). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. liberación al pintar ──
const zRP = ex('function renderRecetaPedir(');
ok('renderRecetaPedir libera candados huérfanos antes de pintar', /_recetaLiberarCandadoEtapa\(p, lid, ei\)/.test(zRP));
ok('y sube el cambio si liberó algo', /if \(_lib\) \{ saveState\(\);/.test(zRP.replace(/\n\s*/g,' ')));

// ── 2. inventario desde bodega central ──
const zS = ex('function _invSugerir(');
ok('las sugerencias salen del catálogo GENERAL de bodega central', /_bodegaProductosGlobal/.test(zS) && !/_nmGetAllMaterials/.test(zS));
ok('busca también por el alias interno', /it\.alias/.test(zS));
ok('muestra la unidad en la sugerencia', /it\.u \|\| ''/.test(zS));
/* v1054: la vía de texto libre pasó de avisito amarillo a BOTÓN visible bajo el formulario */
ok('SIEMPRE ofrece la vía de texto libre', /_invAgregarComoNuevo/.test(html) && /AGREGARLO COMO PRODUCTO NUEVO/.test(html));
// unidad del catálogo primero (funcional)
const zU = ex('function _invUnidadDe(');
let fU = null;
try { fU = new Function('_bodegaProductosGlobal', '_bodegaUnidadDelNombre', '_bodegaUFmt', 'return (' + zU + ')'); } catch(e){}
if (fU) {
  const f = fU(() => [{ name: 'PASTA REDIMIX USG 21.8 KG CAJA', u: 'CAJA' }], () => 'UND', u => u);
  ok('la unidad sale del catálogo de bodega cuando hay match', f('pasta redimix usg 21.8 kg caja') === 'CAJA');
  ok('sin match cae a la derivada del nombre', f('COSA RARA') === 'UND');
} else ok('_invUnidadDe evaluable', false);

// ── 3. solicitud ──
/* v1236: la firma grande del centro se fue — queda chiquita al pie, sin linea encima (Antonio) */
ok('v1236: firma chiquita al pie de la solicitud', /SOLICITANTE · \$\{pd\.solicitante\}/.test(html));
const iBtns = html.indexOf('pedDetalleOCBtn');
const zBtns = html.slice(iBtns - 800, iBtns + 800);
ok('el detalle tiene UN solo botón COMPARTIR SOLICITUD', /COMPARTIR SOLICITUD/.test(zBtns) && !/printPedido\(\)/.test(zBtns) && !/COMPARTIR IMAGEN</.test(zBtns));

// ── 4. v984: dirección sanada AL ABRIR EL MODAL + candado TODOS para todos ──
const iModal = html.indexOf('const _dirs = p.materiales.direccionesEntrega');
/* v1158: la ventana de 1200 quedó corta — el seed de la dirección de VICINIA DEL CARMEN
   se insertó entre el heal v984 y este marcador. Si vuelve a quedar corta, extraer
   openOrdenCompra entera en vez de ampliar otra vez. */
const zModal = html.slice(iModal - 3000, iModal + 200);
ok('v984: el heal de la dirección corre al ABRIR el modal (por contenido)', /4TA AVENIDA 20-51\/i\.test\(String\(d\.direccion/.test(zModal) && /_dirFix/.test(zModal));
ok('v984: si sanó, guarda y sube', /if \(_dirFix\) \{ saveState\(\);/.test(zModal.replace(/\n\s*/g,' ')));
// v992: el candado se universalizó — aplica a TODOS los pedidos (pedido de Antonio)
ok('v984/v992: el botón TODOS se bloquea siempre', /_ocProvLockedTodos = true/.test(html));
ok('v984: el picker de TODOS respeta ambos candados', /window\._ocProvLocked \|\| window\._ocProvLockedTodos\) return/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
