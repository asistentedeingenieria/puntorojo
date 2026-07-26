/* v975 (pedidos de Antonio 25/26-jul, paquete):
   1. Aviso de la receta en MAYÚSCULAS + "SOLICITUD ENVIADA" aclara que NO se aplica.
   2. MEDIDA DE POSTES por solicitud: el proponente ve PROPONER CAMBIO (solicitarPostesMedida
      → solicitud tipo 'postes' PENDIENTE); el cambio directo (configurarPostesMedida) queda
      solo admin; autorizarReceta aplica la medida al aprobar.
   3. inventario.crear: iniciar tomas de inventario solo con permiso (+admin).
   4. Sub-pestañas de MATERIALES ocultables POR USUARIO (ocultarmat.*, default todas
      visibles; lectura LITERAL — el '*' del admin no debe ocultarle nada).
   5. Texto de la vista BODEGA CENTRAL reformulado (CARGAR EXISTENCIAS / ABASTECER / AJUSTE
      solo correcciones — el conteo inicial ya NO es el ajuste). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFrom(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 2. medida de postes por solicitud ──
const zSolP = extractFrom('window.solicitarPostesMedida = async function');
ok('solicitarPostesMedida existe', !!zSolP);
ok('encola tipo postes PENDIENTE, sin aplicar', /tipo:'postes'/.test(zSolP) && /estado:'PENDIENTE'/.test(zSolP) && !/postesMedidaNivel\[/.test(zSolP));
ok('gate receta.edit', /can\('receta\.edit'\)/.test(zSolP));
ok('configurarPostesMedida quedó solo admin', /users\.manage/.test((extractFrom('window.configurarPostesMedida = async function').match(/if \(!can\([^)]*\)\)[^\n]*/) || [''])[0]));
const zAutR = extractFrom('window.autorizarReceta = async function');
ok('autorizar aplica la medida (misma escritura del admin)', /sol\.tipo === 'postes'/.test(zAutR) && /postesMedidaNivel\[sol\.levelId\]/.test(zAutR));
const iBtn = html.indexOf("solicitarPostesMedida' : ");
ok('el botón alterna CAMBIAR (admin) / PROPONER CAMBIO', /esAdminReceta \? 'configurarPostesMedida' : 'solicitarPostesMedida'/.test(html) && /PROPONER CAMBIO/.test(html));

// ── 3. inventario.crear ──
ok('permiso inventario.crear', /key:\s*'inventario\.crear'/.test(html));
ok('iniciarTomaInventario gateado', /can\('inventario\.crear'\)/.test(extractFrom('function iniciarTomaInventario(')));
ok('el botón INICIAR NUEVA TOMA también', /can\('inventario\.crear'\)[^\n]*INICIAR NUEVA TOMA/.test(html.replace(/\n/g, ' ')));

// ── 4. sub-pestañas ocultables ──
['receta','pedidos','ordenes','inventarios','avance'].forEach(k =>
  ok('permiso ocultarmat.' + k, new RegExp("key:\\s*'ocultarmat\\." + k + "'").test(html)));
const oSrc = extractFrom('window._v975MatTabsOcultas = function');
ok('_v975MatTabsOcultas existe', !!oSrc);
let oFn = null;
try { oFn = new Function('getCurrentUser', 'return (function' + oSrc.slice(oSrc.indexOf('(')) + ')'); } catch(e){}
const mk = perms => new Function('getCurrentUser', 'return (function' + oSrc.slice(oSrc.indexOf('(')) + ')()')(() => ({ perms }));
try {
  ok('default: nada oculto', JSON.stringify(mk([])) === '[]');
  ok('ocultarmat.receta oculta receta', JSON.stringify(mk(['ocultarmat.receta'])) === JSON.stringify(['receta']));
  ok("el '*' del admin NO oculta nada", JSON.stringify(mk(['*', 'ocultarmat.receta'])) === '[]');
} catch(e){ ok('_v975MatTabsOcultas evaluable', false); }
ok('applyPermissions aplica el ocultado tras data-perm', /_v975MatTabsOcultas/.test(extractFrom('function applyPermissions(')));
ok('setMatTab salta a la primera visible', /_v975MatTabsOcultas/.test(extractFrom('function setMatTab(')));

// ── 5. texto de bodega reformulado (pedido: el ajuste ya no es el conteo inicial) ──
const zVista = extractFrom('function _abrirPanelBodega(');
ok('el header de bodega explica CARGAR/ABASTECER/AJUSTE-correcciones', /CARGAR EXISTENCIAS<\/b> anota lo que ya hay/.test(zVista) && /correcciones puntuales/.test(zVista) && !/Para el conteo inicial o correcciones poné el AJUSTE/.test(zVista));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
