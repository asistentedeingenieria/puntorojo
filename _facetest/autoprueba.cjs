/* TDD: _autoPruebaCaras (PURA) confirma que las tomas del enrolamiento son
   CONSISTENTES (misma persona) — distancia máxima entre pares por debajo del
   umbral. Si una toma capturó a otra persona / un cuadro basura, la distancia
   se dispara y la prueba falla → "repetí". Distancia euclidiana propia (sin face-api). */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/function _autoPruebaCaras\([\s\S]*?\n\}/);
if (!m) { console.log('NO _autoPruebaCaras FOUND'); process.exit(2); }
const fn = new Function(m[0] + '\nreturn _autoPruebaCaras;')();

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? pass++ : (fail++, console.log('FAIL ' + name));

// vectores chicos de juguete (la lógica es la misma con 128 dims)
const base = [0, 0, 0, 0];
const cerca1 = [0.1, 0.0, 0.1, 0.0];   // ~0.14 de base
const cerca2 = [0.0, 0.1, 0.0, 0.1];   // ~0.14 de base
const lejos  = [1, 1, 1, 1];           // ~2.0 de base (otra persona / basura)

ok('3 tomas consistentes => ok', (r => r.ok === true)(fn([base, cerca1, cerca2], 0.6)));
ok('una toma muy distinta => NO ok', (r => r.ok === false)(fn([base, cerca1, lejos], 0.6)));
ok('1 sola toma => ok (aceptable)', (r => r.ok === true)(fn([base], 0.6)));
ok('0 tomas => NO ok', (r => r.ok === false)(fn([], 0.6)));
ok('devuelve maxDist', (r => typeof r.maxDist === 'number' && r.maxDist > 1)(fn([base, lejos], 0.6)));
ok('acepta Float32Array-like (Array.from)', (r => r.ok === true)(fn([Float32Array.from(base), Float32Array.from(cerca1)], 0.6)));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
