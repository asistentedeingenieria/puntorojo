/* v834 + v836: PDF SEMANAL de asistencia — TODAS LAS OBRAS.
   v834: el botón respeta el filtro (encargado→su obra, admin→''=TODAS); _asistSemanaFilas
   recolecta las obras de la semana. v836: en TODAS, la SIGLA de la obra va ARRIBA de cada
   ✓/✗ por día (qué día en qué obra), con leyenda de siglas abajo — ya NO una columna OBRAS. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0; const ok = (n, c) => c ? pass++ : (fail++, console.log('FAIL ' + n));

function extractFn(name){
  const m = html.indexOf('function ' + name + '(');
  if (m < 0) return '';
  let i = html.indexOf('{', m), d = 0;
  for (; i < html.length; i++){ if (html[i] === '{') d++; else if (html[i] === '}'){ d--; if (d === 0) return html.slice(m, i + 1); } }
  return '';
}

// ── _asistSemanaFilas: dias (bool) + obras (semana) + diasObras (por día) ──
const srcFilas = extractFn('_asistSemanaFilas');
ok('extraída _asistSemanaFilas', !!srcFilas);
if (srcFilas){
  const filasFn = new Function(srcFilas + '\nreturn _asistSemanaFilas;')();
  const personal=[{id:'p1',nombre:'ANA',obraAsignada:'E'},{id:'p2',nombre:'BETO',obraAsignada:'E'},{id:'p3',nombre:'CARLA',obraAsignada:'T'}];
  const wk=['2026-06-15','2026-06-16','2026-06-17','2026-06-18','2026-06-19','2026-06-20'];
  const A={
    '2026-06-15':{ p1:{presente:true,obraId:'E'}, p2:{presente:true,obraId:'E'} },
    '2026-06-17':{ p1:{presente:true,obraId:'T'} },
    '2026-06-18':{ p1:{presente:true,multiSesion:true,sessions:[{obraId:'E'},{obraId:'T'}]} }
  };
  const filas=filasFn(personal, A, '', wk);
  ok('orden ANA/BETO/CARLA', filas[0].nombre==='ANA' && filas[2].nombre==='CARLA');
  ok('ANA obras-semana [E,T], total 3', JSON.stringify(filas[0].obras)===JSON.stringify(['E','T']) && filas[0].total===3);
  ok('ANA diasObras: lun[E] mar[] mié[T] jue[E,T] vie[] sáb[]', JSON.stringify(filas[0].diasObras)===JSON.stringify([['E'],[],['T'],['E','T'],[],[]]));
  ok('BETO diasObras lun [E]', JSON.stringify(filas[1].diasObras[0])===JSON.stringify(['E']));
  ok('CARLA ausente: diasObras todo []', filas[2].diasObras.every(d=>Array.isArray(d)&&d.length===0));
}

// ── _asistSiglas: siglas cortas y únicas ──
const srcSig = extractFn('_asistSiglas');
ok('extraída _asistSiglas', !!srcSig);
if (srcSig){
  const sg = new Function(srcSig + '\nreturn _asistSiglas;')();
  const projs=[{id:'E',name:'ESSENZA FASE 2'},{id:'T',name:'TORELO'},{id:'V',name:'VICINIA DEL CARMEN'}];
  const m=sg(['E','T','V'], projs);
  ok('ESS / TOR / VIC', m.E==='ESS' && m.T==='TOR' && m.V==='VIC');
  const m2=sg(['a','b'], [{id:'a',name:'ESSENZA FASE 1'},{id:'b',name:'ESSENZA FASE 2'}]);
  ok('siglas únicas (dedupe en colisión)', m2.a!==m2.b && m2.a==='ESS');
}

// ── _asistObrasLabel sigue existiendo (lo usa el PDF diario v835) ──
ok('_asistObrasLabel sigue', !!extractFn('_asistObrasLabel'));

// ── wiring TODAS LAS OBRAS (v834, sin cambios) ──
ok('_generarPdfSemanal acepta explicit', /function _generarPdfSemanal\(fechaBase, obraCtx, explicit\)/.test(html));
ok('explicit → obra autoritativa ("" = TODAS)', /explicit\s*\?\s*String\(obraCtx\|\|''\)\s*:/.test(html));
ok('abrirPdfSemanal pasa _obraFiltroAsist() + true', (html.match(/_generarPdfSemanal\([^;]*_obraFiltroAsist\(\)[^;]*true\)/g)||[]).length>=2);
ok('verObras = (obra==="")', /verObras\s*=\s*\(obra===''\)/.test(html));

// ── v836: SIGLA por celda + leyenda, SIN columna OBRAS ──
ok('construye el mapa de siglas en TODAS', /_asistSiglas\(Object\.keys\(allIds\), projs\)/.test(html));
ok('asigna f.diasSiglas por fila', /f\.diasSiglas\s*=/.test(html));
ok('didDrawCell dibuja la sigla arriba (fila.diasSiglas[ci-2])', /fila\.diasSiglas\s*&&\s*fila\.diasSiglas\[ci-2\]/.test(html));
ok('leyenda SIGLAS POR OBRA abajo', /SIGLAS POR OBRA/.test(html));
ok('YA NO hay columna OBRAS al costado', !/_asistObrasLabel\(f\.obras, projs\)/.test(html) && !/verObras\?\['OBRAS'\]:\[\]/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
