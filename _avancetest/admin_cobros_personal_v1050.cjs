/* v1050 — FASE 3: COBROS y PERSONAL (colaboradores + gerencia) viven en ADMINISTRACIÓN, por
   proyecto. COBRO y esas dos sub-pestañas SALEN de la obra; la ASISTENCIA se queda (v1047).
   Plan aprobado por Antonio (29-jul, decisión AskUserQuestion: COBRO solo en ADMINISTRACIÓN).
   REGLA DE ORO: ningún dato se toca — nodos prestados con marca (v1018), renders de siempre. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m,0),d=0; i=html.indexOf('{',m); for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. el panel presta los nodos nuevos —');
const zA = ex('window._abrirPanelAdmin = function');
['_adminCasaCobro','_adminCasaPersKpis','_adminCasaPersLista','_adminCasaGerencia'].forEach(m => ok('marca ' + m, new RegExp(m).test(zA)));
/* ⚠️ JAMÁS .active al nodo prestado: habría DOS '.view.active' y _aplicarModoVista leería la
   primera en orden de documento. El inline display:block le gana a .view{display:none}. */
ok('a #view-cobro NUNCA se le pone .active', !/classList\.add\('active'\)/.test(zA));
ok('la barra tiene las 4 secciones', ['polizas','anticipos','cobros','personal'].every(t => new RegExp('data-admintab="' + t + '"').test(zA)));
ok('el badge de cobro vive en el botón COBROS', /data-admintab="cobros"[^>]*>[^<]*COBROS<span id="badgeCobro">/.test(zA));
ok('se recuerda la obra de origen', /_adminObraOrigen/.test(zA));
ok('y se marca el body (antídoto de apilado v1035)', /pr-admin-abierto/.test(zA));
ok('el CSS del antídoto existe', /body\.pr-admin-abierto \.modal-bg\{z-index:99100\}/.test(html));

console.log('\n— 2. devolver y cerrar —');
const zD = ex('function _adminDevolverNodos(');
/* #view-cobro vuelve con display '' — VACÍO, no 'none': las clases .view/.view.active deben
   volver a gobernar (diferencia deliberada con pólizas/anticipos) */
ok('cobro vuelve con display vacío', /devolver\('view-cobro', '_adminCasaCobro', ''\)/.test(zD));
ok('las cards de personal vuelven', /_adminCasaPersLista/.test(zD) && /_adminCasaGerencia/.test(zD) && /_adminCasaPersKpis/.test(zD));
const zC = ex('window._cerrarPanelAdmin = function');
ok('VOLVER restaura la obra de origen', /_adminObraOrigen/.test(zC) && /setActiveProject\(/.test(zC));
ok('y quita la marca del body', /pr-admin-abierto/.test(zC));
ok('el cierre interno NO restaura (repintados)', !/_adminObraOrigen/.test(ex('function _cerrarPanelAdminDom(')));

console.log('\n— 3. el despacho de secciones —');
const zT = ex('window._adminSetTab = function');
ok('COBROS pinta con el render de siempre', /renderCobro\(\)/.test(zT));
ok('PERSONAL pinta lista y gerencia', /renderPersonal\(\)/.test(zT) && /renderGerencia\(\)/.test(zT));
ok('con selector de proyecto', /_adminSelectorHTML/.test(zT));
ok('re-aplica los displays AL FINAL (setPersonalSubTab los pisa)', zT.lastIndexOf('pl.style.display') > zT.indexOf('renderPersonal()'));
ok('gates: COBROS por view.cobro', /can\('view\.cobro'\)/.test(zT) || /can\('view\.cobro'\)/.test(zA));
ok('PERSONAL por colaboradores o gerencia', /_puedeVerColaboradores/.test(zT + zA) && /_gerPuede/.test(zT + zA));
const zSel = ex('function _adminSelectorHTML(');
ok('selector data-nativo con la obra activa', /data-nativo/.test(zSel) && /activeProjectId/.test(zSel));
ok('cambiar proyecto reabre el panel (cae en la misma sección)', /_cerrarPanelAdminDom\(\)/.test(ex('window._adminCambiarProyecto = function')) );

console.log('\n— 4. COBRO salió de la obra —');
ok('el botón de la barra ya no está', !/data-view="cobro" onclick/.test(html));
ok('la vista QUEDA como casa', /<section id="view-cobro"/.test(html) || /id="view-cobro"/.test(html));
ok("'cobro' fuera del fallback de elegir obra", !/\['cobro','avance','materiales','personal','planilla','actividad'\]/.test(ex('window._elegirObraYEntrar = function')));
ok("y del de _aplicarModoVista", !/\['cobro','avance'/.test(ex('function _aplicarModoVista(')));
/* renderCobro corre tras CADA mutación de cobro — sin pestaña, el span no existe */
ok('badgeCobro con null-guard', /_bC = document\.getElementById\('badgeCobro'\); if \(_bC\)/.test(html));
ok('la notificación de estimación abre ADMINISTRACIÓN', /_abrirPanelAdmin/.test(ex('function _notifAccion(')) || /window\._adminTab = 'cobros'/.test(html));
ok('VER COBRO del dashboard también', !/setActiveProject\('\$\{p\.id\}'\);setView\('cobro'\)/.test(html));

console.log('\n— 5. COLABORADORES y GERENCIA salieron; ASISTENCIA queda —');
ok('los botones ya no están en la obra', !/data-perstab="lista" onclick/.test(html) && !/data-perstab="gerencia" onclick/.test(html));
ok('ASISTENCIA sigue', /data-perstab="asistencia" onclick/.test(html));
const zSub = ex('window.setPersonalSubTab = function');
ok('pedir lista/gerencia SIN el panel cae en asistencia', /_adminPanelModal/.test(zSub) && /tab\s*=\s*'asistencia'/.test(zSub));
ok('el default de PERSONAL es asistencia', /return 'asistencia'/.test(ex('function _defaultSubPestPersonal(')));
ok('el arranque también', /window\.currentPersonalSubTab = 'asistencia'/.test(html));
ok('la lista filtra por el proyecto del selector', /_adminObraFiltro/.test(ex('function _persListaFiltrada(')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
