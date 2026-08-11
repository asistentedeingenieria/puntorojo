/* v1174 — "SYNC LENTO" NO ES UN FALLO FATAL, Y PINTARLO DE ROJO NOS COSTÓ UN DÍA ENTERO

   LA EVIDENCIA (11-ago, capturada gracias a que v1171 dejó de borrar el registro):
       window._syncUltimoError → { "code": "sin-codigo", "msg": "sync lento", "ver": 935 }

   LA CADENA COMPLETA, por fin:
     1. La subida se encola con payloads grandes (asistencia ~1 MB en formato Firestore, que
        envuelve cada campo en su tipo, + VICINIA con 858 KB).
     2. La cola del SDK se satura (resource-exhausted) y Firestore aplica su backoff máximo.
     3. La promesa de la escritura no confirma en 45 s.
     4. El guard v1139 salta —correctamente— libera el candado para que el equipo pueda seguir
        RECIBIENDO, y reporta el problema con `_chipError(new Error('sync lento'))`.
     5. Ese Error NO tiene `.code`, así que `_syncErrReintentable('')` da false y el chip se
        pinta ROJO: "ERROR DE SYNC".

   EL ERROR DE DISEÑO ES MÍO: "la subida va lenta" es la situación MÁS reintentable que existe
   —la escritura sigue encolada y se completa sola— y la app la mostraba como fallo fatal, igual
   que un rechazo de permisos. Ese rojo asustó a Antonio ("YA NO AGUANTO MÁS ESTO") y me mandó a
   perseguir tres causas equivocadas en un día: el candado de versión, la partición de gastos y
   la asistencia. Ninguna era. Era esto.

   EL ARREGLO: los avisos internos de lentitud (los dos guards de 45 s, el de la subida normal y
   el de forceUploadNow) se marcan como REINTENTABLES → el chip muestra "REINTENTANDO..." en
   ámbar y el backoff sigue su curso, que es exactamente lo que ya estaba pasando por debajo.
   El rojo queda para lo que de verdad requiere intervención: permisos, datos rechazados.

   REGLA: un estado de error tiene que distinguir "esto se arregla solo" de "esto necesita a
   alguien". Si todo se ve igual de grave, nada se ve grave — y se persiguen fantasmas. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— qué se reintenta solo y qué necesita a una persona —');
const src = ex(code, 'function _syncErrReintentable(');
ok('existe _syncErrReintentable', !!src);
if (src) {
  const f = new Function(src + '\nreturn _syncErrReintentable;')();

  /* EL CASO DEL 11-ago, textual: el guard reporta new Error('sync lento'), sin .code */
  ok('LA LENTITUD ES REINTENTABLE (el caso real de hoy)', f('sync-lento') === true || f('sync lento') === true);

  console.log('\n— lo que ya se reintentaba sigue igual —');
  ok('resource-exhausted', f('resource-exhausted') === true);
  ok('unavailable', f('unavailable') === true);
  ok('deadline-exceeded', f('deadline-exceeded') === true);
  ok('aborted / cancelled / unknown / internal',
    f('aborted') && f('cancelled') && f('unknown') && f('internal'));

  console.log('\n— lo que SÍ tiene que gritar en rojo (no se afloja el criterio) —');
  ok('permission-denied sigue siendo FATAL', f('permission-denied') === false);
  ok('invalid-argument sigue siendo FATAL', f('invalid-argument') === false);
  ok('not-found sigue siendo FATAL', f('not-found') === false);
  ok('un código desconocido cualquiera sigue siendo FATAL', f('vaya-a-saber') === false);
  ok('vacío/null siguen siendo FATAL (no se vuelve permisivo por descuido)',
    f('') === false && f(null) === false && f(undefined) === false);
}

console.log('\n— los dos guards de 45s marcan su error como lentitud —');
const sch = ex(code, 'scheduleSave(){');
const fun = ex(code, 'async forceUploadNow(){');
/* los guards ya no arman el Error a mano: usan _errLento(), que le pone el código */
ok('el guard de la subida normal etiqueta la lentitud', /_errLento\(\)/.test(sch));
ok('el guard de forceUploadNow también', /_errLento\(\)/.test(fun));
/* El texto solo puede aparecer UNA vez: dentro de _errLento, que es la fábrica que le pone el
   código. Si vuelve a aparecer suelto, alguien armó otro Error pelado y el rojo vuelve. */
ok('el Error de lentitud se arma en UN solo lugar (la fábrica)',
  (code.match(/new Error\('sync lento'\)/g) || []).length === 1 && /function _errLento\(\)/.test(code));
/* Lo que hacía que cayera en la rama fatal: el Error no llevaba .code */
ok('el error de lentitud ahora LLEVA código', /code: *'sync-lento'|code: *"sync-lento"|_errLento/.test(code));

console.log('\n— el chip sigue distinguiendo los dos mundos —');
const chip = ex(code, '_chipError(e){');
ok('reintentable → REINTENTANDO, no rojo', /REINTENTANDO/.test(chip));
ok('fatal → rojo', /setSyncStatus\('error'\)/.test(chip));
ok('el motivo se guarda igual para diagnosticar', /_syncUltimoError/.test(chip));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
