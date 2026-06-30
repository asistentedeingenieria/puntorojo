/* v835: PDF PRESENTES DEL DÍA — en modo TODAS LAS OBRAS, columna OBRA + orden por obra.
   _asistDiaObraIds(pn,reg) = obras donde estuvo ese día; se etiqueta con _asistObrasLabel (v834).
   descargarPdfDiaPresentes: si _obraCtx==='' (TODAS), agrega columna OBRA y ordena por obra. */
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

// ── funcional: _asistDiaObraIds ──
const src = extractFn('_asistDiaObraIds');
ok('extraída _asistDiaObraIds', !!src);
if (src){
  const f = new Function(src + '\nreturn _asistDiaObraIds;')();
  ok('obraId simple', JSON.stringify(f({obraAsignada:'X'}, {presente:true,obraId:'E'}))===JSON.stringify(['E']));
  ok('multiSesión 2 obras (ordenadas)', JSON.stringify(f({obraAsignada:'X'}, {presente:true,multiSesion:true,sessions:[{obraId:'T'},{obraId:'E'}]}))===JSON.stringify(['E','T']));
  ok('sin obraId → obraAsignada', JSON.stringify(f({obraAsignada:'X'}, {presente:true}))===JSON.stringify(['X']));
  ok('sin nada → []', JSON.stringify(f({}, {presente:true}))===JSON.stringify([]));
}

// ── estructural: wiring en descargarPdfDiaPresentes ──
ok('detecta modo TODAS (_obraCtx==="")', /_esTodas\s*=\s*\(_obraCtx===''\)/.test(html));
ok('head agrega OBRA solo en TODAS', /_esTodas\s*\?\s*\['#','NOMBRE','PUESTO','ENTRADA','SALIDA','OBRA'\]\s*:\s*\['#','NOMBRE','PUESTO','ENTRADA','SALIDA'\]/.test(html)); // v862: + ENTRADA/SALIDA
ok('etiqueta la obra del día (_asistObrasLabel + _asistDiaObraIds)', /_asistObrasLabel\(_asistDiaObraIds\(/.test(html));
ok('ordena por obra cuando TODAS', /a\.obra\.localeCompare\(b\.obra/.test(html));
ok('título dice TODAS LAS OBRAS en ese modo', /_esTodas\s*\?\s*'TODAS LAS OBRAS'/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
