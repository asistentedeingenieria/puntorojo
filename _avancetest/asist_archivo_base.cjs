/* v859 #3 Fase A: base del archivado de asistencia (sin mover datos aún).
   _asistSplitByAge(asis, cutoff): PURO — separa fechas recientes (>=cutoff) de viejas (<cutoff),
   agrupando las viejas por AÑO para los docs de archivo (appState/asist_arch_<YYYY>).
   _getAsistenciaDia(fecha): lee la marca de esa fecha desde lo CALIENTE y, si no está, desde el
   cache de archivo (state._asistArchive). Sync, para no romper a los ~20 lectores por fecha. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// _asistSplitByAge
const splitSrc = extractFn('_asistSplitByAge');
ok('_asistSplitByAge existe', !!splitSrc);
if (splitSrc) {
  const split = new Function(splitSrc + '\nreturn _asistSplitByAge;')();
  const asis = { '2026-06-26': {p1:{}}, '2026-01-15': {p2:{}}, '2025-03-10': {p3:{}}, '2024-12-31': {p4:{}} };
  const r = split(asis, '2026-01-01');   // corte: 2026-01-01 → reciente lo de 2026, archivo 2025 y 2024
  ok('reciente incluye >= corte', !!r.reciente['2026-06-26'] && !!r.reciente['2026-01-15']);
  ok('reciente NO incluye lo viejo', !r.reciente['2025-03-10'] && !r.reciente['2024-12-31']);
  ok('archivo agrupa por año', !!r.archivo['2025'] && !!r.archivo['2025']['2025-03-10'] && !!r.archivo['2024'] && !!r.archivo['2024']['2024-12-31']);
  ok('archivo NO incluye lo reciente', !r.archivo['2026']);
  // no rompe con vacío
  const r2 = split({}, '2026-01-01');
  ok('vacío → reciente y archivo vacíos', Object.keys(r2.reciente).length===0 && Object.keys(r2.archivo).length===0);
  // idempotente: el reciente solo, vuelto a partir, no manda nada al archivo
  const r3 = split(r.reciente, '2026-01-01');
  ok('split del reciente no archiva nada', Object.keys(r3.archivo).length===0);
}

// _getAsistenciaDia (lee state.asistenciaGlobal y, si falta, state._asistArchive)
const diaSrc = extractFn('_getAsistenciaDia');
ok('_getAsistenciaDia existe', !!diaSrc);
if (diaSrc) {
  const mkDia = (st) => new Function('state', diaSrc + '\nreturn _getAsistenciaDia;')(st);
  const st = { asistenciaGlobal: { '2026-06-26': { p1: {presente:true} } }, _asistArchive: { '2025-01-01': { p2: {presente:true} } } };
  const dia = mkDia(st);
  ok('fecha caliente → de asistenciaGlobal', dia('2026-06-26').p1 && dia('2026-06-26').p1.presente === true);
  ok('fecha vieja → del cache de archivo', dia('2025-01-01').p2 && dia('2025-01-01').p2.presente === true);
  ok('fecha inexistente → {} (no rompe)', typeof dia('2020-01-01') === 'object' && Object.keys(dia('2020-01-01')).length === 0);
}

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
