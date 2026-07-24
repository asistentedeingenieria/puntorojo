/* v968 (decisiones de Antonio 23-jul, vía la página de revisión): CATALOGO_COMPRAS —
   el match aprobado entre catálogo interno y su Excel de compras. AMBIGUOS = TODAS las
   variantes entran (cada una es material propio); SIN EQUIVALENTE = queda el interno.
   - La bodega (CARGAR EXISTENCIAS + ABASTECER) lista los ~246 nombres de COMPRA, con
     búsqueda también por el nombre interno (alias).
   - _ocItemMemKey unifica comillas tipográficas y '2 ½'≡'2½' (si no, el despacho de un
     material de receta no descontaría el stock cargado con el nombre del Excel).
   - Las OC de obra salen con el nombre de compra cuando el match es ÚNICO (_ncDeCompra). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFrom(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
function extractArray(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('[',m),d=0; for(let j=i;j<html.length;j++){ if(html[j]==='[')d++; else if(html[j]===']'){ d--; if(!d) return html.slice(i,j+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. la constante aprobada ──
const arrSrc = extractArray('const CATALOGO_COMPRAS = [');
ok('CATALOGO_COMPRAS existe', !!arrSrc);
let CC = null;
try { CC = new Function('return ' + arrSrc)(); } catch(e){}
ok('evaluable', Array.isArray(CC));
if (Array.isArray(CC)) {
  ok('147 grupos', CC.length === 147);
  const tot = CC.reduce((s, g) => s + (g.compras || []).length, 0);
  ok('246 nombres de compra en total', tot === 246);
  const peg = CC.find(g => g.interno === 'PEGAMENTO');
  ok('PEGAMENTO con sus 4 variantes (decisión TODOS)', peg && peg.compras.length === 4);
  const ang = CC.find(g => /^ANGULAR DE LÁMINA/.test(g.interno));
  ok('match único conserva el nombre del Excel (con espesor)', ang && ang.compras.length === 1 && /\(0\.35\)/.test(ang.compras[0]));
  const pls = CC.find(g => g.interno === 'PLAYERA TALLA S');
  ok('sin equivalente queda con el interno', pls && pls.compras.length === 1 && pls.compras[0] === 'PLAYERA TALLA S');
}

// ── 2. identidad de claves: comillas tipográficas y '2 ½'≡'2½' ──
const normSrc = extractFrom('function normOcName(');
const memSrc = extractFrom('function _ocItemMemKey(');
let memKey = null;
try { memKey = new Function(normSrc + '\n' + memSrc + '\nreturn _ocItemMemKey;')(); } catch(e){}
ok('_ocItemMemKey evaluable', typeof memKey === 'function');
if (typeof memKey === 'function') {
  ok("'2 ½' y '2½' son el MISMO material", memKey('CANAL DE 2 ½" X 10\' (0.35) CAL. 26') === memKey('CANAL DE 2½" X 10\' CAL. 26'));
  ok('comillas tipográficas ≡ rectas (TABLA del Excel)', memKey('TABLA DUROCK ½” X 4’ X 8’') === memKey('TABLA DUROCK ½" X 4\' X 8\''));
  ok('la clave vieja simple no cambió', memKey('MASILLA READY MIX') === 'MASILLA READY MIX');
}

// ── 3. la bodega lista el catálogo de compras con alias de búsqueda ──
const gSrc = extractFrom('function _bodegaProductosGlobal(');
ok('_bodegaProductosGlobal arranca del CATALOGO_COMPRAS', /CATALOGO_COMPRAS/.test(gSrc) && /alias/.test(gSrc));
let gFn = null;
try {
  gFn = new Function('state', 'CATALOGO_COMPRAS',
    normSrc + '\n' + memSrc + '\n' + extractFrom('function _bodegaUnidadDelNombre(') + '\n' + extractFrom('function _bodegaUFmt(') + '\nfunction _bodegaProductosDeReceta(p){ return []; }\nreturn (' + gSrc + ')'
  )({ projects: [] }, CC || []);
} catch(e){}
if (typeof gFn === 'function') {
  const prods = gFn();
  ok('lista TODAS las compras (≥240 tras dedupe)', prods.length >= 240);
  const conAlias = prods.find(x => x.alias === 'PEGAMENTO');
  ok('el alias interno viaja para la búsqueda', !!conAlias);
} else { ok('_bodegaProductosGlobal evaluable', false); }
ok('búsqueda del panel incluye el alias', /data-bname="[^"]*\$\{[^}]*alias/.test(extractFrom('function _abrirPanelBodega(')) || /alias/.test((extractFrom('function _abrirPanelBodega(').match(/data-bname="[^"]+"/) || [''])[0]));
ok('búsqueda de CARGAR incluye el alias', /alias/.test((extractFrom('function _abrirCargaExistencias(').match(/data-cname="[^"]+"/) || [''])[0]));
// ABASTECER ahora tiene buscador (246 materiales sin filtro sería un castigo)
const zAb = extractFrom('function _abrirModalBodega(');
ok('ABASTECER ganó buscador', /pr-buscador/.test(zAb) && /_bodegaAbFiltrar|data-abfila/.test(zAb));

// ── 4. OCs de obra con nombre de compra cuando el match es ÚNICO ──
const nSrc = extractFrom('function _ncDeCompra(');
ok('_ncDeCompra existe', !!nSrc);
let nFn = null;
try { nFn = new Function('CATALOGO_COMPRAS', normSrc + '\n' + memSrc + '\nreturn (' + nSrc + ')')(CC || []); } catch(e){}
if (typeof nFn === 'function') {
  ok('match único devuelve el nombre de compra', /\(0\.35\)/.test(nFn('ANGULAR DE LÁMINA 1" X 8\'') || ''));
  ok('con variantes (TODOS) devuelve null — se elige al pedir', nFn('PEGAMENTO') == null);
  ok('desconocido devuelve null', nFn('MATERIAL INVENTADO XYZ') == null);
} else { ok('_ncDeCompra evaluable', false); }
ok('buildPedidoOcItems aplica el nombre de compra', /_ncDeCompra/.test(extractFrom('function buildPedidoOcItems(')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
