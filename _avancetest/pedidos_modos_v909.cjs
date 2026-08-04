/* v909 (pedidos de receta con modos — decisiones de Antonio 13-jul):
   MODOS (solo receta FORMATO ESTÁNDAR; VDC/ESSENZA quedan con su flujo intacto):
     1. NIVEL COMPLETO           — todo lo disponible, cantidades del TOTAL NIVEL (fijas).
     2. ELEGIR MATERIALES NIVEL  — selector existente (v699b), cantidades fijas.
     3. POR APARTAMENTO          — la etapa de UN apto (todo o materiales elegidos),
                                   cantidades de la columna del apto (fijas).
     4. SOLO POSTES A MEDIDA     — mandar a fabricar solo los postes (escala nivel).
   ARITMÉTICA ANTI-DOBLE-PEDIDO ("restar lo ya pedido"):
     - pedido por APTO guarda recetaAptoId + recetaQty {claveOriginal: qty};
     - un pedido por apto NO cierra la clave a escala de nivel (_itemsYaPedidosEtapa lo salta);
     - el pedido de NIVEL resta lo ya pedido por apto (_coberturaAptosEtapa): el total del
       nivel siempre cierra con el TOTAL NIVEL del Excel;
     - un pedido de NIVEL sí cierra la clave (también para los aptos).
   OC / POSTES A MEDIDA: badge "A MEDIDA · PRECIO MANUAL" + memoria del último precio por
   medida (p.materiales.postesPrecioMedida[metros]) que se pre-llena editable.
   BUGFIX VLA: renderRecetaPedir gateaba los botones con la receta CLÁSICA (p.materiales.receta)
   → en VLA (solo recetaV2) todo salía "SIN RECETA"; ahora usa _recetaEtapaItemKeys. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const POSTE = "POSTE DE 2½\" X 10' CAL. 26";
const pEst = { materiales: { recetaV2: { formato:'estandar', etapas:['1RA ETAPA','2NDA ETAPA','3ERA ETAPA','4TA ETAPA'], niveles: { 'l-2': { 0: [
  { m:'Canal', nc:'CANAL X', u:'u', aptos:{ 'a-201':50, 'a-202':60 }, tn: 100 },
  { m:'Poste', nc:POSTE, u:'u', aptos:{ 'a-201':200, 'a-202':229 }, tn: 424 },
  { m:'Clavo', nc:'CLAVO H', u:'u', aptos:{ 'a-201':10 } }
] } } }, pedidos: [] } };
const T = { id:'t1', name:'TORRE ÚNICA' };
const L = { id:'l-2', name:'NIVEL 02', aptos:[{id:'a-201',name:'APARTAMENTO 201'},{id:'a-202',name:'APARTAMENTO 202'}] };
const pdApto = (aptoId, recetaQty) => ({ esDeReceta:true, recetaLevelId:'l-2', recetaEtapaIdx:0, recetaAptoId:aptoId, recetaQty, items:{}, recetaKeys:Object.keys(recetaQty) });
const pdNivel = (recetaQty) => ({ esDeReceta:true, recetaLevelId:'l-2', recetaEtapaIdx:0, recetaQty, items:recetaQty, recetaKeys:Object.keys(recetaQty) });
const clone = o => JSON.parse(JSON.stringify(o));

// ── 1. _recetaV2EtapaNivelPorApto ──
const srcApto = extractFn('_recetaV2EtapaNivelPorApto');
ok('_recetaV2EtapaNivelPorApto existe', !!srcApto);
if (srcApto) {
  const f = new Function(srcApto + '\nreturn _recetaV2EtapaNivelPorApto;')();
  const r = f(pEst, 'l-2', 0, 'a-201');
  ok('cantidades de la columna del apto', !!r && r['CANAL X'] === 50 && r[POSTE] === 200 && r['CLAVO H'] === 10);
  const r2 = f(pEst, 'l-2', 0, 'a-202');
  ok('qty 0 del apto no entra', !!r2 && !('CLAVO H' in r2) && r2['CANAL X'] === 60);
  ok('apto inexistente → null', f(pEst, 'l-2', 0, 'a-999') === null);
  ok('receta no estándar → null', f({ materiales:{ recetaV2:{ version:3, niveles:{ 'l-2':{0:[{m:'X',aptos:{'a-201':5}}]} } } } }, 'l-2', 0, 'a-201') === null);
}

// ── 2. _coberturaAptosEtapa ──
const srcCob = extractFn('_coberturaAptosEtapa');
ok('_coberturaAptosEtapa existe', !!srcCob);
if (srcCob) {
  // v991: la cobertura usa _pedidoCubre (lo RECIBIDO manda sobre lo pedido)
  /* v1136: la cobertura resta las devoluciones por trasiego — se extrae también esa función
     para que el test corra sobre el código real (acá no hay trasiegos, así que no resta nada) */
  const g = new Function(extractFn('_pedidoCubre') + '\n' + extractFn('_devolucionesDeEtapa') + '\n' + srcCob + '\nreturn _coberturaAptosEtapa;')();
  const cob = g([ pdApto('a-201', { 'CANAL X': 50 }), pdApto('a-202', { 'CANAL X': 60 }), pdNivel({ [POSTE]: 424 }) ], 'l-2', 0);
  ok('suma cantidades por apto', cob['CANAL X'] && cob['CANAL X'].total === 110);
  ok('marca los aptos pedidos', cob['CANAL X'].porApto['a-201'] === true && cob['CANAL X'].porApto['a-202'] === true);
  /* v1036: el pedido de NIVEL ahora SÍ suma su cantidad (así 70 de 100 deja 30 disponibles),
     pero NO marca ningún apto — porApto sigue siendo territorio de los pedidos por apto */
  ok('los pedidos de NIVEL suman cantidad sin marcar aptos', cob[POSTE] && cob[POSTE].total === 424 && Object.keys(cob[POSTE].porApto).length === 0);
  ok('otro nivel/etapa → vacío', Object.keys(g([ pdApto('a-201', {'CANAL X':50}) ], 'l-9', 0)).length === 0);
}

// ── 3. _itemsYaPedidosEtapa: el pedido por apto NO cierra la clave a nivel ──
const srcYa = extractFn('_itemsYaPedidosEtapa');
if (srcYa) {
  const h = new Function(srcYa + '\nreturn _itemsYaPedidosEtapa;')();
  const ya = h([ pdApto('a-201', { 'CANAL X': 50 }), pdNivel({ [POSTE]: 424 }) ], 'l-2', 0);
  ok('pedido por APTO no cierra la clave', !ya['CANAL X']);
  /* v1036: con recetaQty la clave ya NO se cierra por binario — la resta por cantidades hace
     el trabajo (y si cubrió todo, qtyFinal<=0 la saca igual). El binario quedó para los
     pedidos viejos sin recetaQty. */
  ok('pedido de NIVEL con recetaQty ya no cierra por binario', !ya[POSTE]);
  const yaViejo = h([ { esDeReceta:true, recetaLevelId:'l-2', recetaEtapaIdx:0, items:{ [POSTE]: 424 }, recetaKeys:[POSTE] } ], 'l-2', 0);
  ok('pedido VIEJO sin recetaQty sí la cierra', yaViejo[POSTE] === true);
} else { ok('_itemsYaPedidosEtapa extraída', false); }

// ── 4. _etapaItemsParaPedir: nivel resta cobertura / apto bloquea lo suyo ──
const deps = extractFn('_recetaV2EtapaNivel') + '\n' + extractFn('_recetaEtapaResuelta') + '\n'
  + extractFn('_pedidoCubre') + '\n' // v991: la cobertura cuenta lo RECIBIDO
  + extractFn('_devolucionesDeEtapa') + '\n' // v1136: y resta lo que se fue por trasiego
  + srcYa + '\n' + srcCob + '\n' + srcApto + '\n';
const srcPara = extractFn('_etapaItemsParaPedir');
if (srcPara && srcCob && srcApto) {
  const f2 = new Function(deps + srcPara + '\nreturn _etapaItemsParaPedir;')();
  const p1 = clone(pEst); p1.materiales.pedidos = [ pdApto('a-201', { 'CANAL X': 50 }) ];
  const nivel = f2(p1, T, L, 0);
  const canal = nivel.find(x => x.key === 'CANAL X');
  ok('NIVEL: resta lo pedido por apto (100−50=50)', !!canal && canal.qtyFinal === 50);
  ok('NIVEL: lo no tocado queda completo', nivel.find(x => x.key === POSTE).qtyFinal === 424);
  const p2 = clone(pEst); p2.materiales.pedidos = [ pdApto('a-201', { 'CANAL X': 50 }), pdApto('a-202', { 'CANAL X': 60 }) ];
  ok('NIVEL: cobertura total ≥ tn → la clave desaparece', !f2(p2, T, L, 0).find(x => x.key === 'CANAL X'));
  const aptoItems = f2(p1, T, L, 0, 'a-201');
  ok('APTO: lo ya pedido para ESE apto se bloquea', !aptoItems.find(x => x.key === 'CANAL X'));
  ok('APTO: cantidad = columna del apto', aptoItems.find(x => x.key === POSTE).qtyFinal === 200);
  const otroApto = f2(p1, T, L, 0, 'a-202');
  /* v1036: el apto se CAPA al saldo del nivel. El nivel de CANAL X es 100 y a-201 ya pidió 50:
     al a-202 le tocan 50 aunque su columna diga 60 — pedirle 60 sería comprar de más. */
  ok('APTO: otro apto sigue libre, capado al saldo del nivel', otroApto.find(x => x.key === 'CANAL X').qtyFinal === 50);
  const p3 = clone(pEst); p3.materiales.pedidos = [ pdNivel({ [POSTE]: 424 }) ];
  ok('APTO: clave cerrada a nivel bloquea el apto', !f2(p3, T, L, 0, 'a-201').find(x => x.key === POSTE));
} else { ok('_etapaItemsParaPedir + deps extraídas', false); }

// ── 5. _ocMedidaEspecialMetros ──
const srcMts = extractFn('_ocMedidaEspecialMetros');
ok('_ocMedidaEspecialMetros existe', !!srcMts);
if (srcMts) {
  const m = new Function(srcMts + '\nreturn _ocMedidaEspecialMetros;')();
  ok('parsea los metros del sufijo', m("POSTE DE 2½\" X 9.19' (0.35) CAL. 26 (MEDIDA ESPECIAL 2.8 m)") === 2.8);
  ok('nombre normal → null', m('CANAL DE AMARRE 2½"') === null);
}

// ── 6. cableado ──
const srcPedir = extractFn('pedirEtapaCompleta');
ok('pedirEtapaCompleta acepta opts (apto/postes)', /opts = opts \|\| \{\}/.test(srcPedir));
ok('pedirEtapaCompleta guarda recetaQty', /recetaQty/.test(srcPedir));
ok('pedirEtapaCompleta guarda recetaAptoId', /recetaAptoId/.test(srcPedir));
ok('pedirEtapaCompleta: modo apto usa la columna del apto', /_recetaV2EtapaNivelPorApto\(/.test(srcPedir));
ok('pedirEtapaCompleta: filtro solo postes', /soloPostes/.test(srcPedir));
ok('pedirEtapaCompleta: nivel resta cobertura por apto', /_coberturaAptosEtapa\(/.test(srcPedir));
const srcRender = extractFn('renderRecetaPedir');
ok('BUGFIX VLA: gate del botón usa la receta RESUELTA', /_recetaEtapaItemKeys\(p, t, l, i\)/.test(srcRender));
ok('el botón abre el menú de modos', /_abrirMenuPedirEtapa\(/.test(srcRender));
ok('menú de modos existe', !!extractFn('_abrirMenuPedirEtapa'));
ok('selector por apartamento existe', !!extractFn('_abrirSelectorAptoEtapa'));
const srcAuto = extractFn('autoAssignOcProviders');
ok('OC: pre-llena último precio de postes a medida', /postesPrecioMedida/.test(srcAuto));
const srcGen = extractFn('generarOrdenCompra');
ok('OC: guarda el último precio al generar', /postesPrecioMedida/.test(srcGen));
const srcOcRender = extractFn('renderOcItems');
ok('OC: badge A MEDIDA · PRECIO MANUAL', /A MEDIDA · PRECIO MANUAL/.test(srcOcRender));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
