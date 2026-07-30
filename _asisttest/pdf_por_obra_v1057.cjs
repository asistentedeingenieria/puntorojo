/* v1057 — PDFs de asistencia POR PROYECTO SELECCIONADO (pedido de Antonio, 29-jul):
   "quiero que me descargue con base al proyecto en el que se está trabajando. NO el de
   todos… Todos los reportes de asistencia debe de descargar con base al proyecto que se
   seleccionó." Revierte la parte multi-obra de v1047 en los CALLERS (los generadores ya
   soportan ambos modos con explicit=true y ''=TODAS — esos NO se tocan).
   El modo conjunto vive SOLO en ADMINISTRACIÓN>PERSONAL: botones propios que respetan el
   selector del panel (TODAS LAS OBRAS o una obra puntual vía window._adminObraFiltro). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. PDF SEMANAL: sale del proyecto seleccionado —');
const zS = ex('window.abrirPdfSemanal = function');
ok('acepta el modo admin (desdeAdmin)', /function\(desdeAdmin\)/.test(zS));
ok('la obra sale de _obraFiltroAsist (la activa)', /_obraFiltroAsist/.test(zS));
ok('ya NO cae a _getUserObraAsignada (eso era v1047)', !/_getUserObraAsignada/.test(zS));
/* admin en estado neutro (v961, sin proyecto elegido): avisar, NO caer a TODAS en silencio */
ok('sin proyecto elegido avisa', /ELEG[ÍI] UN PROYECTO/.test(zS));
ok('desde ADMINISTRACIÓN respeta el selector del panel', /_adminObraFiltro/.test(zS));
ok('sigue llamando con explicit=true (obra autoritativa)', /_generarPdfSemanal\([^)]*,\s*obraPdf,\s*true\)/.test(zS));

console.log('\n— 2. PDF MENSUAL: igual —');
const zM = ex('window.abrirPdfMensual = function');
ok('acepta el modo admin', /function\(desdeAdmin\)/.test(zM));
ok('obra activa + sin _getUserObraAsignada', /_obraFiltroAsist/.test(zM) && !/_getUserObraAsignada/.test(zM));
ok('avisa sin proyecto', /ELEG[ÍI] UN PROYECTO/.test(zM));
ok('respeta el selector del panel', /_adminObraFiltro/.test(zM));
ok('explicit=true', /_generarPdfMensual\([^)]*,\s*obraPdf,\s*true\)/.test(zM));

console.log('\n— 3. ESTADO DE FUERZA: también por proyecto —');
const zEF = ex('function _efTargetObra(');
ok('usa _obraFiltroAsist', /_obraFiltroAsist/.test(zEF));
ok('ya no _getUserObraAsignada', !/_getUserObraAsignada/.test(zEF));

console.log('\n— 4. los generadores NO se tocaron (siguen sirviendo a ambos modos) —');
const zGen = ex('function _generarPdfSemanal(');
ok("explicit + ''=TODAS intactos", /explicit \? String\(obraCtx\|\|''\)/.test(zGen) && /verObras = \(obra===''\)/.test(zGen));

console.log('\n— 5. ADMINISTRACIÓN>PERSONAL: los botones conjuntos —');
const zB = ex('function _adminPdfBotonesHTML(');
ok('existe la barra de botones', zB.length > 200);
ok('semanal y mensual en modo admin', /abrirPdfSemanal\(true\)/.test(zB) && /abrirPdfMensual\(true\)/.test(zB));
/* applyPermissions corre UNA vez al abrir el panel; este HTML se re-inyecta en cada
   cambio de pestaña → el gate va con can() INLINE, no con data-perm */
ok('gateados con can() inline', /can\('personal\.asistenciaPdf'\)/.test(zB) && /can\('personal\.asistenciaMensual'\)/.test(zB) && !/data-perm/.test(zB));
const zT = ex('window._adminSetTab = function');
ok('la pestaña PERSONAL los pinta', /_adminPdfBotonesHTML\(\)/.test(zT));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
