/* v1253 (Antonio, 18-ago, dos pedidos):
   1. "Un filtro en las órdenes de compra: pendientes de autorización y autorizadas" —
      barra de ESTADO (mismo patrón que las subpestañas de serie v1204): TODOS LOS
      ESTADOS / PENDIENTES / AUTORIZADAS (+ DEVUELTAS solo si hay), con conteo, y
      auto-reset si el filtro quedó sin tarjetas. Sin status = AUTORIZADA (legacy).
   2. "El PDF de la toma saca la primera página EN BLANCO" — la regla v1075 (la tabla
      entera salta de hoja si no cabe) es correcta con la página ya ocupada, pero cuando
      lo único arriba es el encabezado el salto REGALA la página: si estamos arriba
      (lo libre ≈ toda la hoja útil) y la tabla igual no cabe, arranca acá y se parte. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— 1. filtro por ESTADO en órdenes —');
const zR = ex('function renderOrdenesList(');
ok('existe la barra de estado con las tres pestañas',
  /TODOS LOS ESTADOS/.test(zR) && /PENDIENTES DE AUTORIZACIÓN/.test(zR) && /AUTORIZADAS \(/.test(zR));
ok('DEVUELTAS aparece solo si hay', /DEVUELTAS \(/.test(zR) && /_estCounts\.DEV \?/.test(zR));
ok('sin status cuenta como AUTORIZADA (legacy)', /status \|\| 'AUTORIZADA'/.test(zR));
ok('el filtro se auto-resetea si quedó sin tarjetas', /_ocEstadoFiltro && !_estCounts\[window\._ocEstadoFiltro\]/.test(zR));
ok('existe el conmutador _ocEstadoSub', /window\._ocEstadoSub = function/.test(html));

console.log('— 2. el PDF de la toma no regala la primera página —');
const zS = ex('function _invSaltoTabla(');
let f = null;
try { f = new Function('return (' + zS + ')')(); } catch(e){}
if (f) {
  ok('tabla que no cabe en NINGUNA hoja: se parte (auto)', f(60, 8.5, 4, 758, 650) === 'auto');
  ok('ARRIBA de la página y no cabe en lo libre: arranca acá (auto) — la del bug', f(36, 8.5, 4, 758, 650) === 'auto');
  ok('a MEDIA página con espacio corto: salta entera (avoid, regla v1075 viva)', f(20, 8.5, 4, 758, 200) === 'avoid');
  ok('cabe en lo libre: no hay drama (avoid)', f(10, 8.5, 4, 758, 650) === 'avoid');
  ok('sin quinto argumento se comporta como antes (compat)', f(34, 8.5, 4, 758) === 'avoid' && f(60, 8.5, 4, 758) === 'auto');
} else ok('_invSaltoTabla evaluable', false);
ok('los 3 llamadores pasan el espacio RESTANTE', (html.match(/_invSaltoTabla\([^)]*getHeight\(\) - 2 \* M, doc\.internal\.pageSize\.getHeight\(\) - M - y\)/g) || []).length === 3);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
