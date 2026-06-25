/* v834: PDF SEMANAL de asistencia — TODAS LAS OBRAS + columna OBRAS (Opción C).
   - _asistSemanaFilas también recolecta las obras donde estuvo cada persona esa semana.
   - _asistObrasLabel(ids,projs) → nombres separados por coma.
   - El generador agrega la columna OBRAS solo cuando obra='' (TODAS); abrirPdfSemanal pasa
     _obraFiltroAsist() (encargado→su obra, admin→filtro; ''=TODAS) y _generarPdfSemanal lo
     respeta (explicit, sin caer al proyecto activo). */
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

// ── funcional: _asistSemanaFilas recolecta obras ──
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
  const filas=filasFn(personal, A, '', wk); // '' = TODAS
  ok('3 filas, ordenadas ANA/BETO/CARLA', filas.length===3 && filas[0].nombre==='ANA' && filas[2].nombre==='CARLA');
  ok('ANA: obras [E,T] (lun E, mié T, jue multiSesión E+T)', JSON.stringify(filas[0].obras)===JSON.stringify(['E','T']) && filas[0].total===3);
  ok('ANA: días lun/mié/jue presentes', filas[0].dias[0]===true && filas[0].dias[2]===true && filas[0].dias[3]===true && filas[0].dias[1]===false);
  ok('BETO: obra [E], 1 día', JSON.stringify(filas[1].obras)===JSON.stringify(['E']) && filas[1].total===1);
  ok('CARLA: ausente → obras [], 0 días', JSON.stringify(filas[2].obras)===JSON.stringify([]) && filas[2].total===0);
}

// ── funcional: _asistObrasLabel ──
const srcLbl = extractFn('_asistObrasLabel');
ok('extraída _asistObrasLabel', !!srcLbl);
if (srcLbl){
  const lbl = new Function(srcLbl + '\nreturn _asistObrasLabel;')();
  const projs=[{id:'E',name:'ESSENZA FASE 2'},{id:'T',name:'TORELO'}];
  ok('mapea ids a nombres', lbl(['E','T'], projs)==='ESSENZA FASE 2, TORELO');
  ok('id desconocido → en mayúsculas', lbl(['x9'], projs)==='X9');
  ok('OTRA se respeta', lbl(['OTRA'], projs)==='OTRA');
  ok('vacío → ""', lbl([], projs)==='');
}

// ── estructural: wiring ──
ok('_generarPdfSemanal acepta explicit', /function _generarPdfSemanal\(fechaBase, obraCtx, explicit\)/.test(html));
ok('explicit → obra autoritativa ("" = TODAS, sin caer al proyecto activo)', /explicit\s*\?\s*String\(obraCtx\|\|''\)\s*:/.test(html));
ok('abrirPdfSemanal pasa _obraFiltroAsist() + true (respeta TODAS LAS OBRAS)', (html.match(/_generarPdfSemanal\([^;]*_obraFiltroAsist\(\)[^;]*true\)/g)||[]).length>=2);
ok('columna OBRAS condicional a TODAS (verObras / obra==="")', /verObras\s*=\s*\(obra===''\)/.test(html));
ok('head agrega OBRAS solo en TODAS', /verObras\s*\?\s*\['OBRAS'\]\s*:\s*\[\]/.test(html));
ok('body usa _asistObrasLabel para la columna', /_asistObrasLabel\(f\.obras, projs\)/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
