/* v1243 (Antonio, 17-ago, con el escaneo de VLA-29 funcionando):
   1. "LAS FIRMAS NUNCA TENGAN FONDO — que parezca que se firmó en el documento":
      el payload pasa las firmas por _firmaTintaSrc (tinta binarizada v1160, fondo
      transparente si está en caché) y verificar.html además pinta el <img> con
      mix-blend-mode:multiply — el blanco del JPEG desaparece sobre la tarjeta blanca.
   2. El mensaje verde nombra el TIPO: "PEDIDO DE MATERIALES · LEÍDO EN VIVO EN LA NUBE",
      "ORDEN DE COMPRA · LEÍDA...", "ORDEN DE DESPACHO · LEÍDA...", etc. — sin la
      coletilla "ES FALSA" (decisión de Antonio: que SOLO diga eso).
   3. Listados largos: se muestran los primeros renglones y un botón VER DETALLE
      despliega el resto ("a veces es mucho lo que se pide"). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const vh = fs.readFileSync(path.join(__dirname, '..', 'verificar.html'), 'utf8');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— 1. firmas SIN FONDO —');
const zPay = ex(html, 'function _ocVerifPayload(');
ok('las firmas de la ORDEN viajan como TINTA (v1160)', /_firmaTintaSrc\(/.test(zPay));
const zPed = ex(html, 'function _pedVerifPayload(');
ok('la del solicitante del PEDIDO también', /_firmaTintaSrc\(/.test(zPed));
ok('verificar.html funde el blanco con la tarjeta (multiply)', /mix-blend-mode:multiply/.test(vh));

console.log('— 2. el mensaje verde nombra el documento —');
ok('el payload de la orden lleva su TIPO (OC/despacho/pre-pago/trasiego/producción)',
  /tipo:/.test(zPay) && /TRASIEGO DE MATERIAL/.test(zPay) && /DESPACHO PRE-PAGO/.test(zPay) && /ORDEN DE DESPACHO/.test(zPay) && /ORDEN DE PRODUCCIÓN/.test(zPay) && /ORDEN DE COMPRA/.test(zPay));
ok('el pedido dice PEDIDO DE MATERIALES', /PEDIDO DE MATERIALES/.test(zPed));
ok('verificar.html arma "LEÍDA/LEÍDO EN VIVO EN LA NUBE" según el género',
  /LEÍDA/.test(vh) && /LEÍDO/.test(vh) && /EN VIVO EN LA NUBE/.test(vh));
ok('ya no está la coletilla ES FALSA', !/ES FALSA/.test(vh));

console.log('— 3. listados largos con VER DETALLE —');
ok('los renglones de más quedan ocultos y un botón los despliega',
  /VER DETALLE/.test(vh) && /_verMas|xtra/.test(vh));
ok('el nombre largo siempre quiebra (no se corta)', /overflow-wrap:anywhere|word-break/.test(vh));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
