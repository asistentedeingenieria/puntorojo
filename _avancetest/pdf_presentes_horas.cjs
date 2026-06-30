/* v862: el PDF de PRESENTES DEL DÍA (descargarPdfDiaPresentes, el que bajan los encargados) ahora
   muestra ENTRADA y SALIDA. _asistEntradaSalida(rec) saca las horas del registro de asistencia del
   día (entrada/salida del resumen, '—' si falta). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const src = extractFn('_asistEntradaSalida');
ok('_asistEntradaSalida existe', !!src);
if (src) {
  const fn = new Function(src + '\nreturn _asistEntradaSalida;')();
  var r1 = fn({ entrada:'07:00', salida:'12:00' });
  ok('entrada y salida presentes', r1.entrada==='07:00' && r1.salida==='12:00');
  var r2 = fn({ entrada:'07:30' });
  ok('sin salida → "—"', r2.entrada==='07:30' && r2.salida==='—');
  var r3 = fn({});
  ok('registro vacío → ambos "—"', r3.entrada==='—' && r3.salida==='—');
  ok('null no rompe', fn(null).entrada==='—' && fn(null).salida==='—');
}

// Estructural: el PDF de presentes agrega las columnas y usa el helper.
ok('head del PDF incluye ENTRADA y SALIDA', html.indexOf("'PUESTO','ENTRADA','SALIDA'") >= 0);
ok('descargarPdfDiaPresentes usa _asistEntradaSalida', html.indexOf('_asistEntradaSalida(dia[') >= 0);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
