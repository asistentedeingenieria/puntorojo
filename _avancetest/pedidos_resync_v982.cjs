/* v982 (pedido de Antonio 26-jul): un pedido DE RECETA que aún NO generó su OC se
   RE-SINCRONIZA solo cuando la receta cambia (cantidades, aproximación ≈, fulminantes).
   Reglas: (a) solo pedidos esDeReceta SIN OCs; (b) scope = las claves que el pedido ya
   traía (recetaKeys) — cantidades se actualizan y los materiales QUITADOS de la receta
   salen del pedido; agregar materiales nuevos exige pedido nuevo; (c) misma matemática
   del generador: cobertura v909 excluyendo el PROPIO pedido, aproximación por múltiplo,
   fulminantes derivados, recetaQty EXACTO; (d) sella _ts (union-merge v972); (e) corre
   tras recetaV2Op, autorizarReceta y recetaToggleMiles. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zR = ex('function _pedidoResyncConReceta(');
ok('_pedidoResyncConReceta existe', !!zR);
let mk = null;
try {
  mk = new Function('_recetaV2EtapaNivel', '_recetaV2EtapaNivelPorApto', '_coberturaAptosEtapa', '_nombreCompraConMedida', '_recetaEsMiles', '_recetaAprox', '_recetaMilesMult', '_recetaDerivarFulminantes', 'getPedidoOrdenes',
    'return (' + zR + ')');
} catch(e){}
if (mk) {
  const CLAVO = 'CLAVO CON ROLDANA 1"', FULM = 'FULMINANTE TIRA CAL. 27 AMARILLO';
  const fuente = { [CLAVO]: 1146, [FULM]: 115 };
  const deps = (src, ocs) => [
    () => src,                     // _recetaV2EtapaNivel
    () => src,                     // _recetaV2EtapaNivelPorApto
    () => ({}),                    // _coberturaAptosEtapa (sin otros pedidos)
    (k) => k,                      // _nombreCompraConMedida (sin renombre)
    (p, n) => n === CLAVO,         // _recetaEsMiles (solo el clavo marcado)
    (n, m) => { if (n < m/2) return n; const r = Math.round(n/m)*m; return r < m ? m : r; },
    () => 1000,                    // _recetaMilesMult
    (items) => {                   // _recetaDerivarFulminantes (regla real v978)
      let clavos = 0, f = 0;
      items.forEach(it => { const s = String(it.name).toUpperCase(); if (s.includes('FULMINANTE')) f++; else if (s.includes('CLAVO')) clavos += it.qty; });
      if (f !== 1 || !(clavos > 0)) return null;
      return { tiras: Math.ceil(Math.ceil(clavos/10)/10)*10, clavos };
    },
    () => ocs                      // getPedidoOrdenes
  ];
  const mkPd = () => ({ id:'pd1', esDeReceta:true, recetaLevelId:'l2', recetaEtapaIdx:0,
    recetaKeys:[CLAVO, FULM], recetaQty:{ [CLAVO]:1146, [FULM]:115 },
    items:{ [CLAVO]:1146, [FULM]:115 }, _ts: 1 });
  const p = { materiales: { pedidos: [] } };
  // 1. cambia: clavo marcado ≈ → items 1000 + fulminante derivado 100; recetaQty EXACTO
  const pd1 = mkPd(); p.materiales.pedidos = [pd1];
  const f1 = mk(...deps(fuente, []));
  ok('re-sincroniza: clavo ≈1,000 y fulminante derivado 100 tiras', f1(p, pd1) === true && pd1.items[CLAVO] === 1000 && pd1.items[FULM] === 100);
  ok('recetaQty queda EXACTO (contabilidad v909)', pd1.recetaQty[CLAVO] === 1146 && pd1.recetaQty[FULM] === 115);
  ok('sella _ts al cambiar', pd1._ts > 1);
  // 2. material QUITADO de la receta → sale del pedido
  const pd2 = mkPd(); p.materiales.pedidos = [pd2];
  const f2 = mk(...deps({ [FULM]: 115 }, []));
  ok('material quitado de la receta sale del pedido', f2(p, pd2) === true && !(CLAVO in pd2.items) && pd2.recetaKeys.indexOf(CLAVO) < 0);
  // 3. con OCs generadas NO se toca
  const pd3 = mkPd(); p.materiales.pedidos = [pd3];
  const f3 = mk(...deps(fuente, [{ id:'oc1' }]));
  ok('con OCs generadas NO se toca', f3(p, pd3) === false && pd3.items[CLAVO] === 1146 && pd3._ts === 1);
} else ok('_pedidoResyncConReceta evaluable', false);

// hooks en las 3 fronteras que mutan la receta
ok('recetaV2Op re-sincroniza pedidos', /_pedidosResyncReceta\(p\)/.test(ex('window.recetaV2Op = async function')));
ok('autorizarReceta re-sincroniza pedidos', /_pedidosResyncReceta\(p\)/.test(ex('window.autorizarReceta = async function')));
ok('recetaToggleMiles re-sincroniza pedidos', /_pedidosResyncReceta\(p\)/.test(ex('window.recetaToggleMiles = async function')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
