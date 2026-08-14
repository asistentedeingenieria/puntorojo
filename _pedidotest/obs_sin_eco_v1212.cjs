/* v1212 (Antonio, 14-ago, sobre el doc de VLA-25): "Las observaciones NO debe de decir
   dos veces etapa dos 2da etapa porque es lo mismo!"

   La observación del pedido automático concatenaba el NÚMERO de etapa ("ETAPA 2") y el
   NOMBRE que el usuario le puso a la etapa ("2DA ETAPA"). Cuando el nombre es solo el
   ordinal, es un eco. FIX: helper _obsSinEco — si un segmento "ETAPA N" genérico convive
   con otro segmento que nombra la MISMA etapa, sobrevive el nombre del usuario. Corre al
   CREAR el pedido (los nuevos nacen limpios) y al MOSTRAR (los ya guardados también). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— 1. el helper, evaluado aislado —');
const z = ex(code, 'function _obsSinEco(');
ok('existe', !!z);
try {
  const f = new Function('return (' + z + ')')();
  ok('EL CASO REAL de VLA-25: cae el "ETAPA 2" genérico, queda el nombre',
    f('PEDIDO AUTOMÁTICO DESDE RECETA · ETAPA 2 · 2DA ETAPA · TOTALES PDF')
      === 'PEDIDO AUTOMÁTICO DESDE RECETA · 2DA ETAPA · TOTALES PDF');
  ok('ordinal en palabra también ("TERCERA ETAPA")',
    f('ETAPA 3 · TERCERA ETAPA · APARTAMENTO 201') === 'TERCERA ETAPA · APARTAMENTO 201');
  ok('un nombre con contenido propio NO se toca (PRIMERA CARA no es eco)',
    f('PEDIDO AUTOMÁTICO DESDE RECETA · ETAPA 1 · PRIMERA CARA · 9 APTOS')
      === 'PEDIDO AUTOMÁTICO DESDE RECETA · ETAPA 1 · PRIMERA CARA · 9 APTOS');
  ok('etapas DISTINTAS no se tocan (raro pero no es eco)',
    f('ETAPA 1 · 2DA ETAPA') === 'ETAPA 1 · 2DA ETAPA');
  ok('sin etapa, pasa intacto',
    f('MATERIAL URGENTE PARA EL NIVEL 4') === 'MATERIAL URGENTE PARA EL NIVEL 4');
  ok('vacío/undefined no revienta', f('') === '' && f(undefined) === '');
} catch(e){ ok('evalúa aislado', false); }

console.log('\n— 2. corre al CREAR: la observación del pedido automático nace limpia —');
ok('la generación pasa por el helper', /observaciones: _obsSinEco\(`PEDIDO AUTOMÁTICO DESDE RECETA/.test(html));

console.log('\n— 3. corre al MOSTRAR: los pedidos YA guardados también salen limpios —');
const sitios = (html.match(/esc\(_obsSinEco\(pd\.observaciones\)\)/g) || []).length;
ok('en el doc de la solicitud, la tarjeta y el detalle (3 sitios)', sitios >= 3);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
