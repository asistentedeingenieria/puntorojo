/* v1197 — EL VIGILANTE DEL CANAL (Antonio, 12-ago: "nos sale diferente… cómo hacemos
   para que TODO esté siempre bien actualizado — esto NO puede estar pasando").

   EL HUECO: this.unsubscribe = db.collection('appState').onSnapshot(ok, err) se armaba
   UNA vez en init. Si el canal moría (red de obra, token vencido, error de Firestore),
   el err handler solo hacía console.error — la app quedaba SORDA para siempre: sus
   escrituras locales seguían (y hasta subían), pero no recibía NADA hasta recargar.
   Exactamente lo de hoy: Susana con su despacho local sin ver el proveedor autorizado,
   Rony con su pedido VDC-36 atrapado.

   EL FIX (solo ciclo de vida de la conexión — NO toca merges ni forma canónica,
   por eso NO sube APP_SYNC):
   1. _suscribir() extraída — init la llama y CUALQUIERA puede re-llamarla.
   2. Error del canal ⇒ re-suscripción con espera creciente (5s→60s tope), contada
      y con motivo en _syncDiag.
   3. Latido: cada snapshot sella _lastSnapTs (también los ecos propios — prueban que
      el canal vive). Un intervalo revisa: >5 min sin señal Y navigator.onLine ⇒
      re-suscribir. Con 50 usuarios activos el silencio real es raro; de noche un
      falso positivo solo cuesta una re-suscripción (idempotente y barata).
   4. Al VOLVER a la pestaña (visibilitychange→visible): si el último snapshot es
      viejo (>60s), re-suscribir de una — el caso "dejé la compu dormida". */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— la suscripción es re-armable —');
/* v1200 HOTFIX: db era LOCAL de init — _suscribir extraída murió con "db is not defined"
   y el init entero caía a "SIN SYNC DE NUBE" (¡sin sincronizar NADA!). La regla del
   andamiaje: la función extraída declara lo suyo. Esta aserción evalúa el cuerpo real. */
(function(){
  const i = code.indexOf('_suscribir(motivo){');
  const z = code.slice(i, i + 400);
  ok('_suscribir declara su PROPIO db (no hereda el local de init)', i > 0 && /const db = firebase\.firestore\(\)/.test(z));
})();
ok('_suscribir existe como método', /_suscribir\(\)\{/.test(code) || /_suscribir\(motivo\)\{/.test(code) || /_suscribir: function/.test(code) || /_suscribir\(motivo\)\s*\{/.test(code));
ok('antes de re-armar, corta la suscripción vieja (sin listeners dobles)', /this\.unsubscribe\(\)/.test(code));
ok('init pasa por _suscribir (no arma el onSnapshot a mano)', /this\._suscribir\(/.test(code));

console.log('\n— el error del canal ya no es un console.error y nada más —');
ok('el err handler programa la re-suscripción', /onSnapshot error[\s\S]{0,400}?_resuscribirConEspera|_resuscribirConEspera[\s\S]{0,400}?onSnapshot error/.test(code));
ok('espera creciente con tope (backoff)', /_resubEspera/.test(code) && /60000/.test(code));
ok('cada reconexión queda contada para _syncDiag', /_resubTotal/.test(code));

console.log('\n— el latido —');
ok('cada snapshot sella el último latido (antes del filtro de ecos)', /_lastSnapTs = Date\.now\(\)/.test(code));
ok('el intervalo revisa silencio anormal (5 min) y que haya red', /_lastSnapTs[\s\S]{0,300}?navigator\.onLine|navigator\.onLine[\s\S]{0,300}?_lastSnapTs/.test(code));

console.log('\n— volver a la pestaña reconecta —');
ok('visibilitychange→visible con snapshot viejo re-suscribe', /visibilitychange[\s\S]{0,600}?_suscribir|visibilitychange[\s\S]{0,600}?_resuscribirConEspera/.test(code));

console.log('\n— _syncDiag cuenta la historia —');
ok('el diagnóstico reporta la edad del último snapshot y las reconexiones', /_syncDiag[\s\S]{0,2000}?_lastSnapTs/.test(code) || /ultimoSnapshotHace/.test(code));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
