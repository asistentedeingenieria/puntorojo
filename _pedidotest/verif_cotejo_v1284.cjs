/* v1284 (Antonio, 26-ago: "¿qué otra revisión de seguridad para saber que la OC salió
   de la app y NO fue manipulada?"): el QR YA es la prueba imposible de falsificar (lee
   la copia sellada en la nube, v1240) — pero la página de verificación no mostraba el
   NÚMERO ni el proveedor en grande, así que el cotejo contra el papel quedaba a medias
   (un QR de OTRA orden legítima pegado en una hoja alterada podía pasar desapercibido).
   FIX en verificar.html: BLOQUE DE COTEJO bajo el banner — número del documento en
   GRANDE, proveedor · proyecto · entrega, línea AUTORIZADA (fecha/hora + quién) y la
   instrucción explícita: cotejar número, proveedor y total contra el papel. */
const fs = require('fs'), path = require('path');
const v = fs.readFileSync(path.join(__dirname, '..', 'verificar.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const i = v.indexOf('bannerVivo');
const z = v.slice(i, i + 2600);
ok('el NÚMERO del documento va en GRANDE bajo el banner', /d\.numero/.test(z) && /font-size:2\d/.test(z));
ok('proveedor · proyecto · entrega a la vista', /d\.proveedor/.test(z) && /d\.proyecto/.test(z) && /d\.entrega/.test(z));
ok('línea AUTORIZADA con fecha/hora y quién', /AUTORIZAD/.test(z) && /d\.autorizadoFecha/.test(z));
/* v1219 exige NEUTRALIDAD (sin frases de sospecha) — la instrucción cotejar sin acusar */
ok('instrucción de cotejo explícita y NEUTRA', /COTEJÁ/.test(z) && /LO QUE VALE ES LO QUE VES AQUÍ/.test(z) && !/ALTERADO/.test(z));
ok('condicional: un payload viejo sin numero no pinta el bloque vacío', /d\.numero \?/.test(z));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
