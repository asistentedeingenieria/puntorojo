/* v1216 (Antonio, 14-ago, pedido VDC-38: "¿cómo despachamos este poco de clavos y
   tornillos de nuestra bodega central?").

   La trampa: el catálogo convierte los renglones chicos a presentación de COMPRA
   ("CIENTO DE TORNILLO DE ½" · 1 CIENTO · 20 UND", v1189). Si ese renglón se manda a
   BODEGA CENTRAL tal cual, la salida sería de 1 (un "ciento" que la bodega no maneja) en
   vez de 20 unidades — la báscula torcida de siempre. Y al revés: el FULMINANTE va en
   TIRAS y la bodega TAMBIÉN cuenta TIRAS (6 tiras es correcto, no 55).

   FIX: al adoptar un producto de bodega, la cantidad se pasa a LA UNIDAD DE LA FILA DE
   BODEGA — si la unidad de bodega es la misma presentación (TIRA≈TIRA DE 10) la cantidad
   se queda; si no (UND vs CIENTO), vuelven las unidades del pedido (qtyUnidades). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— 1. la cantidad en la unidad de la bodega (pura) —');
const zU = ex(code, 'function _bodegaUFmt(');
const zQ = ex(code, 'function _ocQtyEnUnidadDeBodega(');
ok('existe', !!zQ);
try {
  const UFmt = new Function('return (' + zU + ')')();
  const f = new Function('_bodegaUFmt', 'return (' + zQ + ')')(UFmt);
  ok('EL CIENTO vuelve a unidades: 1 CIENTO (20 UND) con bodega en UND → 20',
    f({ qty: 1, factorPres: 100, qtyUnidades: 20, presEtiqueta: 'CIENTO' }, 'UND') === 20);
  ok('EL FULMINANTE conserva sus tiras: 6 TIRA DE 10 (55 UND) con bodega en TIRA → 6',
    f({ qty: 6, factorPres: 10, qtyUnidades: 55, presEtiqueta: 'TIRA DE 10' }, 'TIRA') === 6);
  ok('sin unidad en la fila de bodega, manda la pieza (20)',
    f({ qty: 1, factorPres: 100, qtyUnidades: 20, presEtiqueta: 'CIENTO' }, '') === 20);
  ok('renglón SIN presentación pasa intacto',
    f({ qty: 250 }, 'UND') === 250);
} catch(e){ ok('evalúa aislada', false); console.log('  ' + e.message); }

console.log('\n— 2. la adopción muta la línea y limpia la presentación —');
const zL = ex(code, 'function _ocLineaAUnidadDeBodega(');
ok('existe', !!zL);
try {
  const UFmt = new Function('return (' + zU + ')')();
  const fQ = new Function('_bodegaUFmt', 'return (' + zQ + ')')(UFmt);
  const fL = new Function('_ocQtyEnUnidadDeBodega', 'return (' + zL + ')')(fQ);
  const it = { qty: 1, factorPres: 100, qtyUnidades: 20, presEtiqueta: 'CIENTO' };
  fL(it, 'UND');
  ok('qty=20 y sin marcas de presentación (el render ya no dice CIENTO)',
    it.qty === 20 && !it.factorPres && !it.presEtiqueta);
  const it2 = { qty: 6, factorPres: 10, qtyUnidades: 55, presEtiqueta: 'TIRA DE 10' };
  fL(it2, 'TIRA');
  ok('las tiras se quedan como están (marcas incluidas)', it2.qty === 6 && it2.factorPres === 10);
} catch(e){ ok('muta aislada', false); console.log('  ' + e.message); }

console.log('\n— 3. los enganches —');
ok('_bodegaBuscarMaterial devuelve la unidad de la fila', /u: s\.u \|\| ''/.test(ex(code, 'function _bodegaBuscarMaterial(')));
const zP = ex(code, 'function updateOcItemProveedor(');
ok('la adopción en el picker de proveedor normaliza (las dos ramas)',
  (zP.match(/_ocLineaAUnidadDeBodega\(item, _res\.u\)/g) || []).length >= 2);
ok('el selector v1210 también', /_ocLineaAUnidadDeBodega\(it2, x\.u\)/.test(ex(code, 'window._ocOfrecerProductoBodega = function(')));
ok('la partición v1145 no intenta partir renglones convertidos (cantidad en otra unidad)',
  /!item\.factorPres/.test(zP));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
