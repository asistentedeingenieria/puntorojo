/* v852: el PIN numérico mínimo sube de 6 a 8 dígitos en CREACIÓN y CAMBIO de clave (no en login;
   los PINs viejos de 6 siguen entrando). validatePasswordStrength (cambio) exige numlen>=8; el alta
   usa /^[0-9]{8,}$/. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractAt(startIdx){ let i=html.indexOf('{',startIdx),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(startIdx,i+1); } } return ''; }
function extractFn(name){ const m=html.indexOf('function '+name+'('); return m<0?'':extractAt(m); }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// Funcional: validatePasswordStrength (rama numérica) exige 8.
const src = extractFn('validatePasswordStrength');
ok('validatePasswordStrength existe', !!src);
if (src) {
  const fn = new Function('_isUserAccountEmail', src + '\nreturn validatePasswordStrength;')(function(){ return true; });
  const r6 = fn('123456', 'u@u.puntorojo.app');
  const r8 = fn('12345678', 'u@u.puntorojo.app');
  ok('PIN de 6 dígitos YA NO es válido', r6.ok === false);
  ok('PIN de 8 dígitos es válido', r8.ok === true);
  ok('rama numérica activa', r6.numeric === true);
  const numlen6 = (r6.checks || []).find(function(c){ return c.key === 'numlen'; });
  ok('numlen falla con 6 dígitos', !!numlen6 && numlen6.ok === false);
  ok('label de numlen dice 8 dígitos', !!numlen6 && /8\s*d[ií]gitos/i.test(numlen6.label));
  const r8rep = fn('88888888', 'u@u.puntorojo.app');
  ok('8 dígitos repetidos sigue fallando (notrep)', r8rep.ok === false);
}

// Estructural: alta usa {8,} + mensaje; ya no queda el {6,} del PIN.
ok('alta usa /^[0-9]{8,}$/', html.indexOf('/^[0-9]{8,}$/') >= 0);
ok('mensaje de alta dice MÍNIMO 8 DÍGITOS', html.indexOf('MÍNIMO 8 DÍGITOS') >= 0);
ok('ya no queda /^[0-9]{6,}$/ (PIN)', html.indexOf('/^[0-9]{6,}$/') < 0);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
