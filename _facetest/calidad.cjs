/* TDD: _evalCalidadFoto (PURA) decide si un cuadro del enrolamiento en vivo está
   bien y, si no, qué mejorar. Recibe medidas ya calculadas + el ángulo pedido.
   m = { score, faceFrac, dx, dy, brillo, yaw, roll }
   anguloPedido = 'frente' | 'lado1' | 'lado2' ; ladoPrevioDir = signo del lado1 (para que lado2 sea opuesto) */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/function _evalCalidadFoto\([\s\S]*?\n\}/);
if (!m) { console.log('NO _evalCalidadFoto FOUND'); process.exit(2); }
const fn = new Function(m[0] + '\nreturn _evalCalidadFoto;')();

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? pass++ : (fail++, console.log('FAIL ' + name));
const tiene = (r, txt) => r.motivos.some(x => x.toUpperCase().includes(txt));

const bueno = { score: 0.9, faceFrac: 0.4, dx: 0.05, dy: 0.05, brillo: 130, yaw: 0.02, roll: 3 };

ok('frontal bueno => ok', (r => r.ok && r.motivos.length === 0)(fn(bueno, 'frente', null)));
ok('oscuro => MAS LUZ', (r => !r.ok && tiene(r, 'LUZ'))(fn(Object.assign({}, bueno, { brillo: 40 }), 'frente', null)));
ok('demasiada luz => aviso', (r => !r.ok && tiene(r, 'LUZ'))(fn(Object.assign({}, bueno, { brillo: 230 }), 'frente', null)));
ok('lejos => ACERCATE', (r => !r.ok && tiene(r, 'ACERCATE'))(fn(Object.assign({}, bueno, { faceFrac: 0.10 }), 'frente', null)));
ok('cerca => ALEJATE', (r => !r.ok && tiene(r, 'ALEJATE'))(fn(Object.assign({}, bueno, { faceFrac: 0.85 }), 'frente', null)));
ok('descentrado => CENTRA', (r => !r.ok && tiene(r, 'CENTR'))(fn(Object.assign({}, bueno, { dx: 0.32 }), 'frente', null)));
ok('borrosa (score bajo) => POCO CLARA', (r => !r.ok && tiene(r, 'CLAR'))(fn(Object.assign({}, bueno, { score: 0.4 }), 'frente', null)));
ok('inclinada => ENDEREZA', (r => !r.ok && tiene(r, 'ENDEREZ'))(fn(Object.assign({}, bueno, { roll: 25 }), 'frente', null)));
ok('frente pero girado => MIRA DE FRENTE', (r => !r.ok && tiene(r, 'FRENTE'))(fn(Object.assign({}, bueno, { yaw: 0.3 }), 'frente', null)));
ok('lado1 pero de frente => GIRA', (r => !r.ok && tiene(r, 'GIR'))(fn(bueno, 'lado1', null)));
ok('lado1 girado => ok + yawDir', (r => r.ok && r.yawDir === 1)(fn(Object.assign({}, bueno, { yaw: 0.25 }), 'lado1', null)));
ok('lado2 mismo lado => AL OTRO LADO', (r => !r.ok && tiene(r, 'OTRO LADO'))(fn(Object.assign({}, bueno, { yaw: 0.25 }), 'lado2', 1)));
ok('lado2 opuesto => ok', (r => r.ok)(fn(Object.assign({}, bueno, { yaw: -0.25 }), 'lado2', 1)));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
