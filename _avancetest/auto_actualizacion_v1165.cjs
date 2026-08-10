/* v1165 — LA APP SE ACTUALIZA SOLA (el kill-switch dejaba a la flota esperando un click)

   Antonio (10-ago, enojado y con razón): "me está saliendo error en sincronización.
   NECESITO YA QUE ESO NO VUELVA A PASAR... SOMOS 50 EMPLEADOS QUE LA USAMOS."

   LA CAUSA DE FONDO (no un bug puntual — un problema de DISEÑO): el candado v892 protege
   la nube bloqueando a los clientes viejos, pero deja al usuario mirando un overlay con un
   botón "ACTUALIZAR AHORA". Con 50 personas, cada `minSyncVersion` nuevo = 50 dispositivos
   parados hasta que alguien les avisa que recarguen. Y si el service worker sirve el HTML
   de su caché, el reload devuelve la MISMA versión vieja: bucle (lo del 8-jul).

   EL ARREGLO — actualización automática y verificable:
   · _autoActualizar(): le pide al SW que active la versión en espera (SKIP_WAITING), BORRA
     las cachés de la app (menos la de fotos, v993) y recarga con cache-bust.
   · Guard ANTI-BUCLE en sessionStorage: si ya se intentó hace menos de 90 s, NO recarga de
     nuevo — muestra el overlay manual. Sin esto, un despliegue a medias haría girar a la
     flota en un bucle de recargas (la lección del 8-jul).
   · _mostrarBloqueoVersion intenta la auto-actualización ANTES de mostrar nada; el overlay
     queda como último recurso, ya con instrucciones reales.
   · El aviso de "versión nueva disponible" (sin bloqueo) también se auto-aplica cuando la
     app está ociosa — así la flota va al día ANTES de que el mínimo suba. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— la actualización automática —');
const zA = ex(code, 'function _autoActualizar(');
ok('existe _autoActualizar', !!zA);
ok('activa el SW en espera (SKIP_WAITING)', /SKIP_WAITING/.test(zA));
ok('borra las cachés de la app', /caches\.keys\(\)/.test(zA) && /caches\.delete/.test(zA));
ok('CONSERVA la caché de fotos (v993: si no, la flota re-descarga todo)', /fotos/i.test(zA));
ok('recarga con cache-bust (no sirve el HTML viejo)', /location\.replace|location\.reload\(true\)|\?v=|_v=/.test(zA));

console.log('\n— el guard anti-bucle (la lección del 8-jul) —');
ok('marca el intento en sessionStorage', /sessionStorage/.test(zA));
ok('no reintenta si ya lo hizo hace poco', /90|_VENTANA|ventana/i.test(zA));
ok('devuelve false cuando NO reintenta (para que el overlay aparezca)', /return false/.test(zA));

console.log('\n— el bloqueo de versión ahora se auto-resuelve —');
const zB = ex(code, 'function _mostrarBloqueoVersion(');
ok('intenta la auto-actualización ANTES de mostrar el overlay',
  /_autoActualizar\(/.test(zB) && zB.indexOf('_autoActualizar') < zB.indexOf('verBloqueoOverlay') + 400);
ok('si la auto-actualización arrancó, no pinta el overlay', /return;/.test(zB));
ok('el overlay queda de último recurso con instrucción real', /ACTUALIZAR AHORA/.test(zB) && /_autoActualizar\(true\)|forzar/.test(zB));

console.log('\n— la flota se mantiene al día sola —');
/* la auto-actualización ociosa YA existe desde v437 (_tryAutoUpdateWhenIdle): no se
   duplica. Lo que faltaba era FORZARLA cuando el candado bloquea, sin esperar a que el
   usuario quede ocioso ni a que vuelva al foreground — esa ventana muerta es la que dejaba
   a la flota parada mirando el overlay. */
ok('el auto-update ocioso de v437 sigue intacto', /_tryAutoUpdateWhenIdle/.test(code) && /_isUserBusyForUpdate/.test(code));
ok('el bloqueo NO espera a que el usuario esté ocioso', /_autoActualizar/.test(ex(code, 'function _mostrarBloqueoVersion(')));

console.log('\n— el diagnóstico deja de ser a ciegas —');
ok('el chip de error guarda el MOTIVO del último fallo de sync', /_syncUltimoError/.test(code));
ok('y hay un comando para verlo (window)', /window\._syncDiag/.test(code));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
