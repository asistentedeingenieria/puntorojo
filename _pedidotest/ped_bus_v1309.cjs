/* v1309 · BUS DE PEDIDOS (Antonio, 28-ago, tras el caso VLA-47): "una vez Rony lo suba,
   se suba directamente a la nube y TODOS lo vean en el mismo momento". El pedido viajaba
   SOLO en el doc gordo appState/proj_ — con internet de obra esa subida falla o tarda.
   Ahora el pedido COMPLETO viaja ADEMÁS en appState/pedBus (doc chiquito, canal propio,
   mismo patrón que el bus de autorizaciones v1298, probado en producción): los demás lo
   INJERTAN al recibir, sin needsResync; el doc canónico converge solo. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* 1) router: la colección ya se escucha (v491) — solo rutear el doc */
ok('router pedBus → _pedBusRemoto', /doc\.id === 'pedBus'[^\n]*window\._pedBusRemoto = doc\.data\(\)/.test(html));

/* 2) hooks en applyRemote, junto a los del bus de autorizaciones */
ok('applyRemote injerta el bus de pedidos', html.includes('_pedBusInjertar(); } catch(e){ console.warn'));
ok('applyRemote corre el auto-rescate', html.includes('_pedBusAutoEmitir(); } catch(e){}'));

/* 3) emisor */
const emit = html.slice(html.indexOf('function _pedBusEmitir'), html.indexOf('function _pedBusInjertar'));
ok('emisor escribe appState/pedBus con merge', emit.includes("doc('pedBus')") && emit.includes('{ merge: true }'));
ok('emisor manda el pedido COMPLETO + destino', emit.includes('pd: limpio') && emit.includes('ob: String(ob'));
ok('poda 48h cuando el bus engorda', emit.includes('48 * 36e5') && /llaves\.length > \d+/.test(emit));

/* 4) injerto: guardas correctas */
const inj = html.slice(html.indexOf('function _pedBusInjertar'), html.indexOf('function _pedBusAutoEmitir'));
ok('la lápida manda (no revive eliminados)', inj.includes('pedidosEliminados') && inj.includes('return'));
ok('no duplica (ya llegó por el doc gordo)', /some\(x => x && x\.id === id\)/.test(inj));
ok('sella el correlativo (nadie re-acuña)', inj.includes('_pedidoSeqSellar('));
ok('SIN needsResync ni saveState (nada de manadas)', !inj.includes('needsResync') && !inj.includes('saveState('));
ok('resuelve destino: obra / _bodega / _varios', inj.includes("'_bodega'") && inj.includes("'_varios'") && inj.includes('state.projects'));

/* 5) auto-rescate: cadencia 5 min, ventana 48h */
const auto = html.slice(html.indexOf('function _pedBusAutoEmitir'), html.indexOf('function _pedBusAutoEmitir') + 2200);
ok('cadencia 5 min', auto.includes('3e5'));
ok('ventana 48h y solo lo que al bus le falta', auto.includes('48 * 36e5') && auto.includes('bus[pd.id]'));

/* 6) los CUATRO creadores emiten al bus tras el push */
ok('generador de receta emite', /pedidos\.push\(pedido\);\s*\n\s*try \{ _pedBusEmitir\(pedido, p\.id\); \} catch\(e\)\{\}/.test(html.slice(html.indexOf('async function pedirEtapaCompleta'))));
ok('submitPedido emite (varios/bodega/obra)', html.includes("_pedBusEmitir(pedido, pedido.esVarios ? '_varios' : (pedido.esBodega ? '_bodega' : p.id))"));
ok('solicitud de etapa emite', /esSolicitudEtapa: true[\s\S]{0,400}_pedBusEmitir\(pedido, p\.id\)/.test(html));
ok('abastecimiento emite', /esAbastecimiento: true[\s\S]{0,400}_pedBusEmitir\(pedido, '_bodega'\)/.test(html));

/* 7) cambio de sync ⇒ ritual v892 (piso) */
const m = html.match(/APP_SYNC_VERSION = (\d+)/);
ok('APP_SYNC_VERSION >= 947', m && Number(m[1]) >= 947);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
