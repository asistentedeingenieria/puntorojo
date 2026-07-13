/* v906 (fase 2 del pedido de VLA): la receta FORMATO ESTÁNDAR (v905) alimenta el flujo de
   PEDIDOS → ÓRDENES DE COMPRA.
   (1) _recetaV2EtapaNivel(p, levelId, etapaIdx): totales por nivel desde recetaV2 con clave =
       NOMBRE REAL DE COMPRA (item.nc, fallback item.m); duplicados se SUMAN (plancha de
       TABIQUES + ENCHAPES comparten nc); SOLO formato:'estandar' (VDC v3-viejo no cambia de
       claves → su dedup histórica no se rompe). Claves SIN medida de postes.
   (2) _recetaEtapaResuelta la usa como PRIORIDAD 1 (usarTotalesPDF:true = totales directos).
   (3) pedirEtapaCompleta: resuelve fuente con _recetaEtapaResuelta (DRY con el selector),
       aplica _nombreCompraConMedida al armar items (la medida queda CONGELADA en el pedido),
       guarda pedido.recetaKeys (claves originales) y _todoPedido usa recetaDisponible.
   (4) _itemsYaPedidosEtapa también marca pd.recetaKeys (los postes renombrados siguen
       contando como ya pedidos). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. _recetaV2EtapaNivel ──
const srcNivel = extractFn('_recetaV2EtapaNivel');
ok('_recetaV2EtapaNivel existe', !!srcNivel);
if (srcNivel) {
  const f = new Function(srcNivel + '\nreturn _recetaV2EtapaNivel;')();
  const pStd = { materiales: { recetaV2: { formato:'estandar', niveles: { 'l-2': {
    0: [
      { m:'Plancha ultra / TABIQUES', nc:'TABLAYESO 12.7mm', u:'u', aptos:{ a1:5, a2:3 } },
      { m:'Plancha ultra / ENCHAPES', nc:'TABLAYESO 12.7mm', u:'u', aptos:{ a1:2 } },
      { m:'Poste de 2 1/2" cal 26', nc:'POSTE DE 2½" X 10\' (0.35) CAL. 26', u:'u', aptos:{ a1:20 } },
      { m:'Reborde J', nc:'REBORDE J', u:'u', aptos:{} },
      { m:'Sin nombre compra', u:'u', aptos:{ a1:4 } }
    ],
    1: []
  } } } } };
  const r = f(pStd, 'l-2', 0);
  ok('clave = nombre real y duplicados SUMADOS', !!r && r['TABLAYESO 12.7mm'] === 10);
  ok('postes con clave SIN medida', !!r && r['POSTE DE 2½" X 10\' (0.35) CAL. 26'] === 20);
  ok('sin nc cae al nombre corto', !!r && r['Sin nombre compra'] === 4);
  ok('total 0 no entra', !!r && !('REBORDE J' in r));
  ok('etapa vacía → null', f(pStd, 'l-2', 1) === null);
  ok('nivel inexistente → null', f(pStd, 'l-9', 0) === null);
  const pViejo = { materiales: { recetaV2: { version:3, niveles: { 'l-2': { 0: [ { m:'X', aptos:{a1:5} } ] } } } } };
  ok('recetaV2 SIN formato estandar (VDC) → null', f(pViejo, 'l-2', 0) === null);
}

// ── 2. _recetaEtapaResuelta prioriza la recetaV2 estándar ──
const srcRes = extractFn('_recetaEtapaResuelta');
ok('_recetaEtapaResuelta usa _recetaV2EtapaNivel', /_recetaV2EtapaNivel\(/.test(srcRes));
if (srcRes && srcNivel) {
  const g = new Function(srcNivel + '\n' + srcRes + '\nreturn _recetaEtapaResuelta;')();
  const p1 = { materiales: {
    recetaV2: { formato:'estandar', niveles: { 'l-2': { 0: [ { m:'Poste', nc:'POSTE X', aptos:{a1:7} } ] } } },
    recetaPorTorreYNivel: { 'TORRE 1': { 'NIVEL 02': { 0: { 'OTRA::COSA': 99 } } } },
    receta: [{ 'CLASICA': 1 },{},{},{},{},{}]
  } };
  const t = { name:'TORRE 1' }, l = { id:'l-2', name:'NIVEL 02' };
  const R1 = g(p1, t, l, 0);
  ok('prioridad 1: recetaV2 estándar (totales directos)', R1.usarTotalesPDF === true && R1.src['POSTE X'] === 7 && R1.deRecetaV2 === true);
  const p2 = { materiales: { recetaPorTorreYNivel: { 'TORRE 1': { 'NIVEL 02': { 0: { 'OTRA::COSA': 99 } } } }, receta: [{},{},{},{},{},{}] } };
  const R2 = g(p2, t, l, 0);
  ok('sin recetaV2 estándar cae al PDF per-nivel', R2.usarTotalesPDF === true && R2.src['OTRA::COSA'] === 99 && !R2.deRecetaV2);
}

// ── 3. dedup marca también recetaKeys ──
const srcYa = extractFn('_itemsYaPedidosEtapa');
ok('_itemsYaPedidosEtapa marca recetaKeys', /recetaKeys/.test(srcYa));
if (srcYa) {
  const h = new Function(srcYa + '\nreturn _itemsYaPedidosEtapa;')();
  const pedidos = [{ esDeReceta:true, recetaLevelId:'l-2', recetaEtapaIdx:0,
    items: { "POSTE DE 2½\" X 10.5' (0.35) CAL. 26 (MEDIDA ESPECIAL 3.2 m)": 20 },
    recetaKeys: ["POSTE DE 2½\" X 10' (0.35) CAL. 26"] }];
  const marcados = h(pedidos, 'l-2', 0);
  ok('la clave ORIGINAL del poste cuenta como pedida', marcados["POSTE DE 2½\" X 10' (0.35) CAL. 26"] === true);
  ok('la clave renombrada también', marcados["POSTE DE 2½\" X 10.5' (0.35) CAL. 26 (MEDIDA ESPECIAL 3.2 m)"] === true);
}

// ── 4. cableado en pedirEtapaCompleta ──
const srcPedir = extractFn('pedirEtapaCompleta');
ok('pedirEtapaCompleta resuelve con _recetaEtapaResuelta', /_recetaEtapaResuelta\(p, t, l, stageIdx\)/.test(srcPedir));
ok('items del pedido con medida de postes aplicada', /_nombreCompraConMedida\(key, p\)/.test(srcPedir));
ok('el pedido guarda recetaKeys', /recetaKeys: Object\.keys\(recetaDisponible\)/.test(srcPedir));
ok('_todoPedido revisa recetaDisponible (no items renombrados)', /recetaDisponible\[k\] != null/.test(srcPedir));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
