/* v1245 (Antonio, 17-ago): "que el proveedor pueda apachar mucho tiempo sobre el QR de la
   foto y lo redirija". El long-press sobre una FOTO lo decide la app que la muestra (iPhone
   Fotos a veces; WhatsApp Android no) — ningún diseño de QR lo fuerza. Lo que SÍ:
   1. El ENLACE de verificación viaja como TEXTO del mensaje al compartir — en WhatsApp
      llega como link azul bajo la foto: un solo toque y va a la página.
   2. QR más grande en la hoja (76→96px): mejor detección en long-press y escaneo. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— 1. el enlace viaja con la foto —');
const zOc = ex('window.compartirOcImg = async function');
ok('la OC compartida lleva el enlace de verificación en el texto', /VERIFICAR EN VIVO: /.test(zOc) && /_ocQrTexto\(oc\)/.test(zOc));
ok('el nombre del ARCHIVO no lleva el enlace (solo el texto del mensaje)', /desc\.replace\(/.test(zOc));
const zSol = ex('window.compartirSolicitudImg = async function');
ok('el pedido compartido igual', /VERIFICAR EN VIVO: /.test(zSol) && /_pedQrTexto\(pd, p\)/.test(zSol));

console.log('— 2. QR más grande en las hojas —');
ok('las dos hojas pintan el QR a 96px', (html.match(/width:96px;height:96px;display:block/g) || []).length >= 2 && !/width:76px;height:76px/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
