/* v1188 — DOS CIERRES DE LA NOCHE DEL 11-ago

   1. ORDEN DE DESPACHO DE HERRAMIENTA ("necesito que quede registro"): al despachar las
      herramientas de un pedido se emite un documento serie DESP en el contenedor del pedido —
      sin dinero (precio 0; el impreso esDespacho ya omite montos, v921), AUTORIZADA de
      inmediato (el despacho de bodega ES la autorización), numerada en la serie DESP y SIN
      pedidoId a propósito (si contara como OC del pedido cambiaría sus contadores/estado).
      Sale por _numLimpio como DESP<código> - 000000N e imprime/comparte como cualquier orden.

   2. FIX del selector de producto del catálogo (v1187): Antonio eligió MUNDIAL y el selector
      nunca se abrió. DOS causas: updateOcItemProveedor le QUITA la marca eventual al renglón
      (y el ofrecimiento la revisaba después ⇒ se cancelaba solo), y el repintado reemplaza el
      botón de anclaje. Ahora la marca se captura ANTES, el ofrecimiento corre tras el
      repintado (setTimeout) y se re-ancla en el botón fresco (_ocBtnProvDe). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— la orden de despacho de herramienta —');
const desp = ex(code, 'window._herrDespacharDePedido = async function(');
ok('el despacho emite el documento', /esHerramientas: true/.test(desp) && /_contD\.ordenes\.push/.test(desp));
ok('serie DESP con folio propio del contenedor', /_ocSerieDe\(o\) === 'DESP'/.test(desp) && /- DESP ' \+ _folioD/.test(desp));
ok('SIN dinero: precio 0 y total 0', /precio: 0/.test(desp) && /total: 0/.test(desp));
ok('AUTORIZADA de inmediato (bodega ES la autorización)', /status: 'AUTORIZADA'/.test(desp) && /autorizadoTs: _t/.test(desp));
ok('SIN pedidoId (no cambia los contadores del pedido)', !/pedidoId:/.test((desp.match(/_contD\.ordenes\.push\(\{[\s\S]*?\}\);/) || [''])[0]));
ok('cae al contenedor correcto (varios / bodega / obra del pedido)', /pd2\.esVarios \? _variosMatStore\(\)/.test(desp) && /pd2\.proyectoId/.test(desp));
ok('sella el contenedor para el union-merge', /_contD\._ts = _t/.test(desp));
ok('si el doc falla, el despacho NO se cae (try aparte)', /catch\(e\)\{ console\.warn\('\[v1188\]/.test(desp));
ok('el despacho atómico de v1155 sigue intacto', /NO ALCANZA EN BODEGA/.test(desp) && /_herrMovsList\(\)\.push/.test(desp));

console.log('\n— el selector de producto ahora sí se abre —');
const pkr = ex(code, 'function _abrirPickerProveedor(');
ok('la marca eventual se captura ANTES de asignar', /var _eraEv = !!\(ocWorkingItems\[idx\] && ocWorkingItems\[idx\]\.eventual\)/.test(pkr));
ok('el ofrecimiento corre TRAS el repintado', /setTimeout\(function\(\)\{ try \{ window\._ocOfrecerProductoCatalogo\(/.test(pkr));
ok('se re-ancla en el botón fresco', /_ocBtnProvDe\(idx\) \|\| btn/.test(pkr));
const ofr = ex(code, 'window._ocOfrecerProductoCatalogo = function(');
ok('acepta la marca capturada (eraEventual)', /function\(btn, idx, provId, eraEventual\)/.test(ofr) && /eraEventual \|\| it\.eventual/.test(ofr));
ok('existe el buscador del botón fresco', /function _ocBtnProvDe\(/.test(code));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
