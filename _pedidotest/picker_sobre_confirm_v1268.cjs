/* v1268 (Antonio, 21-ago: "SIGUE SIN FUNCIONAR — presiono PUESTO en EDITAR PÓLIZA y no
   despliega el listado"; el diagnóstico en su Chrome: select sano, nada encima,
   showPicker OK):
   CAUSA RAÍZ: en DESKTOP el mousedown sobre CUALQUIER <select> lo intercepta v967
   (preventDefault — el popup nativo NUNCA abre) y abre el picker v925 `_prPickerPanel`
   colgado del body en z-index 100300. v1257 subió los confirms (prConfirm/prAlert/
   prPrompt) a 100500 → todo select dentro de un confirm (EDITAR PÓLIZA vive en uno)
   abría su picker DETRÁS del telón del confirm: invisible. v1267 (panel v391 encima
   del select) era real pero secundario.
   REGLA DE CAPAS (completa): modales ≤ 100400 < confirms 100500 < DESPLEGABLES
   FLOTANTES colgados del body 100600 < toast 999999. Un desplegable que nace de un
   control SIEMPRE va encima de la capa donde vive el control. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }

const zPick = ex('function _abrirPicker(anchorEl, opts)');
const mPick = zPick.match(/panel\.id = '_prPickerPanel';[\s\S]{0,1200}?panel\.style\.cssText = 'position:fixed;z-index:(\d+)/);
const zPicker = mPick ? Number(mPick[1]) : -1;
const iConf = html.indexOf('id="prConfirmModal" class="prModal-backdrop"');
const mConf = html.slice(iConf, iConf + 400).match(/z-index:(\d+)/);
const zConfirm = mConf ? Number(mConf[1]) : -1;

ok('el picker genérico declara su z-index en el cssText del panel', zPicker > 0);
ok('los confirms declaran su z-index (100500)', zConfirm === 100500);
ok('el picker de los <select> (desktop v967) queda ENCIMA de los confirms (' + zPicker + ' > ' + zConfirm + ')', zPicker > zConfirm);
ok('…pero DEBAJO del toast (999999)', zPicker < 999999);

/* el interceptor v967 sigue vivo: en desktop el select no abre el popup nativo, abre el picker */
const iV967 = html.indexOf('v967: SELECTS SIEMPRE HACIA ABAJO');
ok('v967 intacto: mousedown en select → preventDefault + _abrirPicker', iV967 > 0 && /ev\.preventDefault\(\);[\s\S]{0,300}_abrirPicker\(sel/.test(html.slice(iV967, iV967 + 3000)));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
