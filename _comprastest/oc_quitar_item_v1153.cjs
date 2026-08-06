/* v1153 — COMPRAS QUITA MATERIALES QUE NO APLICAN — SOLO EN PEDIDOS MANUALES

   Antonio (6-ago, con el modal de GENERAR OC lleno de eventuales tipo CLORO/JABON):
   "si en dado caso no aplica algun material... UNICAMENTE en los pedidos que se hacen con
   + NUEVO PEDIDO, la de compras puede eliminar algo que no aplique y enviar un comentario
   de porque lo elimina... que ese historial se guarde en algun lado para que la persona
   que hizo el pedido sepa... ESTO NO LO PUEDE HACER SI EL PEDIDO VIENE DE RECETA DE
   MATERIALES. AHI SI TODO SE DEBE DE ENVIAR."

   DISEÑO: nada se borra de la estructura del pedido — se registra en pd.itemsQuitados
   [{sourceKey, name, qty, motivo, por, ts, fecha}] y buildPedidoOcItems (el punto ÚNICO
   por donde pasan la OC, la recepción v990 y el detalle) FILTRA los quitados. Así la OC
   sale sin el material, la recepción no lo espera, y el rastro queda visible en la
   TARJETA del pedido para el solicitante. El pedido sella _ts (union-merge v972) y sube
   con forceUploadNow. Una línea partida (v1145) comparte sourceKey: quitar quita el
   material ENTERO — "no aplica" es del material, no de una parte. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— el set de quitados (puro) y el filtro en el punto único —');
const zK = ex(html, 'function _pedidoQuitadosKeys(');
ok('existe _pedidoQuitadosKeys', !!zK);
let keysFn = null;
try { if (zK) keysFn = new Function('return (' + zK + ')')(); } catch(e){}
ok('evalúa', typeof keysFn === 'function');
if (keysFn) {
  const pd = { itemsQuitados: [{ sourceKey: 'k1', name: 'CLORO (GALON)' }, { sourceKey: 'extra-0', name: 'JABON' }] };
  const q = keysFn(pd);
  ok('mapea los sourceKeys quitados', q && q['k1'] === true && q['extra-0'] === true);
  ok('sin quitados devuelve null (cero costo)', keysFn({}) === null && keysFn(null) === null && keysFn({ itemsQuitados: [] }) === null);
}
const zB = ex(code, 'function buildPedidoOcItems(');
ok('buildPedidoOcItems FILTRA los quitados (OC, recepción y detalle a la vez)',
  /_pedidoQuitadosKeys\(pd\)/.test(zB) && /filter\(/.test(zB));
ok('con guard typeof (los tests viejos extraen la función sin el helper)',
  /typeof _pedidoQuitadosKeys === 'function'/.test(zB));

console.log('\n— la acción de quitar —');
const zQ = ex(code, 'window._ocQuitarItem = async function');
ok('existe y es async', zQ.length > 600);
ok('gate de compras (o admin)', /compras\.autorizar/.test(zQ) && /users\.manage/.test(zQ));
ok('un pedido DE RECETA corta con aviso (todo se envía)', /esDeReceta/.test(zQ) && /TODO SE ENV/i.test(zQ));
ok('el guard de receta corre ANTES Y DESPUÉS del modal (v769/v940)', (zQ.match(/esDeReceta/g) || []).length >= 2);
ok('el motivo viaja por oninput a una window var (v813)', /oninput="window\._ocQuitForm/.test(zQ));
ok('sin motivo NO se quita nada', /ESCRIB[ÍI]/.test(zQ) && /'red'/.test(zQ));
ok('re-lee el pedido del state vivo tras el await', zQ.indexOf('_findPedidoGlobal') !== zQ.lastIndexOf('_findPedidoGlobal'));
ok('registra el historial completo', /itemsQuitados/.test(zQ) && /motivo/.test(zQ) && /por:/.test(zQ) && /ts:/.test(zQ) && /sourceKey/.test(zQ));
ok('sella pd._ts (union-merge v972)', /pd2\._ts = |\._ts = _t/.test(zQ));
ok('sube de inmediato (documento de compras)', /forceUploadNow/.test(zQ));
ok('quita TODAS las líneas del material (la partida v1145 comparte sourceKey)',
  /filter\([\s\S]{0,120}sourceKey/.test(zQ) || /ocWorkingItems = ocWorkingItems\.filter/.test(zQ));
ok('deja rastro en el log', /logActivity/.test(zQ));
ok('re-pinta el modal', /renderOcItems\(\)/.test(zQ));

console.log('\n— el botón: solo pedidos manuales, solo compras —');
const zO = ex(code, 'async function openOrdenCompra(');
ok('openOrdenCompra decide si se puede quitar', /_ocPuedeQuitar = /.test(zO) && /!pd\.esDeReceta/.test(zO));
ok('la fila pinta el botón condicionado', /_ocPuedeQuitar[\s\S]{0,220}_ocQuitarItem\(\$\{idx\}\)/.test(code));

console.log('\n— el solicitante VE qué le quitaron y por qué —');
/* el rótulo va en minúsculas en el fuente (la MAYÚSCULA la pone el CSS), y la clase
   pedido-items-summary aparece antes en el CSS — se ancla directo al bloque */
ok('la tarjeta del pedido pinta los quitados con su motivo',
  /pd\.itemsQuitados \|\| \[\]\)\.length[\s\S]{0,400}Quitado por compras/i.test(code) && /q\.motivo/.test(code));

console.log('\n— lo que no cambia —');
ok('el flujo de receta sigue intacto (el candado v978 no se tocó)', /_ocProvLocked = !can\('users\.manage'\)/.test(code));
ok('APP_SYNC no cambió (no toca merges): sigue en 927 o más', (Number((html.match(/APP_SYNC_VERSION = (\d+)/) || [])[1]) || 0) >= 927);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
