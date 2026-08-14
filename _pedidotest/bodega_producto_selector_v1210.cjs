/* v1210 — DOS CIERRES DEL PICKER (Antonio, 14-ago, con la persona de compras trabada):

   1. "Tengo el material en bodega YA cargado y al despachar dice 0 de 100": el NYLON del
      pedido ("METRO DE NYLON DELGADO 26") se llama distinto que el de bodega ("NYLON
      DELGADO 26 METROS (TRANSPARENTE)", 260 existencias) ⇒ claves distintas ⇒ saldo 0 y
      salida fantasma (la familia del microondas/la escalera). FIX: al elegir BODEGA
      CENTRAL, si la clave del renglón NO tiene existencias, se pregunta CUÁL producto de
      la bodega es y el renglón ADOPTA su nombre/clave (circuito v1187 de herramientas).
   2. Buscar "PRE PAGO" daba SIN RESULTADOS aunque la opción "COMPRA PRE-PAGO" existía —
      el guión. El filtro del picker ahora normaliza (ignora guiones/espacios/símbolos). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— 1. el filtro del picker ignora guiones y símbolos —');
const zF = ex(code, 'function _pickerFilas(');
ok('normaliza las dos puntas', /replace\(/.test(zF) && /includes/.test(zF));
try {
  const f = new Function('return (' + zF + ')')();
  const items = [{ id: 'a', label: 'COMPRA PRE-PAGO (DESPACHO)' }, { id: 'b', label: 'SISTEGUA, S.A.' }];
  ok('EL CASO REAL: "PRE PAGO" encuentra "COMPRA PRE-PAGO"', /PRE-PAGO/.test(f(items, 'PRE PAGO', '')));
  ok('"prepago" también', /PRE-PAGO/.test(f(items, 'prepago', '')));
  ok('lo que no está sigue sin salir', /SIN RESULTADOS/.test(f(items, 'ZZZZZ', '')));
  ok('sin filtro salen todos', /SISTEGUA/.test(f(items, '', '')) && /PRE-PAGO/.test(f(items, '', '')));
} catch(e){ ok('evalúa aislada', false); }

console.log('\n— 2. el selector "¿cuál producto de la bodega es?" —');
const zB = ex(code, 'window._ocOfrecerProductoBodega = function(');
ok('existe', !!zB);
ok('solo actúa cuando la clave NO casa con la bodega', /_ocItemMemKey\(it\.name\)/.test(zB) && /saldos\[kIt\]/.test(zB));
ok('lista solo productos CON existencia', /Number\(x\.saldo\) > 0/.test(zB));
ok('se puede DEJAR el nombre tipeado (no obliga)', /DEJAR EL NOMBRE TIPEADO/.test(zB));
ok('al elegir, el renglón ADOPTA la identidad de bodega', /it2\.name = x\.name/.test(zB));
ok('sin precio (los despachos no llevan dinero)', /it2\.precio = 0/.test(zB));

console.log('\n— 3. el enganche: elegir BODEGA CENTRAL dispara la pregunta —');
ok('updateOcItemProveedor ofrece el producto tras asignar _bodega', /_ocOfrecerProductoBodega\(_ocBtnProvDe\(idx\)/.test(code));
ok('tras el repintado, con el botón fresco (lección v1188)', /setTimeout[\s\S]{0,120}_ocOfrecerProductoBodega/.test(code));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
