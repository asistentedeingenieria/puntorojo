/* v1102 — EL CHEQUEO DE PÓLIZAS CUENTA QUINCENAS REALES, NO SÁBADOS SUELTOS (Antonio):
   "necesito que únicamente tomes en cuenta las fechas que toca planilla. NO todos los sábados.
   La última planilla fue el 1/08/2026 para que recalcules todas las fechas. La planilla es cada
   15 días. De lo que veo la del 11/07 NO aplica."

   CAUSA: _polizasChequeoPorPersona agrupaba por el SÁBADO EXACTO de cada planilla armada. Una
   planilla enviada en una semana corrida (11/07) se convertía en una "quincena" propia, y
   entonces a todo el mundo le figuraba una falta de cobro en una quincena que nunca existió.
   Con 7 quincenas listadas y varias personas en 4/7, el reporte estaba inflando las faltas.

   FIX: la clave de quincena se calcula contra la SERIE real (ancla 01/08/2026, cada 14 días).
   Cada planilla cae en el período que le corresponde: la del 11/07 se suma a la del 18/07 en
   vez de inventar una fecha. Función PURA y testeable; el ancla es un parámetro, no un número
   escondido en el medio del render. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const z = ex('function _quincenaKeyDe(');
ok('existe _quincenaKeyDe y es pura', z.length > 150 && !/state|saveState|document/.test(z));
let f = null;
try { f = new Function('return (' + z + ')')(); } catch(e){ console.log('   (no evaluable: '+e.message+')'); }

if (f) {
  console.log('\n— la serie real de Antonio (ancla 01/08/2026, cada 15 días) —');
  ok('01/08 es quincena', f('2026-08-01T12:00:00') === '01082026');
  ok('18/07 es quincena', f('2026-07-18T12:00:00') === '18072026');
  ok('06/06 es quincena (Antonio preguntó y SÍ aplica)', f('2026-06-06T12:00:00') === '06062026');
  ok('23/05 es quincena (también aplica)', f('2026-05-23T12:00:00') === '23052026');

  console.log('\n— EL CASO QUE REPORTÓ: el 11/07 no es quincena —');
  ok('una planilla del 11/07 cae en la quincena del 18/07, no crea una propia',
    f('2026-07-11T12:00:00') === '18072026');
  ok('y por lo tanto NO aparece como fecha 11072026', f('2026-07-11T12:00:00') !== '11072026');

  console.log('\n— dos planillas del mismo período se juntan —');
  ok('un envío el jueves anterior cae en la misma quincena',
    f('2026-07-30T12:00:00') === f('2026-08-01T12:00:00'));
  ok('un envío unos días después también', f('2026-08-04T12:00:00') === '01082026');
  ok('pero la quincena siguiente es OTRA', f('2026-08-15T12:00:00') === '15082026');

  console.log('\n— bordes —');
  ok('fecha inválida no revienta', f('cualquier cosa') === '' && f('') === '' && f(null) === '');
  ok('el ancla es parametrizable', f('2026-08-01T12:00:00', '2026-08-01T12:00:00') === '01082026');
}

console.log('\n— el chequeo lo usa —');
const zC = ex('function _polizasChequeoPorPersona(');
ok('_polizasChequeoPorPersona agrupa por quincena real', /_quincenaKeyDe\(/.test(zC));
ok('ya no agrupa por el sábado suelto de cada planilla', !/var qk = String\(sab\(ref\)/.test(zC));
ok('sigue ignorando las planillas rechazadas', /rechazada/.test(zC));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
