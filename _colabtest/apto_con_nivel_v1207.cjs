/* v1207 — EL APTO SE LEE CON SU NIVEL (Antonio, 14-ago: "que diga 6D por ejemplo si es
   el nivel 6 el apto D"). En TORELO los aptos se llaman solo por letra (A/B/C/D/E
   MONTAÑAS…) y el nivel vive aparte en levelName — las filas de la liquidación mostraban
   "TORRE ÚNICA - C - ETAPA 1" sin decir de qué nivel.

   _aptoNivelTag(pg) PURA: dígitos del levelName + aptoName pegados si el apto es letra
   sola ("6D"); nombre largo va con espacio ("14 E VOLCANES"); sin levelName queda igual. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const z = ex(code, 'function _aptoNivelTag(');
ok('existe (pura)', !!z);
try {
  const f = new Function('return (' + z + ')')();
  ok('letra sola se pega: NIVEL 6 + D → 6D', f({ levelName: 'NIVEL 6', aptoName: 'D' }) === '6D');
  ok('nombre largo con espacio: NIVEL 14 + E VOLCANES → 14 E VOLCANES', f({ levelName: 'NIVEL 14', aptoName: 'E VOLCANES' }) === '14 E VOLCANES');
  ok('sin levelName queda el apto tal cual', f({ aptoName: 'C' }) === 'C');
  ok('sin apto no inventa nada', f({ levelName: 'NIVEL 6' }) === '');
} catch(e){ ok('evalúa aislada', false); }

console.log('— los renglones de liquidación lo usan —');
ok('las filas de LIQUIDACIÓN GENERADA (las dos variantes)', (code.match(/_aptoNivelTag\(pg\)/g) || []).length >= 3);
ok('la vista de pagos por grupo también', /h\(_aptoNivelTag\(pg\) \|\| pg\.tipo\)/.test(code) || /_aptoNivelTag\(pg\)\s*\|\|\s*pg\.tipo/.test(code));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
