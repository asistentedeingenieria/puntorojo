/* v834/v836/v839: PDF SEMANAL de asistencia — TODAS LAS OBRAS.
   v834: respeta el filtro; _asistSemanaFilas recolecta obras. v836: sigla de obra ARRIBA de
   cada ✓/✗ + leyenda. v839: siglas FIJAS (ESSF2/VEC/TOR/VLA) y separación por CONTRATO
   (EN PLANILLA primero, luego SUBCONTRATISTAS) en el mismo PDF. */
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

// ── _asistSemanaFilas: dias + obras + diasObras + contrato ──
const srcFilas = extractFn('_asistSemanaFilas');
ok('extraída _asistSemanaFilas', !!srcFilas);
if (srcFilas){
  const filasFn = new Function(srcFilas + '\nreturn _asistSemanaFilas;')();
  const personal=[
    {id:'p1',nombre:'ANA',obraAsignada:'E',contrato:'PLANILLA'},
    {id:'p2',nombre:'BETO',obraAsignada:'E',contrato:'SUBCONTRATISTA'},
    {id:'p3',nombre:'CARLA',obraAsignada:'T'}
  ];
  const wk=['2026-06-15','2026-06-16','2026-06-17','2026-06-18','2026-06-19','2026-06-20'];
  const A={
    '2026-06-15':{ p1:{presente:true,obraId:'E'}, p2:{presente:true,obraId:'E'} },
    '2026-06-17':{ p1:{presente:true,obraId:'T'} },
    '2026-06-18':{ p1:{presente:true,multiSesion:true,sessions:[{obraId:'E'},{obraId:'T'}]} }
  };
  const filas=filasFn(personal, A, '', wk);
  ok('ANA obras-semana [E,T]', JSON.stringify(filas[0].obras)===JSON.stringify(['E','T']) && filas[0].total===3);
  ok('ANA diasObras por día', JSON.stringify(filas[0].diasObras)===JSON.stringify([['E'],[],['T'],['E','T'],[],[]]));
  ok('contrato por persona (PLANILLA/SUBCONTRATISTA/"")', filas[0].contrato==='PLANILLA' && filas[1].contrato==='SUBCONTRATISTA' && filas[2].contrato==='');
}

// ── _asistSiglas: siglas FIJAS por obra ──
const srcSig = extractFn('_asistSiglas');
ok('extraída _asistSiglas', !!srcSig);
if (srcSig){
  const sg = new Function(srcSig + '\nreturn _asistSiglas;')();
  const projs=[{id:'E',name:'ESSENZA FASE 2'},{id:'T',name:'TORELO'},{id:'V',name:'VICINIA DEL CARMEN'},{id:'A',name:'VICINIA LAS AMERICAS'}];
  const m=sg(['E','T','V','A'], projs);
  ok('ESSF2 / TOR / VEC / VLA (siglas fijas del user)', m.E==='ESSF2' && m.T==='TOR' && m.V==='VEC' && m.A==='VLA');
  const m2=sg(['z'], [{id:'z',name:'OBRA DESCONOCIDA'}]);
  ok('obra no listada → sigla auto', typeof m2.z==='string' && m2.z.length>=2);
}

// ── wiring TODAS LAS OBRAS (v834) ──
ok('_generarPdfSemanal acepta explicit', /function _generarPdfSemanal\(fechaBase, obraCtx, explicit\)/.test(html));
ok('abrirPdfSemanal pasa _obraFiltroAsist() + true', (html.match(/_generarPdfSemanal\([^;]*_obraFiltroAsist\(\)[^;]*true\)/g)||[]).length>=2);
ok('verObras = (obra==="")', /verObras\s*=\s*\(obra===''\)/.test(html));

// ── v836: sigla por celda + leyenda ──
ok('construye el mapa de siglas en TODAS', /_asistSiglas\(Object\.keys\(allIds\), projs\)/.test(html));
ok('didDrawCell dibuja la sigla (fila.diasSiglas[ci-2])', /fila\.diasSiglas\s*&&\s*fila\.diasSiglas\[ci-2\]/.test(html));
ok('leyenda SIGLAS POR OBRA abajo', /SIGLAS POR OBRA/.test(html));

// ── v839: separación por CONTRATO (EN PLANILLA primero) ──
ok('agrupa EN PLANILLA por contrato', /var gPlan=filas\.filter\(function\(f\)\{ return f\.contrato==='PLANILLA'/.test(html));
ok('agrupa SUBCONTRATISTA', /var gSub=filas\.filter\(function\(f\)\{ return f\.contrato==='SUBCONTRATISTA'/.test(html));
ok('sección EN PLANILLA + SUBCONTRATISTAS', /grupos\.push\(\['EN PLANILLA', gPlan\]\)/.test(html) && /grupos\.push\(\['SUBCONTRATISTAS', gSub\]\)/.test(html));
ok('EN PLANILLA va PRIMERO (antes de SUBCONTRATISTAS)', html.indexOf("grupos.push(['EN PLANILLA'") < html.indexOf("grupos.push(['SUBCONTRATISTAS'") && html.indexOf("grupos.push(['EN PLANILLA'")>0);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
