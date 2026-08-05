/* v1141 — LA ORDEN DE COMPRA IMPRIME EL ÁREA A LA QUE VA EL MATERIAL (Antonio, 5-ago):
   "No sé por qué las OC están saliendo de esta manera... Necesito que abajo del proyecto se
    coloque el área de hacia dónde va ese material. Básicamente esa área la sacás de cuando se
    hace el pedido."

   EL DATO SIEMPRE ESTUVO. Al abrir el modal de generar OC, el campo Área se pre-llena SOLO
   desde el pedido (23749: pd.nivel + pd.apto) y la orden lo GUARDA (24842: area: areaOc). La
   lista en pantalla lo muestra desde siempre ("PROYECTO / ÁREA · TORRE ÚNICA · NIVEL 03").

   Lo que faltaba era el IMPRESO: la línea de Área que agregué en v1123 solo lee oc.areaDestino
   — el campo de los DESPACHOS pre-pago — y las OC normales guardan el dato en oc.area. Por eso
   el despacho salía con su área (la foto 2 de Antonio) y la OC 7 sin ella (la foto 1). Error
   mío de v1123: resolví el campo del flujo nuevo sin mirar que el flujo viejo ya tenía el suyo.

   ORDEN DE PRIORIDAD en el impreso:
     1. oc.areaDestino  (despachos: el área se eligió explícitamente al despachar)
     2. oc.area         (OC normal: heredada del pedido al generar)
     3. derivada del pedido origen (_findPedidoGlobal) — para OC viejas emitidas antes de que
        el campo existiera; solo LECTURA, no toca datos
   Sin ninguna de las tres, la línea NO se imprime: sin dato no se deja renglón vacío (la
   queja original de v1001). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* ── la función que decide el área del impreso ── */
const z = ex(code, 'function _ocAreaImpreso(');
ok('existe la función que decide el área', z.length > 100);

let f = null;
try {
  f = new Function('_findPedidoGlobal', z + '\nreturn _ocAreaImpreso;');
} catch(e){ console.log('   (no compiló: ' + e.message + ')'); }

if (f) {
  const sinPedido = f(() => null);
  console.log('\n— la prioridad —');
  ok('el despacho usa su areaDestino', sinPedido({ areaDestino:'TORRE 4, NIVEL 12, ETAPA 3', area:'OTRA' }) === 'TORRE 4, NIVEL 12, ETAPA 3');
  ok('la OC normal usa su area (el caso de la OC 7)', sinPedido({ area:'TORRE ÚNICA · NIVEL 03' }) === 'TORRE ÚNICA · NIVEL 03');
  ok('una OC vieja sin campo deriva del pedido origen',
    f(() => ({ pd: { nivel:'NIVEL 05', apto:'' } }))({ pedidoId:'pd-1' }) === 'NIVEL 05');
  ok('el pedido con apto lo incluye',
    f(() => ({ pd: { nivel:'NIVEL 05', apto:'APTO A03' } }))({ pedidoId:'pd-1' }) === 'NIVEL 05 · APTO A03');

  console.log('\n— sin dato no se inventa nada —');
  ok('sin nada devuelve vacío', sinPedido({}) === '');
  ok('null no lo tumba', sinPedido(null) === '');
  ok('espacios en blanco no cuentan como área', sinPedido({ area:'   ' }) === '');
  ok('sin pedidoId no busca', sinPedido({ pedidoId:'' }) === '');
  ok('un pedido que ya no existe no lo tumba', f(() => null)({ pedidoId:'pd-x' }) === '');

  console.log('\n— es solo lectura —');
  ok('no escribe nada', !/saveState|_ts\s*=/.test(z));
}

console.log('\n— el impreso la usa —');
const iArea = code.indexOf('<dt>Área:</dt>');
const zona = code.slice(iArea - 300, iArea + 300);
ok('la línea de Área existe en el impreso', iArea > 0);
ok('lee de la función, no solo de areaDestino', /_ocAreaImpreso\(oc\)/.test(zona));
ok('sigue debajo de Proyecto, como el formato de Antonio',
  code.indexOf('<dt>Proyecto:</dt>') < iArea);
ok('sin área no deja el renglón (condicional intacto)', /\? `<dt>Área:<\/dt>/.test(zona) || /&& `<dt>Área:<\/dt>/.test(zona) || /_areaImp \?/.test(zona));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
