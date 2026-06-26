/* v843: cortar la tormenta de SINCRONIZANDO. La limpieza defensiva de filas de cobro vacías
   (ensureDataV9) encendía needsResync en CADA applyRemote → re-subía el core+proyecto pesado →
   saturaba la cola de Firestore (resource-exhausted) → la versión limpia no propagaba → bucle.
   Fix: re-subir A LO SUMO UNA VEZ por sesión (flag _cobroCleanupResynced). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0; const ok = (n, c) => c ? pass++ : (fail++, console.log('FAIL ' + n));

ok('existe el guard _cobroCleanupResynced', html.indexOf('_cobroCleanupResynced') >= 0);

// el needsResync de la limpieza de cobro queda gateado por el flag once-per-session
ok('needsResync de limpieza gateado por el flag',
  /if\s*\(\s*!this\._cobroCleanupResynced\s*\)\s*\{[\s\S]{0,200}needsResync\s*=\s*true[\s\S]{0,120}this\._cobroCleanupResynced\s*=\s*true/.test(html));

// en el bloque de la limpieza (tras contar las filas) el needsResync ya NO es incondicional
const idx = html.indexOf('afterRowCount = (merged.projects');
const seg = idx >= 0 ? html.slice(idx, idx + 700) : '';
ok('el bloque de limpieza referencia el guard', seg.indexOf('_cobroCleanupResynced') >= 0);
ok('sigue detectando el cambio de conteo de filas', /afterRowCount\s*!==\s*beforeRowCount/.test(seg));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
