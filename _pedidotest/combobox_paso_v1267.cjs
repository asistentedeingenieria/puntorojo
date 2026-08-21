/* v1267 (Antonio, 20-ago: "en EDITAR PÓLIZA el PUESTO no deja desplegar"): REPRODUCIDO
   en navegador — el combobox v391 del NOMBRE abre su panel de sugerencias al ENFOCAR,
   posicionado encima del PUESTO (elementFromPoint en el centro del select devolvía el
   panel). El clic en PUESTO caía en el panel: no abría el select, y con colaboradores
   listados la PRIMERA fila quedaba justo ahí — el clic cambiaba el nombre sin querer.
   FIX: (1) al enfocar, el panel solo se abre si el campo está VACÍO (con nombre puesto
   se abre al TIPEAR — lo que dice el placeholder); (2) si el panel está abierto y el
   mousedown cae en su fondo (no en una fila), se esconde y el clic PASA al elemento de
   abajo (focus + showPicker para selects). Las filas siguen seleccionando. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zC = ex('window._v391Combobox = function');
ok('al enfocar usa _v391CbFocus (no el filtro directo)', /onfocus="window\._v391CbFocus\(/.test(zC) && !/onfocus="window\._v391CbFilter\(/.test(zC));
const zF = ex('window._v391CbFocus = function');
ok('_v391CbFocus solo abre el panel con el campo VACÍO', /\.value/.test(zF) && /_v391CbFilter/.test(zF) && /trim\(\)/.test(zF));
const zFi = ex('window._v391CbFilter = function');
ok('las filas van marcadas (data-cbrow) para distinguirlas del fondo', /data-cbrow/.test(zFi));
ok('el fondo del panel PASA el clic al elemento de abajo (elementFromPoint + showPicker)',
  /drop\.onmousedown/.test(zFi) && /elementFromPoint/.test(zFi) && /showPicker/.test(zFi) && /closest\('\[data-cbrow\]'\)/.test(zFi));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
