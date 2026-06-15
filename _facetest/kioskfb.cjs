/* TDD del #2: el kiosko nunca se queda mudo. _kioskFeedbackMsg es PURA y decide
   qué cartel mostrar en cada tick. NO confirma a mano (regla del usuario):
   - reconociendo a alguien (auto) / marca recién hecha / pidiendo obra / sin geo → no toca el cartel (null)
   - no ve ninguna cara → "Acercate y mirá a la cámara"
   - ve una cara pero no la reconoce → "No te reconozco…"  (sin nombre, sin botón) */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/function _kioskFeedbackMsg\([\s\S]*?\n\}/);
if (!m) { console.log('NO _kioskFeedbackMsg FOUND'); process.exit(2); }
const fn = new Function(m[0] + '\nreturn _kioskFeedbackMsg;')();

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? pass++ : (fail++, console.log('FAIL ' + name));
const base = { caras: 1, algunAuto: false, hayGeo: true, pidiendoObra: false, holdActivo: false };

ok('sin caras => acercate', (r => r && /Acercate/.test(r.txt))(fn(Object.assign({}, base, { caras: 0 }))));
ok('cara sin match => no te reconozco', (r => r && /no te reconozco/i.test(r.txt))(fn(base)));
ok('reconociendo (auto) => null', fn(Object.assign({}, base, { algunAuto: true })) === null);
ok('marca recien hecha (hold) => null', fn(Object.assign({}, base, { holdActivo: true })) === null);
ok('pidiendo obra => null', fn(Object.assign({}, base, { pidiendoObra: true })) === null);
ok('sin geo => null (lo maneja la barra de ubicacion)', fn(Object.assign({}, base, { hayGeo: false })) === null);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
