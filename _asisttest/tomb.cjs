/* Tombstones de ausencia en _mergeAsistencia (v666). Extrae la función REAL de index.html.
   El tombstone guarda el _ts EXACTO de la ausencia que se quitó y borra SOLO si coincide (===):
   - Propiedad de seguridad: borra SOLO ausencias, NUNCA un presente real.
   - Independiente del reloj: una ausencia re-marcada (otro _ts) es inmune, aunque su _ts sea MENOR. */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/function _mergeAsistencia\([\s\S]*?\n\}/);
if (!m) { console.log('NO _mergeAsistencia FOUND'); process.exit(2); }
const _mergeAsistencia = new Function(m[0] + '\nreturn _mergeAsistencia;')();

let pass = 0, fail = 0;
function ok(name, cond){ if (cond) pass++; else { fail++; console.log('FAIL ' + name); } }

const F = '2026-06-14', P = 'p1', K = F + '|' + P;
const AUS = { presente:false, motivo:'ENFERMEDAD', motivoTipo:'ENFERMEDAD', via:'manual', _ts:1000, ausenteTs:1000 };
const PRES = { presente:true, entrada:'07:30', _ts:1000 };

// 1) Quitar ausencia SE PROPAGA: tomb con el _ts EXACTO de la ausencia la borra
{
  const r = _mergeAsistencia({}, { [F]: { [P]: AUS } }, { [K]: 1000 });
  ok('quitar ausencia se propaga (borrada)', !(r.asistencia[F] && r.asistencia[F][P]));
  ok('quitar ausencia: changed=true', r.changed === true);
}

// 2) SEGURIDAD: un PRESENTE nunca se borra, aunque el tomb coincida en ts
{
  const r = _mergeAsistencia({}, { [F]: { [P]: PRES } }, { [K]: 1000 });
  ok('presente NUNCA se borra (seguridad)', !!(r.asistencia[F] && r.asistencia[F][P] && r.asistencia[F][P].presente === true));
}

// 3) Ausencia RE-marcada (otro _ts) sobrevive — INDEPENDIENTE DEL RELOJ (su _ts es MENOR al tomb y aun así vive)
{
  const reAus = Object.assign({}, AUS, { _ts:1500, ausenteTs:1500 });
  const r = _mergeAsistencia({}, { [F]: { [P]: reAus } }, { [K]: 2000 });
  ok('ausencia re-marcada (otro _ts) sobrevive', !!(r.asistencia[F] && r.asistencia[F][P]));
}

// 4) Sin tombSet → unión pura intacta (no rompe lo existente)
{
  const r = _mergeAsistencia({}, { [F]: { [P]: AUS } });
  ok('sin tombSet: union pura intacta', !!(r.asistencia[F] && r.asistencia[F][P]));
}

// 5) El tombstone de una persona no afecta a otra
{
  const r = _mergeAsistencia({}, { [F]: { [P]: AUS, 'p2': PRES } }, { [K]: 1000 });
  ok('tomb de p1 borra p1', !(r.asistencia[F] && r.asistencia[F][P]));
  ok('tomb de p1 NO toca p2', !!(r.asistencia[F] && r.asistencia[F]['p2']));
}

// 6) tomb con ts DISTINTO al de la ausencia NO la borra (solo la EXACTA que se quitó)
{
  const r = _mergeAsistencia({}, { [F]: { [P]: AUS } }, { [K]: 9999 });
  ok('tomb con ts distinto NO borra (solo la exacta)', !!(r.asistencia[F] && r.asistencia[F][P]));
}

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
