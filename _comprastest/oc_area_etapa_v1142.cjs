/* v1142 — EL ÁREA DEL IMPRESO INCLUYE LA ETAPA CUANDO EL PEDIDO VIENE DE LA RECETA

   Antonio (5-ago, sobre la OC 7 que ya salía con "Área: TORRE ÚNICA · NIVEL 03"):
   "Pero no sale qué etapa es la que se está pidiendo. También debe de salir la etapa que pide
    el supervisor. Esto de la etapa aplica ÚNICAMENTE si el pedido viene directamente de la
    receta de materiales."

   El dato existe: el pedido de receta guarda esDeReceta:true y recetaEtapaIdx (0..3). El área
   heredada del pedido (pd.nivel) solo trae la torre y el nivel — la etapa hay que sumarla.
   Formato: "TORRE ÚNICA · NIVEL 03 · ETAPA 1", como el papel de los despachos ("ETAPA 3").

   REGLAS:
   · SOLO pedidos de receta — un pedido del talonario (esDeReceta:false) no tiene etapa y no se
     le inventa una.
   · areaDestino (despachos) NO se toca: esa área se escribió explícitamente al despachar.
   · Si el texto del área ya menciona ETAPA, no se duplica.
   · recetaEtapaIdx = 0 es la ETAPA 1 (índice, no número humano) — ojo con tratarlo como falsy. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const z = ex(code, 'function _ocAreaImpreso(');
ok('la función existe', z.length > 100);

let mk = null;
try { mk = new Function('_findPedidoGlobal', z + '\nreturn _ocAreaImpreso;'); }
catch(e){ console.log('   (no compiló: ' + e.message + ')'); }

if (mk) {
  const PD_RECETA = { nivel:'TORRE ÚNICA · NIVEL 03', apto:'', esDeReceta:true, recetaEtapaIdx:0 };
  const conPedido = pd => mk(() => (pd ? { pd } : null));

  console.log('\n— el caso de Antonio: la OC 7 —');
  ok('el pedido de receta suma su etapa',
    conPedido(PD_RECETA)({ area:'TORRE ÚNICA · NIVEL 03', pedidoId:'pd-9' }) === 'TORRE ÚNICA · NIVEL 03 · ETAPA 1');
  ok('la etapa 0 del índice es la ETAPA 1 humana (no se pierde por falsy)',
    /ETAPA 1$/.test(conPedido(PD_RECETA)({ area:'X', pedidoId:'pd-9' })));
  ok('etapa 3 del índice sale como ETAPA 4',
    /ETAPA 4$/.test(conPedido({ ...PD_RECETA, recetaEtapaIdx:3 })({ area:'X', pedidoId:'pd-9' })));

  console.log('\n— ÚNICAMENTE pedidos de receta —');
  ok('un pedido del talonario NO lleva etapa',
    conPedido({ nivel:'BODEGA DE LA OBRA', esDeReceta:false })({ area:'BODEGA DE LA OBRA', pedidoId:'pd-11' }) === 'BODEGA DE LA OBRA');
  ok('sin recetaEtapaIdx no se inventa',
    conPedido({ nivel:'N2', esDeReceta:true })({ area:'N2', pedidoId:'pd-x' }) === 'N2');
  ok('sin pedido resoluble queda el área sola',
    mk(() => null)({ area:'NIVEL 05', pedidoId:'pd-borrado' }) === 'NIVEL 05');

  console.log('\n— lo que no debe cambiar —');
  ok('el despacho conserva su areaDestino tal cual (sin agregarle nada)',
    conPedido(PD_RECETA)({ areaDestino:'TORRE 4, NIVEL 12, ETAPA 3', pedidoId:'pd-9' }) === 'TORRE 4, NIVEL 12, ETAPA 3');
  ok('si el área ya dice ETAPA, no se duplica',
    conPedido(PD_RECETA)({ area:'NIVEL 03 · ETAPA 1', pedidoId:'pd-9' }) === 'NIVEL 03 · ETAPA 1');
  ok('la derivación del pedido viejo también suma la etapa',
    conPedido(PD_RECETA)({ pedidoId:'pd-9' }) === 'TORRE ÚNICA · NIVEL 03 · ETAPA 1');
  ok('sin nada sigue devolviendo vacío', mk(() => null)({}) === '');
  ok('null no lo tumba', mk(() => null)(null) === '');
}

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
