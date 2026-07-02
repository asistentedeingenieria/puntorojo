/* v876: sin botón "+" AGREGAR NIVEL en AVANCE FÍSICO (proyecto creado no crece por UI).
   openModalWithTower queda vivo para comandos de consola (patrón v829). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
ok('sin botón AGREGAR NIVEL', html.indexOf('title="AGREGAR NIVEL"') < 0);
ok('openModalWithTower vivo para consola', html.indexOf('function openModalWithTower') >= 0 || html.indexOf('openModalWithTower =') >= 0);
console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
