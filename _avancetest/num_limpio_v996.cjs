/* v996 (queja de Antonio 27-jul: "los correlativos siguen saliendo con los ceros"):
   los pedidos y OCs emitidos ANTES de v994 quedaron guardados con ceros ('– 00002',
   'OC 00002'). v994 arregló los NUEVOS y los documentos (_solNum), pero las tarjetas y
   los listados seguían mostrando el dato crudo.

   FIX: _numLimpio() limpia los ceros al MOSTRAR — el dato guardado no se toca (los
   vínculos pedido↔OC siguen intactos y no hace falta migrar nada). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zN = ex('function _numLimpio(');
ok('existe _numLimpio', !!zN);
let f = null;
try { f = new Function('return (' + zN + ')')(); } catch(e){}
if (f) {
  ok('pedido viejo sin ceros', f('VICINIA LAS AMÉRICAS – 00002') === 'VICINIA LAS AMÉRICAS – 2');
  ok('OC vieja sin ceros', f('VICINIA LAS AMÉRICAS – 00002 - OC 00002') === 'VICINIA LAS AMÉRICAS – 2 - OC 2');
  ok('despacho igual', f('VLA – 00004 - DESP 00003') === 'VLA – 4 - DESP 3');
  ok('el formato viejo OC01 también', f('VLA – 00003 - OC01') === 'VLA – 3 - OC 1');
  ok('bodega igual', f('BODEGA – 00007') === 'BODEGA – 7');
  ok('un número ya limpio no se toca', f('VICINIA LAS AMÉRICAS – 10') === 'VICINIA LAS AMÉRICAS – 10');
  ok('dos dígitos altos intactos', f('VLA – 3 - OC 12') === 'VLA – 3 - OC 12');
  ok('es idempotente', f(f('VLA – 00004 - DESP 00003')) === f('VLA – 00004 - DESP 00003'));
  ok('no rompe con vacío o null', f('') === '' && f(null) === '');
  // no debe comerse ceros que son parte del nombre del proyecto
  ok('no toca ceros dentro del texto', f('TORRE 100 – 00002') === 'TORRE 100 – 2');
}

// ── aplicado donde se VE ──
ok('la tarjeta del pedido lo usa', /_numLimpio\(pd\.numero\)/.test(ex('function renderPedidoCard(')));
ok('el detalle del pedido lo usa', /_numLimpio\(pd\.numero\)/.test(ex('function openPedidoDetalle(')));
ok('el listado de OCs lo usa', /_numLimpio\(/.test(html) && (html.match(/_numLimpio\(/g) || []).length >= 4);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
