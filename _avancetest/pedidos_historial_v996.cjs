/* v996 (pedido de Antonio 27-jul): "las que ya fueron entregadas guardalas y escondelas
   como la foto de planillas" — los pedidos RECIBIDO EN OBRA se van a un bloque colapsable
   al final de LISTA DE PEDIDOS, con el mismo patrón de HISTORIAL DE PLANILLAS CERRADAS
   (conteo + ▶ MOSTRAR / ▼ OCULTAR, preferencia recordada por proyecto en localStorage).
   No se borra nada: se guardan y se muestran cuando se piden.
   También: ENVIAR A COMPRAS deja el formulario limpio y avisa (antes el catálogo nunca se
   repintaba, así que los chips y el contador seguían marcados como si no se hubiera enviado). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── historial de recibidos ──
const zL = ex('function renderPedidosList(');
ok('los recibidos salen de la lista activa', /status !== 'RECIBIDO'/.test(zL));
ok('y se agrupan en el historial', /status === 'RECIBIDO'/.test(zL) && /HISTORIAL DE PEDIDOS RECIBIDOS/.test(zL));
ok('el bloque muestra el conteo y MOSTRAR/OCULTAR', /\$\{_hist\.length\} · \$\{_hVis \? '▼ OCULTAR' : '▶ MOSTRAR'\}/.test(zL));
ok('recuerda la preferencia POR PROYECTO', /pedidos_historial_visible_' \+ \(\(p && p\.id\) \|\| 'def'\)/.test(zL));
ok('solo pinta las tarjetas del historial si está abierto', /_hVis \? `<div style="padding:4px 0 12px">/.test(zL));
ok('si no queda ningún activo lo dice (no una lista vacía muda)', /No hay pedidos activos/.test(zL));
const zT = ex('window.togglePedidosHistorial = function');
/* v1067 (Antonio: "todos los historiales cerrados por default cuando me meto"): el flag
   pasó de localStorage (quedaba pegado para siempre) a memoria de sesión (_histToggle) */
ok('el toggle invierte la preferencia y repinta', /_histToggle\(/.test(zT) && /renderPedidosList\(\)/.test(zT));
ok('el toggle no explota sin localStorage', /catch\(e\)\{\}/.test(zT));

// ── ENVIAR A COMPRAS deja todo limpio ──
const zS = ex('async function submitPedido(');
ok('repinta el catálogo tras enviar (la causa del "no me borra todo")', /renderPedidoForm\(\)/.test(zS));
ok('repinta los materiales extraordinarios', /renderExtraMaterials\(\)/.test(zS));
ok('avisa que el pedido se envió', /ENVIADO A COMPRAS/.test(zS));
ok('la limpieza no puede tumbar el cierre (va en try)', /catch\(e\)\{ console\.warn\('\[v996\] limpieza del formulario/.test(zS));
ok('los campos ocultos de proyecto MANUAL ya no se leen a ciegas', /const _nv = document\.getElementById\('pfNivel'\); if \(_nv\)/.test(zS));
ok('el cambio de pestaña también está blindado', /try \{ setPedidoTab\('lista'\); \} catch/.test(zS));
const zR = ex('async function resetPedidoForm(');
ok('LIMPIAR tiene las mismas guardas', /const _nvR = document\.getElementById\('pfNivel'\); if \(_nvR\)/.test(zR));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
