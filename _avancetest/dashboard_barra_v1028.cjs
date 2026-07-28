/* v1028 — el DASHBOARD EJECUTIVO como opción del menú + la barra más delgada.
   Antonio: "El dashboard ejecutivo quiero que también sea como un proyecto y me salga aparte.
   Así cuando me meta al proyecto ya solo me salga la información del proyecto. La foto 3 es
   porque no me gusta cómo se ve. Quiero que sea más delgado. Tal vez creás un botón aparte
   que diga regresar al menú." */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. el dashboard es una opción más del menú —');
const zP = ex('window._abrirPantallaObra = function');
ok('aparece en TODA LA EMPRESA', /DASHBOARD EJECUTIVO/.test(zP));
ok('dice qué es', /TODAS LAS OBRAS JUNTAS/.test(zP));
ok('respeta el permiso de dashboard', /can\('view\.dashboard'\)/.test(zP));
ok('existe la entrada', /window\._verDashboardGeneral = function/.test(html));
const zV = ex('window._verDashboardGeneral = function');
ok('marca que se entró por el menú', /_dashGeneral = true/.test(zV));
ok('y abre la vista', /setView\('dashboard'\)/.test(zV));

console.log('\n— 2. dentro de una obra se ve SOLO esa obra —');
const zD = ex('function renderDashboard(');
ok('el resumen filtra por la obra activa', /_dashGeneral/.test(zD) && /p\.id === state\.activeProjectId/.test(zD));
ok('entrar a una obra apaga el modo general', /_dashGeneral = false/.test(ex('window._elegirObraYEntrar = function')));
/* si el filtro deja la lista vacía (obra sin id, o estado raro) se cae a mostrar todo:
   es preferible ver de más que una pantalla en blanco */
ok('nunca deja el resumen vacío', /_dashLista\.length \? _dashLista : state\.projects/.test(zD));

console.log('\n— 3. la barra quedó delgada y el volver es su propio botón —');
ok('el volver salió de la caja roja', !/pr-proj-volver/.test(html));
ok('y es un botón aparte', /class="btn ghost sm pr-btn-menu"/.test(html));
ok('que dice MENÚ', /← MENÚ<\/button>/.test(html));
ok('y lleva al menú principal', /pr-btn-menu"[^>]*_abrirPantallaObra\(true\)/.test(html));
ok('la caja vuelve a una sola línea', /\.proj-switcher\{flex-direction:row/.test(html));
/* lo que importa es que siga siendo de una línea: padding vertical chico, no un valor exacto
   (v1029 lo ajustó a 7px al unificar la tipografía) */
ok('con menos alto que antes', /\.proj-switcher\{[^}]*padding:[1-9]px 12px/.test(html));
ok('la caja ya no es clickeable (el botón hace ese trabajo)', /\.proj-switcher \.pr-proj-btn\{[^}]*cursor:default/.test(html));
ok('sigue mostrando en qué obra se está', /id="prProjBtnLabel"/.test(html) && /TRABAJANDO EN/.test(html));

console.log('\n— 4. el markup quedó balanceado —');
/* la caja roja cierra ANTES del botón: si quedara adentro, heredaría el fondo rojo */
const iSw = html.indexOf('<div class="proj-switcher">');
const iBtn = html.indexOf('pr-btn-menu');
const entre = html.slice(iSw, iBtn);
ok('el botón está fuera de la caja roja', (entre.match(/<div/g) || []).length === (entre.match(/<\/div>/g) || []).length);
ok('no quedó un div oculto de relleno', !/<div style="display:none">\s*<\/div>/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
