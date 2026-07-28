/* v1029 — DOS MUNDOS QUE NO SE MEZCLAN + la barra unificada.
   Antonio: "cuando se selecciona dashboard ejecutivo quiero que me salga SOLO el dashboard,
   no cobro ni avance ni materiales ni personal, porque este dashboard es la unificación de
   todos los proyectos... cuando selecciono un proyecto ya no me debe aparecer el dashboard,
   solo la información del proyecto. El botón de menú lo quiero a la IZQUIERDA de trabajando
   en. Y la letra del proyecto igual que la de TRABAJANDO EN, todo sin negritas, unificado." */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. el dashboard ejecutivo va solo —');
const zM = ex('function _aplicarModoVista(');
ok('existe el separador de modos', zM.length > 150);
ok('recorre las pestañas principales', /\.tabs \.tab\[data-view\]/.test(zM));
/* la regla en una línea: en modo empresa vive SOLO el dashboard; dentro de una obra, todo
   MENOS el dashboard */
ok('muestra el dashboard solo en modo empresa', /general === esDash/.test(zM));
ok('y la barra dice dónde se está parado', /DASHBOARD EJECUTIVO/.test(zM));

console.log('\n— 2. se comporta —');
let fA = null;
try {
  // se simulan las pestañas reales
  const tabs = ['dashboard','cobro','avance','materiales','personal','planilla','actividad']
    .map(v => ({ dataset:{ view:v }, style:{ display:'' } }));
  const doc = { querySelectorAll: () => tabs, getElementById: () => ({ textContent:'' }) };
  fA = new Function('document', 'window', 'return (' + zM + ')');
  const f1 = fA(doc, { _dashGeneral: true });  f1();
  const soloDash = tabs.filter(t => t.style.display !== 'none').map(t => t.dataset.view);
  ok('en DASHBOARD EJECUTIVO solo queda el dashboard', soloDash.length === 1 && soloDash[0] === 'dashboard');
  const f2 = fA(doc, { _dashGeneral: false }); f2();
  const sinDash = tabs.filter(t => t.style.display !== 'none').map(t => t.dataset.view);
  ok('dentro de una obra NO está el dashboard', sinDash.indexOf('dashboard') < 0);
  ok('y sí están las de la obra', sinDash.indexOf('cobro') >= 0 && sinDash.indexOf('materiales') >= 0 && sinDash.length === 6);
} catch(e){ console.log('   (no evaluable: ' + e.message + ')'); ['solo dash','sin dash','las de obra'].forEach(n => ok(n, false)); }

console.log('\n— 3. se aplica donde toca —');
ok('al entrar al dashboard ejecutivo', /_aplicarModoVista\(\)/.test(ex('window._verDashboardGeneral = function')));
const zE = ex('window._elegirObraYEntrar = function');
ok('al elegir una obra', /_aplicarModoVista\(\)/.test(zE));
ok('y al arrancar la app', /_aplicarModoVista\(\)/.test(ex('function renderAll(')));
/* si se ocultara la pestaña activa sin mover la vista, quedaría una pantalla escondida */
ok('elegir obra lleva a una pestaña de trabajo', /setView\(_primera\)/.test(zE));
ok('respetando permisos', /can\('view\.' \+ v\)/.test(zE));

console.log('\n— 4. la barra: botón a la izquierda y letra unificada —');
const iBtn = html.indexOf('pr-btn-menu');
const iSw  = html.indexOf('class="proj-switcher"');
ok('el botón MENÚ va ANTES de TRABAJANDO EN', iBtn > 0 && iBtn < iSw);
ok('la etiqueta y el nombre comparten tipografía', /\.proj-switcher \.lbl,\s*\r?\n\.proj-switcher \.pr-proj-btn\{/.test(html));
const zTipo = html.slice(html.indexOf('.proj-switcher .lbl,'), html.indexOf('.proj-switcher .lbl,') + 260);
ok('mismo tamaño', /font-size:11px/.test(zTipo));
ok('mismo espaciado', /letter-spacing:1\.4px/.test(zTipo));
ok('sin negritas', /font-weight:400/.test(zTipo));
ok('el botón tampoco va en negrita', /\.pr-btn-menu\{[^}]*font-weight:400/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
