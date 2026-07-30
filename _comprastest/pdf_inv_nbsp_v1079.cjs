/* v1079 — PDF de inventario: nada se parte en dos líneas + compras puede bajar/compartir.
   Antonio (30-jul, con foto del PDF de EF2):
   1. "quiero que la Q esté siempre al lado del número" — en la tabla del consolidado la
      columna VALOR quebraba: "Q" arriba y "3,270.60" abajo.
   2. "torre 3 y torre 4 quiero que se escriba al lado el número" — el encabezado partía
      "TORRE" / "3" en dos renglones.
      Los dos son el mismo problema: el espacio normal es un punto de quiebre. Se usa
      ESPACIO DURO ( ), que nunca se parte, en vez de ensanchar columnas a ciegas.
   3. "la persona de compras quiero que pueda descargar pdf y compartir pdf" — los botones
      se gateaban con receta.verPrecios y ella no lo tiene. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
const NB = ' ';

console.log('\n— 1. la Q nunca se separa de su número —');
const z = ex('function _invReporteDoc(');
ok('el dinero del PDF usa espacio duro', z.indexOf("'Q" + NB + "'") > -1);
ok('y ya no el espacio normal que se quiebra', !/return 'Q ' \+ \(Number\(n\)/.test(z));
let money = null;
try {
  const iM = z.indexOf('var money = function(n){');
  const src = z.slice(iM + 'var money = '.length, z.indexOf('};', iM) + 1);
  money = new Function('return (' + src + ')')();
} catch(e){}
ok('formatea con la Q pegada', !!money && money(3270.6).indexOf('Q' + NB) === 0 && /3,270\.60/.test(money(3270.6)));

console.log('\n— 2. los encabezados de columna no se parten —');
const zH = ex('function _invEncCorto(');
let h = null;
try { h = new Function('return (' + zH + ')')(); } catch(e){}
ok('existe el normalizador de encabezados', !!h && zH.length > 60);
if (h) {
  ok('TORRE 3 queda en una sola línea', h('TORRE 3') === 'TORRE' + NB + '3');
  ok('NIVEL 10 también', h('NIVEL 10') === 'NIVEL' + NB + '10');
  ok('lo de una sola palabra no cambia', h('BODEGA') === 'BODEGA');
  ok('no revienta con vacío', h(null) === '' && h('') === '');
}
ok('el consolidado lo usa en sus columnas', /_invEncCorto\(c\.nombre\)/.test(z));
ok('la tabla de torre lo usa en sus niveles', /_invEncCorto\(nk\)/.test(z));
ok('y el nombre de la torre en su encabezado', /_invEncCorto\(T\.nombre\)/.test(z));

console.log('\n— 3. compras puede descargar y compartir el PDF —');
/* anclado al botón REAL del historial de inventario (hay muchos "DESCARGAR PDF" en la app) */
const iB = html.indexOf('_invReporteDescargar(\\\'');
const zB = iB > -1 ? html.slice(iB - 900, iB + 400) : '';
ok('el gate incluye a compras', /compras\.autorizar/.test(zB) && /materiales\.bodega/.test(zB));
ok('sin perder a quien ya lo tenía', /receta\.verPrecios/.test(zB) && /users\.manage/.test(zB));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
