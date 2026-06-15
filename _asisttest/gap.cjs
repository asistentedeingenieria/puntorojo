/* TDD Bug 3: computeAsistenciaMark debe EXIGIR un mínimo de minutos entre entrada y salida
   (evita que un doble-escaneo accidental marque salida 2 min después). Param opcional minGapMin:
   si la salida cae antes del mínimo, devuelve accion:'ignorado' y NO toca el registro.
   Sin minGapMin (manual) → comportamiento de siempre. */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/function computeAsistenciaMark\([\s\S]*?\n\}/);
if (!m) { console.log('NO computeAsistenciaMark FOUND'); process.exit(2); }
const fn = new Function(m[0] + '\nreturn computeAsistenciaMark;')();

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? pass++ : (fail++, console.log('FAIL ' + name));

// sin entrada → entrada (sin importar gap)
ok('sin entrada => entrada', fn({}, '07:43', 15).accion === 'entrada');
// entrada + salida con >=15 min => salida
ok('gap 15 min => salida', fn({ entrada: '07:43' }, '07:58', 15).accion === 'salida');
ok('gap 17 min => salida', fn({ entrada: '07:43' }, '08:00', 15).accion === 'salida');
// entrada + salida a los 2 min, minGap 15 => IGNORADO (no marca salida) — EL BUG
{
  const r = fn({ entrada: '07:43' }, '07:45', 15);
  ok('gap 2 min con minGap 15 => ignorado', r.accion === 'ignorado');
  ok('gap 2 min => NO escribe salida', !r.reg.salida);
}
// sin minGap (manual) => salida como siempre (compat)
ok('sin minGap => salida (compat)', fn({ entrada: '07:43' }, '07:45').accion === 'salida');
ok('minGap 0 => salida (compat)', fn({ entrada: '07:43' }, '07:45', 0).accion === 'salida');

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
