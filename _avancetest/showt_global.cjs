/* v855: FIX CRÍTICO — showT global. Estaba SOLO local en algunos IIFEs; el módulo de pólizas lo
   llamaba sin tenerlo en scope → "ReferenceError: showT is not defined" reventaba reactivarPoliza
   (y otras). Debe existir un `function showT(` a nivel GLOBAL (columna 0) que reenvíe a showToast. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// Estructural: hay un showT a nivel global (al inicio de línea, no indentado dentro de un IIFE).
const idx = html.indexOf('\nfunction showT(');
ok('existe function showT global (columna 0)', idx >= 0);

// Funcional: el showT global reenvía a showToast.
if (idx >= 0) {
  let i = html.indexOf('{', idx), d = 0, end = -1;
  for (; i < html.length; i++){ if (html[i]==='{') d++; else if (html[i]==='}'){ d--; if (d===0){ end=i+1; break; } } }
  const src = html.slice(idx+1, end);
  let got = null;
  const showToast = (m, t) => { got = { m, t }; };
  const fn = new Function('showToast', src + '\nreturn showT;')(showToast);
  fn('HOLA', 'green');
  ok('showT reenvía el mensaje a showToast', got && got.m === 'HOLA');
  ok('showT reenvía el tipo a showToast', got && got.t === 'green');
  // sin tipo no rompe
  let got2 = null;
  const fn2 = new Function('showToast', src + '\nreturn showT;')((m,t)=>{got2={m,t};});
  fn2('SOLO MSG');
  ok('showT sin tipo no rompe', got2 && got2.m === 'SOLO MSG');
}

// El llamador que reventaba (reactivarPoliza) sigue presente y llama showT.
ok('reactivarPoliza llama showT', /reactivarPoliza[\s\S]{0,600}showT\(/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
