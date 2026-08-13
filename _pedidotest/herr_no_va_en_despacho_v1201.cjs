/* v1201 — UNA HERRAMIENTA NUNCA VIAJA EN EL DESPACHO DE MATERIALES (Antonio, 12-ago):
   la PISTOLA DE CALAFATEO USO PESADO salió como primer renglón de la ORDEN DE DESPACHO
   DESP5-000001 (materiales) — "esto NO debería ser así... que YA NO vuelva a suceder".

   EL HOYO: al generar las OC del pedido, la rama esBodega ('_bodega' = despacho de
   materiales) tomaba el grupo COMPLETO — si un renglón era una herramienta cargada en
   BODEGA DE HERRAMIENTA, se iba al despacho de materiales igual, saltándose el circuito
   de herramientas (v1155: sin precio, con devolución, libro herrMovs).

   EL CANDADO: antes de armar el despacho se filtran los renglones cuya clave (_herrKey)
   existe en _herrSaldos — esos NO van: toast que manda a elegirlos como BODEGA CENTRAL ·
   HERRAMIENTAS (v1187) y el renglón queda pendiente. Si el grupo era SOLO herramientas,
   el despacho no nace vacío. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— el candado en la rama esBodega —');
const i = code.indexOf("const esBodega = _provIdReal === '_bodega'");
const z = code.slice(i, i + 2600);
ok('la rama se encuentra', i > 0);
ok('filtra por la clave del libro de herramientas', /_herrSaldos\(/.test(z) && /_herrKey\(it\.name\)/.test(z));
ok('los renglones herramienta SALEN del grupo (splice)', /splice/.test(z));
ok('avisa POR QUÉ y A DÓNDE ir', /ES HERRAMIENTA DE BODEGA/.test(z) && /HERRAMIENTAS/.test(z));
ok('grupo solo-herramientas → el despacho NO nace vacío', /if \(!items\.length\) return;/.test(z));
ok('el filtro corre ANTES de calcular totales', z.indexOf('_herrKey') < z.indexOf('_ocTotalesIvaIncluido'));
ok('solo aplica a la bodega de MATERIALES (gate esBodega)', /if \(esBodega\)/.test(z));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
