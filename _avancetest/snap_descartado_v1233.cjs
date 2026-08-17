/* v1233 (Antonio, 17-ago: "a compras se le tarda mucho en reflejarse lo que autoriza
   finanzas") — EL DESPERTADOR PERDIDO.

   La cadena del bug (evidencia: '[CloudSync] ignorando remote — hay escritura local
   pendiente' ×2 en la consola de Antonio):
   1. Susana trabaja en COMPRAS ⇒ su pestaña casi siempre tiene escritura pendiente
      (debounce de saveState) o subida en vuelo.
   2. Finanzas autoriza ⇒ el snapshot llega ⇒ applyRemote lo DESCARTA (v305-b) asumiendo
      que "Firestore lo reemitirá al terminar la subida"…
   3. …pero el eco de la PROPIA subida se filtra en el listener (hasPendingWrites, 9594)
      ⇒ NADIE reemite nada ⇒ la autorización queda invisible hasta que OTRO usuario mueva
      cualquier cosa o se recargue la página.

   FIX: el descarte deja bandera (_snapDescartado) y al CONFIRMAR la subida (los dos
   caminos: debounce y forceUploadNow) se relee la nube completa UNA vez y se aplica.
   Anti-bucle con _recuperandoSnap. NO toca merges ni forma canónica (sin APP_SYNC,
   criterio v1197: solo ciclo de vida). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— 1. el descarte deja BANDERA (ya no se pierde en silencio) —');
const iDesc = code.indexOf("ignorando remote");
const zDesc = code.slice(Math.max(0, iDesc - 400), iDesc + 400);
ok('la rama del descarte marca _snapDescartado antes del return', /_snapDescartado = true;[\s\S]{0,200}ignorando remote/.test(zDesc));

console.log('\n— 2. la recuperación: releer la nube al confirmar la subida —');
const zRec = ex(code, '_recuperarSnapDescartado(){');
ok('existe el método', !!zRec);
ok('solo actúa con la bandera puesta y sin re-entrar', /_snapDescartado \|\| this\._recuperandoSnap/.test(zRec));
ok('relee TODO de la nube y lo aplica (no confía en re-emisiones que no existen)', /downloadAll\(\)/.test(zRec) && /applyRemote\(d, \{ initial: false \}\)/.test(zRec));
ok('la bandera se limpia ANTES de la lectura (una recuperación por descarte)', /this\._snapDescartado = false;[\s\S]{0,120}downloadAll/.test(zRec));

console.log('\n— 3. enganchada en LOS DOS caminos de subida —');
ok('al confirmar la subida con debounce', (code.match(/_recuperarSnapDescartado\(\)/g) || []).length >= 3);
ok('en el camino del debounce (tras _chipDone)', /_chipDone\(\);[\s\S]{0,300}_recuperarSnapDescartado/.test(code));
ok('en forceUploadNow (la vía de las acciones de dinero)', /forceUploadNow[\s\S]{0,2200}_recuperarSnapDescartado/.test(code));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
