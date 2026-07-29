/* v961 (idea de Antonio aprobada): la BODEGA CENTRAL vive en PROYECTOS —
   - entrada especial al final del desplegable PROYECTO del navbar (solo quien puede
     gestionarla) y también en el gate de entrada;
   - _abrirPanelBodega pasa de modal centrado a VISTA COMPLETA (pantalla entera,
     fondo paper) con buscador de materiales y botón VOLVER;
   - la vista es un espacio de trabajo largo → YA NO pospone applyRemote (se quitó de
     isUserBusy; el modal corto de RECIBIDO sí sigue);
   - cerrar la bodega sin haber elegido proyecto real reabre el gate;
   - rótulo del ABASTECER aclarado: la fecha es "¿PARA CUÁNDO LO NECESITÁS EN BODEGA?". */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFrom(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. entrada en el desplegable de PROYECTOS del navbar ──
const iDd = html.indexOf("list.innerHTML = _projsVis.map");
const zDd = html.slice(iDd, iDd + 2200);
ok('desplegable con entrada BODEGA CENTRAL', /BODEGA CENTRAL/.test(zDd) && /_abrirPanelBodega/.test(zDd));
// v963: la ENTRADA la decide Antonio por usuario — solo materiales.bodega|admin la ven
ok('...solo para quien Antonio marque (_puedeVerBodega)', /_puedeVerBodega\(\)/.test(zDd));

// ── 2. gate de entrada por permiso ──
const vSrc = extractFrom('function _puedeVerBodega(');
ok('_puedeVerBodega = materiales.bodega o admin (SIN compras)', /materiales\.bodega/.test(vSrc) && /users\.manage/.test(vSrc) && !/compras\.autorizar/.test(vSrc));
/* v1040: el permiso restringido pasó a ser menu.bodega (el de la entrada de COMPRAS) */
ok('el botón de la toolbar usa el permiso restringido', /data-perm="menu\.bodega\|users\.manage"[^>]*onclick="_abrirPanelBodega\(\)"/.test(html));

// ── 3. la vista completa ──
const zView = extractFrom('function _abrirPanelBodega(');
ok('es vista de pantalla COMPLETA (paper, no modal oscuro)', /position:fixed;inset:0/.test(zView) && /background:var\(--paper\)/.test(zView) && !/rgba\(0,0,0,\.55\)/.test(zView));
ok('tiene buscador de materiales unificado', /pr-buscador/.test(zView) && /_bodegaViewFiltrar|_bodegaViewFiltro/.test(zView));
ok('tiene botón VOLVER', /VOLVER/.test(zView));
ok('conserva POR RECIBIR y ABASTECER', /POR RECIBIR/.test(zView) && /_abrirModalBodega/.test(zView));

// ── 4. sync: la vista NO pospone applyRemote; el modal RECIBIDO sí ──
const zBusy = extractFrom('isUserBusy(){');
const qsBusy = (zBusy.match(/querySelector\('#prConfirmModal[^']*'\)/) || [''])[0]; // la LISTA de modales (no el .modal-bg.show ni el comentario)
ok('la vista de bodega YA NO está en isUserBusy', !!qsBusy && !/_bodegaPanelModal/.test(qsBusy));
ok('el modal RECIBIDO sigue posponiendo', /_ocRecibidoModal/.test(qsBusy));

// ── 5. cerrar la bodega regresa a la app tal cual (v963: sin gate) ──
const zCerrar = extractFrom('function _cerrarPanelBodega(');
ok('cerrar la bodega es un cierre simple', /_cerrarPanelBodegaDom\(\)/.test(zCerrar) && !/_abrirGateProyecto/.test(zCerrar));

// ── 6. recepción desde la vista re-pinta la vista ──
ok('confirmar RECIBIDO refresca la vista si está abierta', /_bodegaPanelModal/.test(extractFrom('function _ocConfirmarRecibido(')));

// ── 7. rótulo del ABASTECER aclarado ──
ok('la fecha dice para cuándo se necesita en bodega', /PARA CUÁNDO LO NECESITÁS EN BODEGA/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
