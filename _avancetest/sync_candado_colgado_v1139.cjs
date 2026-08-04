/* v1139 — LA SUBIDA COLGADA DEJA AL DISPOSITIVO CIEGO (causa raíz de los pedidos que no llegan)

   Antonio, 4-ago: "este pedido NO me sale en la app" (VLA-13 de Rony) y, en la misma tarde,
   DOS pedidos distintos con el número VLA-11 — el de Rony en papel y el de Susana en la app.

   NO son dos problemas: son el mismo. El número de pedido se calcula tomando el primer número
   libre que ESE dispositivo ve (nextPedidoCode). Si un teléfono no logra sincronizar, no ve los
   pedidos de los demás y reparte un número ya usado, con total honestidad.

   ¿Y por qué deja de sincronizar? Cuando el canal de escritura de Firestore se satura —lo que
   pasa hoy por el documento de asistencia de 770 KB— el SDK ENCOLA la escritura y la promesa
   NUNCA resuelve ni falla. Entonces:

       this.uploadingNow = true;
       this.uploadCurrent().then(...).catch(...)   ← ninguno de los dos corre nunca

   y el candado queda puesto para siempre. Ese mismo candado es el que hace que applyRemote
   descarte todo lo que llega (línea ~9916). Resultado: el teléfono sube a ciegas, no recibe
   nada, y reparte correlativos repetidos. Se confirmó en vivo en el navegador de Antonio:
   `uploadingNow: true` con `pendingWrite: null` y sin backoff activo.

   EL ARREGLO tiene que estar en el CÓDIGO, no en el teléfono de nadie (pedido explícito de
   Antonio: no puede tocar el celular de Rony). Un guard de tiempo: si la subida no confirma en
   45 segundos, se libera el candado y se reintenta. La escritura sigue encolada en el SDK y se
   confirmará cuando pueda — lo que se recupera es la capacidad de RECIBIR.

   POR QUÉ ES SEGURO liberar: el guard de v305-b existía porque applyRemote pisaba cambios
   locales, pero desde v972 los contenedores que importan (pedidos, órdenes, asistencia, cobro)
   se UNEN por id en vez de pisarse. Aun así se marca needsResync al liberar, para que lo local
   se vuelva a subir después de aplicar lo remoto. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— el candado se libera solo —');
ok('existe el guard de subida colgada', /_UPLOAD_GUARD_MS|_guardSubida/.test(code));
const _ms = Number((code.match(/_UPLOAD_GUARD_MS:\s*(\d+)/) || [])[1] || 0);
ok('el guard es de decenas de segundos, no de horas', _ms >= 20000 && _ms <= 120000);
ok('libera uploadingNow al vencer', /_UPLOAD_GUARD_MS[\s\S]{0,600}uploadingNow = false/.test(code));
ok('y reintenta la subida', /_UPLOAD_GUARD_MS[\s\S]{0,700}(scheduleSave|forceUploadNow)/.test(code));
ok('marca que hay que re-subir lo local',
  /uploadingNow = false;[\s\S]{0,120}asistNeedsResync = true/.test(code));
ok('deja rastro en consola para diagnosticar', /_UPLOAD_GUARD_MS[\s\S]{0,700}console\.warn/.test(code));

console.log('\n— el camino normal no cambia —');
ok('al confirmar la subida se cancela el guard', /clearTimeout\(_guard|clearTimeout\(this\._uploadGuard/.test(code));
ok('el catch sigue existiendo', /uploadingNow = false; console\.error\('CloudSync auto-save error/.test(code));
ok('el chip de estado sigue funcionando', /_chipDone\(\)/.test(code));

console.log('\n— la asistencia tiene el mismo guard —');
/* uploadAsistencia usa su propio flag y se cuelga por la misma razón: es JUSTO la escritura
   pesada que satura el canal */
ok('_asistUploading también se libera', /_asistUploading = false[\s\S]{0,400}_UPLOAD_GUARD_MS|_UPLOAD_GUARD_MS[\s\S]{0,600}_asistUploading = false/.test(code));

console.log('\n— el correlativo —');
ok('nextPedidoCode sigue derivando del primer número libre', /_primerNumeroLibre\(usados\)/.test(code));

/* PENDIENTE, deliberadamente fuera de esta versión (no son aserciones, son deuda anotada):
   (a) avisar al generar un pedido cuando la sincronización está caída — con el candado que se
       libera solo, el caso se vuelve raro, pero no imposible (un teléfono sin señal por horas);
   (b) marcar en la lista los pedidos que comparten número, para ver las colisiones que YA
       existen (VLA-11 de Rony y VLA-11 de Susana conviven hoy en los datos).
   Ninguna de las dos evita el problema —eso lo hace el guard de arriba—; son para verlo. */

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
