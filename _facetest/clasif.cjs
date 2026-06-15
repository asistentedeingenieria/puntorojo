/* TDD del #3: _clasificarCaras (PURA) reparte el personal en 3 grupos para el
   reporte "quién no tiene cara": conCara / recuperables (no tiene pero hay
   respaldo en faceBackups) / sinRespaldo (no tiene y no hay respaldo → enrolar). */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/function _clasificarCaras\([\s\S]*?\n\}/);
if (!m) { console.log('NO _clasificarCaras FOUND'); process.exit(2); }
const fn = new Function(m[0] + '\nreturn _clasificarCaras;')();

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? pass++ : (fail++, console.log('FAIL ' + name));

const personal = [
  { id: 'a', nombre: 'Ana',  face: { descriptors: [{ d: [1] }] } }, // con cara
  { id: 'b', nombre: 'Beto', face: { descriptors: [] } },           // cara vacía → SIN cara
  { id: 'c', nombre: 'Caro' },                                      // sin cara
  { id: 'd', nombre: 'Dani' },                                      // sin cara
];

const r = fn(personal, new Set(['b', 'c'])); // b y c tienen respaldo; d no
ok('con cara: solo Ana', r.conCara.length === 1 && r.conCara[0].id === 'a');
ok('recuperables: Beto + Caro', r.recuperables.length === 2 && r.recuperables.map(x => x.id).sort().join() === 'b,c');
ok('sin respaldo: solo Dani', r.sinRespaldo.length === 1 && r.sinRespaldo[0].id === 'd');
ok('nombre en MAYUSCULA', r.recuperables[0].nombre === r.recuperables[0].nombre.toUpperCase());

const r2 = fn(personal, ['b', 'c']); // acepta array además de Set
ok('backupIds como array tambien', r2.recuperables.length === 2);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
