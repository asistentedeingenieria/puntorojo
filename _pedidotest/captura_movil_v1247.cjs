/* v1247 (Antonio, 17-ago, con el DESP4-000013 compartido DESDE EL TELÉFONO apachurrado):
   "Siempre quiero que sin importar el dispositivo se comparta en tamaño carta."
   CAUSA RAÍZ: el iframe oculto de 920px no sostiene su ancho en el celular (iOS/Android
   lo acomodan al viewport del teléfono) y html2canvas toma windowWidth del innerWidth
   REAL — la hoja se pinta angosta y así sale la foto. FIX doble cinturón:
   1. El documento EXIGE su ancho en modo captura: min-width en html/body (920 OC,
      820 solicitud/recibo). Solo en captura — en impresión forzaría escalado.
   2. html2canvas recibe windowWidth/windowHeight EXPLÍCITOS en las 3 capturas. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— 1. el documento exige su ancho en captura —');
const zP = ex('function printOrdenCompra(');
ok('la OC en modo foto fuerza min-width:920px (solo captura, no impresión)',
  /_paraFoto/.test(zP) && /min-width:920px/.test(zP) && /opts && opts\.soloHTML/.test(zP));
const zS = ex('function _solicitudDocHTML(');
ok('la solicitud en captura fuerza min-width:820px', /paraCaptura \? ';min-width:820px' : ''/.test(zS));
const zR = ex('function _reciboDocHTML(');
ok('el recibo igual', /paraCaptura \? ';min-width:820px' : ''/.test(zR));

console.log('— 2. html2canvas con ancho explícito (no adivina del teléfono) —');
ok('la captura de la OC fija windowWidth 920', /windowWidth: 920/.test(ex('window.compartirOcImg = async function')));
ok('la de la solicitud fija 820', /windowWidth: 820/.test(ex('window.compartirSolicitudImg = async function')));
ok('la del recibo fija 820', /windowWidth: 820/.test(ex('window.compartirReciboImg = async function')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
