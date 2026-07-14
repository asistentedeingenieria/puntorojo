/* v913 (el panel PEDIR DE RECETA sigue invisible SOLO en la sesión de Antonio, aun en v912):
   Estrategia robusta: la grilla ya no vive en un panel de la pestaña sino en un MODAL
   a nivel de body (patrón _selItemsModal, igual que todos los modales que SÍ le
   funcionan). setPedidoTab('receta') intercepta y abre _abrirModalPedirReceta();
   el div #recetaPedirContent existe SOLO dentro del modal (se eliminó el panel
   #pedido-receta del HTML estático) → renderRecetaPedir y toggleRecetaPedirTorre
   siguen funcionando sin cambios. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. el panel estático desapareció; el botón de la sub-pestaña queda ──
ok('sin panel #pedido-receta en el HTML estático', !/id="pedido-receta"/.test(html));
const _iCont = html.indexOf('id="recetaPedirContent"');
const _iModal = html.indexOf('function _abrirModalPedirReceta(');
ok('sin #recetaPedirContent estático (la única ocurrencia vive dentro del modal)',
  _iCont > 0 && _iModal > 0 && _iCont > _iModal && html.indexOf('id="recetaPedirContent"', _iCont + 1) === -1);
ok('la sub-pestaña PEDIR DE RECETA sigue existiendo', /data-pedtab="receta"/.test(html));

// ── 2. setPedidoTab intercepta 'receta' y abre el modal ──
const srcTab = extractFn('setPedidoTab');
ok("setPedidoTab('receta') abre el modal y no toca paneles", /tab === 'receta'[\s\S]{0,120}_abrirModalPedirReceta\(\)/.test(srcTab) && /return/.test(srcTab));
ok('setPedidoTab ya no referencia el panel viejo', !/pedido-receta/.test(srcTab));

// ── 3. el modal ──
const srcModal = extractFn('_abrirModalPedirReceta');
ok('_abrirModalPedirReceta existe', !!srcModal);
ok('el modal contiene el div recetaPedirContent', /id="recetaPedirContent"/.test(srcModal));
ok('el modal se cuelga del body (nivel raíz, como los demás modales)', /document\.body\.appendChild/.test(srcModal));
ok('al abrir renderiza la grilla', /renderRecetaPedir\(\)/.test(srcModal));
ok('gate de permiso pedidos.create', /can\('pedidos\.create'\)/.test(srcModal));
ok('cierre del modal existe', !!extractFn('_cerrarModalPedirReceta'));

// ── 4. renderRecetaPedir intacto (guard si el modal está cerrado) ──
const srcRender = extractFn('renderRecetaPedir');
ok('renderRecetaPedir mantiene el guard de contenedor', /if \(!cont\) return;/.test(srcRender));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
