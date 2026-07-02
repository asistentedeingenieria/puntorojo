/* v882: LIBERAR PAGO eliminado del flujo — _PAGO_LIBRE_TODO=true (el user pidió que ya no exista
   esa función y se puedan generar pagos directo). Con el flag en true: el botón LIBERAR PAGO se
   oculta (38706) y el gate de pago se salta (38823). La lógica queda dormida para re-activar. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

ok('_PAGO_LIBRE_TODO = true (todo pagable, sin liberar)', /window\._PAGO_LIBRE_TODO = true;/.test(html));
ok('no queda _PAGO_LIBRE_TODO = false', !/window\._PAGO_LIBRE_TODO = false;/.test(html));
ok('el botón LIBERAR PAGO se oculta con el flag', /!window\._PAGO_LIBRE_TODO\)\{ \/\/ v739: oculto cuando todo está liberado/.test(html));
ok('el gate de pago respeta el flag', /!window\._PAGO_LIBRE_TODO\)\{ \/\/ v739: si _PAGO_LIBRE_TODO, todo liberado/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
