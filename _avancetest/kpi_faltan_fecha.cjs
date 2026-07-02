/* v881: los modales FALTAN INGRESO / FALTAN SALIDA muestran LA FECHA que están contando.
   Causa de confusión real: el user vio "FALTAN SALIDA: 10" (hoy en la mañana, selector default)
   y lo comparó contra la vista de ayer del encargado creyendo que era el mismo día. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

ok('helper _fechaBonita existe', html.indexOf('function _fechaBonita(') >= 0);
const m = html.match(/function _fechaBonita\([^)]*\)\{[^}]*\}/);
if (m) {
  const fn = new Function(m[0] + '\nreturn _fechaBonita;')();
  ok('formatea YYYY-MM-DD → DD/MM/YYYY', fn('2026-07-02') === '02/07/2026');
  ok('valor raro pasa tal cual', fn('') === '' && fn(null) === null);
}
ok('FALTAN SALIDA muestra la fecha', /FALTAN SALIDA: <b>'\+arr\.length\+'<\/b> · '\+_fechaBonita\(fecha\)\+'/.test(html));
ok('FALTAN INGRESO muestra la fecha', /FALTAN INGRESO: <b>'\+arr\.length\+'<\/b> · '\+_fechaBonita\(fecha\)\+'/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
