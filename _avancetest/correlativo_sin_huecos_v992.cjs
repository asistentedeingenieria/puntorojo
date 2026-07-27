/* v992 (queja de Antonio 27-jul: "el correlativo está malo"): quedaron 00001, 00002 y
   00004 — el 00003 se eliminó y la numeración, que derivaba del MÁXIMO (v978), nunca
   rellenaba el hueco. Ahora toma el PRIMER NÚMERO LIBRE, sin reusar los que ya quedaron
   citados en una OC viva (esas OCs dicen "PEDIDO 00003" y no pueden quedar ambiguas).
   Mismo criterio para el folio de las órdenes. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── helper puro del primer libre ──
const zL = ex('function _primerNumeroLibre(');
ok('_primerNumeroLibre existe', !!zL);
let fL = null;
try { fL = new Function('return (' + zL + ')')(); } catch(e){}
if (fL) {
  ok('sin nada usado arranca en 1', fL([]) === 1);
  ok('consecutivos → el siguiente', fL([1,2,3]) === 4);
  ok('con hueco → RELLENA el hueco', fL([1,2,4]) === 3);
  ok('varios huecos → el más bajo', fL([2,3,7]) === 1);
  ok('ignora basura y repetidos', fL([1,1,'x',null,2]) === 3);
}

// ── pedidos ──
const zN = ex('window.nextPedidoCode = function');
let fN = null;
try { fN = new Function('_primerNumeroLibre', 'return (' + zN.slice(zN.indexOf('function')) + ')'); } catch(e){}
if (fN) {
  const f = fN(fL);
  const mk = (pedidos, ordenes) => ({ name:'VICINIA LAS AMÉRICAS', materiales:{ pedidos, ordenes } });
  const P = n => ({ numero: 'VICINIA LAS AMÉRICAS – ' + String(n).padStart(5,'0') });
  ok('caso de Antonio: 00001, 00002, 00004 → sale 00003', f(mk([P(1),P(2),P(4)], [])) === 'VICINIA LAS AMÉRICAS – 00003');
  ok('consecutivos → sigue la serie', f(mk([P(1),P(2),P(3)], [])) === 'VICINIA LAS AMÉRICAS – 00004');
  // el hueco NO se reusa si una OC viva todavía cita ese pedido
  const ocs = [{ pedidoNumero: 'VICINIA LAS AMÉRICAS – 00003' }];
  ok('no reusa un número citado por una OC viva', f(mk([P(1),P(2),P(4)], ocs)) === 'VICINIA LAS AMÉRICAS – 00005');
} else ok('nextPedidoCode evaluable', false);

// ── folio de OC: mismo criterio (v993: además POR SERIE — OC / DESP / OP) ──
ok('el folio de OC rellena huecos dentro de su serie', /_primerNumeroLibre\(_usadosSerie\[serie\] \|\| \[\]\)/.test(html));
ok('la serie se deduce de cada orden', /_ocSerieDe\(o\)/.test(html) && /_usadosSerie\[s\] = _usadosSerie\[s\] \|\| \[\]/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
