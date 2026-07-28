/* v1027 — SE ELIMINA EL DESPLEGABLE DE PROYECTOS (pedido de Antonio).
   "Quiero que me elimines esta opción. Prefiero que ahí arriba donde dice proyecto diga
    regresar al menú, y que se regrese al menú para poder cambiar de opción."

   Queda UN SOLO lugar donde se decide dónde trabajar: el menú principal. Se entra por ahí y
   se vuelve por ahí. Antes había dos caminos que hacían lo mismo (el desplegable de la barra
   y el menú), y el desplegable era justo el que hacía sentir que "todo seguía igual". */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— el desplegable ya no está —');
ok('se eliminó el panel con la lista de proyectos', !/pr-proj-panel" role="listbox"/.test(html));
ok('y su encabezado "Elegir proyecto"', !/pr-proj-panel-hd">Elegir proyecto/.test(html));
ok('ya no hay botón VER TODAS LAS OBRAS ahí adentro', !/VER TODAS LAS OBRAS/.test(html));

console.log('\n— la barra lleva al menú —');
ok('el botón de arriba abre el menú principal', /id="prProjBtn"[^>]*_abrirPantallaObra\(true\)/.test(html));
ok('y lo dice: REGRESAR AL MENÚ', /← REGRESAR AL MENÚ/.test(html));
ok('sigue mostrando en qué obra se está', /id="prProjBtnLabel"/.test(html) && /<span class="lbl">TRABAJANDO EN<\/span>/.test(html));
ok('forzando la apertura (no se salta por "ya eligió")', /_abrirPantallaObra\(true\)/.test(html));

console.log('\n— nada quedó colgando —');
/* renderProjectSelect seguía llenando la lista del desplegable: sin el nodo, su guarda evita
   el reventón. Se comprueba que la guarda exista, no que el código se haya borrado. */
const zR = ex('function renderProjectSelect(');
ok('renderProjectSelect no revienta sin la lista', /const list = document\.getElementById\('prProjList'\)/.test(zR) && /if \(list\)/.test(zR));
ok('sigue llenando el nombre de la obra', /prProjBtnLabel/.test(zR));
ok('prToggleProjDropdown sigue definida por si algo la llama', /window\.prToggleProjDropdown = function/.test(html));

console.log('\n— el menú sigue siendo el único lugar donde se elige —');
ok('el menú lista las obras', /proys\.map\(tarjeta\)/.test(ex('window._abrirPantallaObra = function')));
ok('y las ubicaciones de empresa con su permiso', /_puedeVerBodega\(\)/.test(ex('window._abrirPantallaObra = function')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
