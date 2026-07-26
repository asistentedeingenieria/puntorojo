/* v982 (pedido de Antonio 26-jul): cuando se manda a FABRICAR únicamente los postes a
   la medida, lo que se genera es una ORDEN DE PRODUCCIÓN (no de compra): la OC cuyo
   grupo es TODO items aMedida nace con esProduccion=true, su número lleva OP en vez de
   OC, el documento titula ORDEN DE PRODUCCIÓN con subtítulo de fabricación, y el campo
   No. del modal también dice OP cuando el pedido es SOLO POSTES A MEDIDA. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

ok('el grupo TODO a-medida marca esProduccion', /const esProduccion = !esBodega && items\.length > 0 && items\.every\(it => it\.aMedida\)/.test(html));
ok('el número lleva OP', /esProduccion \? 'OP' : 'OC'/.test(html));
ok('la OC guarda el flag', /esProduccion, \/\/ v982/.test(html));
ok('el documento titula ORDEN DE PRODUCCIÓN', /oc\.esProduccion \? 'ORDEN DE PRODUCCIÓN' : 'ORDEN DE COMPRA'/.test(html));
ok('subtítulo de fabricación', /FABRICACIÓN DE POSTES A LA MEDIDA/.test(html));
ok('el campo No. del modal dice OP para pedidos SOLO POSTES', /SOLO POSTES A MEDIDA\/\.test\(String\(pd\.observaciones/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
