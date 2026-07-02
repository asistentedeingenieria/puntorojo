/* v877: (1) sin botones ELIMINAR TORRE/NIVEL/APTO en AVANCE FÍSICO (las funciones delete* quedan
   vivas para consola, patrón v829/v876); (2) LOGIN sin imágenes de fondo — mismo diseño CSS del
   splash (gradiente oscuro + glows prGlowA/prGlowB). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// 1) eliminar torre/nivel/apto fuera de la UI
ok('sin botón ELIMINAR TORRE', html.indexOf('title="ELIMINAR TORRE"') < 0);
ok('sin botón ELIMINAR NIVEL', html.indexOf('title="ELIMINAR NIVEL"') < 0);
ok('sin botón ELIMINAR APTO', html.indexOf('title="ELIMINAR APTO"') < 0);
ok('deleteTower/Level/Apto viven para consola', html.indexOf('function deleteTower(') >= 0 && html.indexOf('function deleteLevel(') >= 0 && html.indexOf('function deleteApto(') >= 0);

// 2) login sin imágenes
const _auth = html.slice(html.indexOf('class="auth-bg-rotating"'), html.indexOf('class="auth-box"'));
ok('login SIN slides de imágenes', _auth.indexOf('assets/bg-') < 0 && _auth.indexOf('bg-slide') < 0);
ok('login con gradiente CSS', /\.auth-bg-rotating\{[^}]*linear-gradient/.test(html));
ok('login con glows del splash', /\.auth-bg-rotating::before\{[^}]*prGlowA/.test(html) && /\.auth-bg-rotating::after\{[^}]*prGlowB/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
