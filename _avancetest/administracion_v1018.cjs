/* v1018 — ADMINISTRACIÓN: pólizas y anticipos salen de donde estaban.
   Antonio: "en personal necesito ordenar ahi para quitar las polizas... crear una opcion en
   proyectos que tenga las polizas ahi y los anticipos. Por lo mismo quiero que saquemos la
   pestaña de anticipos de donde esta y la pongamos junto a la nueva. NO me elimines nada de
   la informacion actual."

   Es puro cambio de NAVEGACIÓN. Se MUEVE el nodo real dentro del panel y se devuelve al
   salir — el patrón del formulario de pedido en PROYECTOS VARIOS (v1007). Cero cambios en
   los datos, cero cambios en los renders: si algo tocara p.materiales, las pólizas o los
   anticipos, sería un error. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. la ubicación nueva —');
ok('ADMINISTRACIÓN está en el desplegable de PROYECTO', /_abrirPanelAdmin\(\)/.test(html) && /ADMINISTRACIÓN<\/span>/.test(html));
ok('junto a BODEGA CENTRAL y PROYECTOS VARIOS', html.indexOf('PROYECTOS VARIOS</span>') < html.indexOf('ADMINISTRACIÓN</span>'));
const zA = ex('window._abrirPanelAdmin = function');
ok('el panel existe', zA.length > 400);
ok('es una capa opaca a pantalla completa como los otros', /z-index:98000/.test(zA) && /background:var\(--paper\)/.test(zA));
ok('tiene las dos sub-pestañas', /data-admintab="polizas"/.test(zA) && /data-admintab="anticipos"/.test(zA));
ok('las pestañas envuelven en celular (v986)', /ped-tabs-bar/.test(zA));

console.log('\n— 2. NO se duplica: se mueve el nodo real —');
/* v1050: el mover pasó a un helper prestar(id, marca) — mismos nodos, mismo mecanismo */
ok('mueve #planilla-polizas', /prestar\('planilla-polizas', '_adminCasaPolizas'\)/.test(zA));
ok('mueve #planilla-anticipos', /prestar\('planilla-anticipos', '_adminCasaAnticipos'\)/.test(zA));
ok('deja una marca para saber a dónde devolverlos', /_adminCasaPolizas/.test(zA) && /_adminCasaAnticipos/.test(zA));
const zD = ex('function _adminDevolverNodos(');
/* v1050: devolver(id, marca, display) — mismo insertBefore, generalizado */
ok('los devuelve a su lugar', /devolver\('planilla-polizas', '_adminCasaPolizas', 'none'\)/.test(zD) && /devolver\('planilla-anticipos', '_adminCasaAnticipos', 'none'\)/.test(zD) && /insertBefore\(nodo, marca\)/.test(zD));
const zC = ex('function _cerrarPanelAdminDom(');
ok('y los devuelve ANTES de destruir el panel', zC.indexOf('_adminDevolverNodos') < zC.indexOf('m.remove()'));

console.log('\n— 3. salieron de donde estaban —');
ok('PÓLIZAS ya no es pestaña de PERSONAL', !/data-perstab="polizas"/.test(html));
ok('ANTICIPOS ya no es pestaña de LIQUIDACIÓN', !/data-plantab="anticipos"/.test(html));

console.log('\n— 4. NADA de la información se toca —');
ok('el contenedor de pólizas sigue existiendo', /id="planilla-polizas"/.test(html));
ok('el de anticipos también', /id="planilla-anticipos"/.test(html));
ok('renderPlanillaPolizas sigue viva', /window\.renderPlanillaPolizas/.test(html));
ok('renderPlanillaAnticipos también', /window\.renderPlanillaAnticipos/.test(html));
ok('el panel no escribe estado', !/saveState\(\)/.test(zA));
ok('ni toca los datos de pólizas o anticipos', !/solicitudesAnticipo\s*=/.test(zA) && !/\.polizas\s*=/.test(zA));

console.log('\n— 5. reglas del proyecto —');
/* la guarda es una lista de selectores: el panel tiene que estar ahí o un merge remoto puede
   pisar la pantalla mientras está abierta (regla v769/v940) */
ok('el panel pospone applyRemote (como bodega y varios)',
   /#_bodegaPanelModal|#_variosPanelModal/.test(html) && /#_adminPanelModal, \.prModal-backdrop/.test(html));
ok('tiene su gate de permiso', /function _puedeVerAdmin\(/.test(html));
/* v1023: ya NO entra por polizas.edit ni planilla.ver — Antonio: "predeterminadamente
   nadie lo ve y yo doy el permiso". Ahora pide su propio menu.admin. */
ok('pide su propio permiso, no uno de otra cosa', /menu\.admin/.test(ex('function _puedeVerAdmin(')));

/* el badge de anticipos pendientes viajó con la pestaña: sin él, nadie se entera de que hay
   solicitudes esperando sin entrar a mirar */
ok('el badge de anticipos pendientes no se perdió', /id="tabBadge-anticipos"/.test(html));
ok('y vive en la sub-pestaña nueva', /data-admintab="anticipos"[^>]*>ANTICIPOS<span id="tabBadge-anticipos"/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
