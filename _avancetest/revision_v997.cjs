/* v997 — arreglos de la revisión adversarial de v996 (31 hallazgos, varios críticos con la
   versión YA en producción). Cada bloque fija un defecto concreto:

   1. _consolidarRecepcionPedido trataba rec.items como ARRAY, pero la recepción lo graba
      como MAPA nombre→cantidad ⇒ el recibo consolidado salía vacío / rompía.
   2. _healPedidosRecibidos (v995) cerraba el pedido como RECIBIDO con la PRIMERA entrega,
      matando los botones "RECIBÍ DE X" de los proveedores que faltaban.
   3. 'parcial' mezclaba dos cosas distintas: "lo que llegó vino incompleto" (libera el
      candado, v991) y "todavía falta llegar otra OC" (ese material YA está comprado). Con
      la mezcla, la receta re-ofrecía material en camino y se pedía dos veces.
   4. pd.recepciones se perdía en el union-merge: _mergeById resuelve el pedido ENTERO por
      _ts, así que dos supervisores firmando entregas distintas se pisaban.
   5. Elegir presentación sacaba de BODEGA CENTRAL un material de despacho y lo convertía en
      compra; perdía la ESPECIFICACIÓN obligatoria del pedido; y al deseleccionar dejaba el
      precio y el proveedor de la presentación anterior.
   6. El filtro de OC vivas miraba `estatus` (campo de otro módulo) en vez de `status`.
   7. El número del comprobante salía de la POSICIÓN en el array: un recibo ya firmado podía
      renumerarse al borrarse otra orden o al reordenar el sync.
   8. _numLimpio corría global y podía comerse los ceros del NOMBRE del proyecto manual.
   9. El nombre del proyecto y el apto (texto libre del formulario) se inyectaban sin escapar. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const OCS = [
  { id:'o1', pedidoId:'p1', numero:'VLA – 2 - OC 1', proveedorNombre:'SISTEGUA', status:'AUTORIZADA', items:[] },
  { id:'o2', pedidoId:'p1', numero:'VLA – 2 - OC 2', proveedorNombre:'NOVEX',    status:'AUTORIZADA', items:[] }
];
const zE = ex('function _pedidoEntregas(');
const zC = ex('function _consolidarRecepcionPedido(');
let fE=null, fC=null;
try { fE = new Function('return (' + zE + ')')(); } catch(e){}
try { fC = new Function(zE + '\nreturn (' + zC + ')')(); } catch(e){}

// ── 1. items es un MAPA y se SUMA ──
if (fC) {
  const pd = { id:'p1', recepciones:{
    o1:{ ts:10, items:{ 'CLAVO 1"':100, 'TORNILLO':5 }, recetaRecibido:{ A:100 }, parcial:false },
    o2:{ ts:20, items:{ 'CLAVO 1"':50 },                 recetaRecibido:{ B:10 },  parcial:false }
  }};
  const c = fC(pd, OCS);
  ok('el consolidado suma las cantidades por material', c && c.items['CLAVO 1"'] === 150 && c.items['TORNILLO'] === 5);
  ok('sigue siendo un MAPA (lo que lee el recibo)', c && !Array.isArray(c.items) && typeof c.items === 'object');
  ok('suma también las claves de receta', c && c.recetaRecibido.A === 100 && c.recetaRecibido.B === 10);
} else ok('_consolidarRecepcionPedido evaluable', false);

// ── 3. parcial vs faltanEntregas ──
if (fC) {
  const soloUna = { id:'p1', recepciones:{ o1:{ ts:10, items:{}, recetaRecibido:{A:100}, parcial:false } } };
  const c1 = fC(soloUna, OCS);
  ok('falta una OC ⇒ faltanEntregas, NO parcial', c1.faltanEntregas === true && c1.parcial === false);
  const incompleta = { id:'p1', recepciones:{
    o1:{ ts:10, items:{}, recetaRecibido:{A:60}, parcial:true },
    o2:{ ts:20, items:{}, recetaRecibido:{B:10}, parcial:false } } };
  const c2 = fC(incompleta, OCS);
  ok('llegaron todas pero una incompleta ⇒ parcial sin faltanEntregas', c2.parcial === true && c2.faltanEntregas === false);
  ok('el consolidado informa el avance', c2.entregasTotal === 2 && c2.entregasRecibidas === 2);
}
// lo que consume ese flag
const zCubre = ex('function _pedidoCubre(');
let fCubre = null;
try { fCubre = new Function('return (' + zCubre + ')')(); } catch(e){}
if (fCubre) {
  const pdFalta = { recetaQty:{ A:100 }, recepcion:{ faltanEntregas:true, recetaRecibido:{ A:40 } } };
  ok('mientras falte una entrega, el pedido cubre lo PEDIDO (no se re-pide lo comprado)', fCubre(pdFalta).A === 100);
  const pdTodo = { recetaQty:{ A:100 }, recepcion:{ faltanEntregas:false, recetaRecibido:{ A:40 } } };
  ok('con todo entregado manda lo RECIBIDO (v991)', fCubre(pdTodo).A === 40);
}
const zYa = ex('function _itemsYaPedidosEtapa(');
ok('el candado solo se libera con faltante REAL', /pd\.recepcion\.parcial && !pd\.recepcion\.faltanEntregas/.test(zYa));
ok('y no se suelta al confirmar mientras falten entregas', /parcial && !\(pd\.recepcion && pd\.recepcion\.faltanEntregas\)/.test(ex('window._recepcionConfirmar = async function')));

// ── 2. el self-heal no cierra pedidos incompletos ──
const zHeal = ex('function _healPedidosRecibidos(');
ok('el self-heal respeta las entregas pendientes', /if \(pd\.recepcion\.faltanEntregas\) return;/.test(zHeal));
let fH = null;
try { fH = new Function('getPedidoOrdenes', '_pedidoEntregas', '_consolidarRecepcionPedido', 'return (' + zHeal + ')')(undefined, fE, fC); } catch(e){}
if (fH) {
  const peds = [
    { id:'a', status:'APROBADO', recepcion:{ ts:1, faltanEntregas:true } },   // multi-OC a medias
    { id:'b', status:'APROBADO', recepcion:{ ts:1 } }                          // recibido de una
  ];
  fH(peds);
  ok('un pedido con entregas pendientes NO se cierra', peds[0].status === 'APROBADO');
  ok('uno ya completo sí se corrige', peds[1].status === 'RECIBIDO');
}
ok('el consolidado se recalcula si una entrega entró por sync', /entregasRecibidas !== _entH\.recibidas/.test(zHeal));

// ── 4. union-merge de entregas ──
const zM = ex('function _mergeRecepciones(');
ok('existe _mergeRecepciones', !!zM);
let fM = null;
try { fM = new Function('return (' + zM + ')')(); } catch(e){}
if (fM) {
  const local  = [{ id:'p1', recepciones:{ o1:{ ts:100 } } }];
  const remoto = [{ id:'p1', recepciones:{ o2:{ ts:200 } } }];
  fM(local, remoto);
  ok('las entregas de los dos dispositivos se conservan', remoto[0].recepciones.o1 && remoto[0].recepciones.o2);
  const l2 = [{ id:'p1', recepciones:{ o1:{ ts:300, porNombre:'NUEVA' } } }];
  const r2 = [{ id:'p1', recepciones:{ o1:{ ts:100, porNombre:'VIEJA' } } }];
  fM(l2, r2);
  ok('en la misma OC gana la firma más reciente', r2[0].recepciones.o1.porNombre === 'NUEVA');
  const r3 = [{ id:'p1' }];
  fM([{ id:'p1', recepciones:{ o1:{ ts:1 } } }], r3);
  ok('si el remoto no tenía entregas, se agregan', r3[0].recepciones && r3[0].recepciones.o1);
  ok('se llama desde applyRemote', /_mergeRecepciones\(\(lp && lp\.materiales/.test(html));
}

// ── 5. variantes ──
const zUV = ex('window.updateOcItemVariante = function');
ok('no convierte un despacho de bodega en compra', /item\.esBodega \|\| item\.proveedorId === '_bodega'/.test(zUV));
ok('conserva la especificación del pedido', /varianteSpec/.test(zUV) && /varianteSpec/.test(ex('function buildPedidoOcItems(')));
ok('al deseleccionar vuelve al nombre de compra, no al interno', /varianteNombreBase/.test(zUV));
ok('sin match limpia precio Y proveedor (no cobra otra presentación)', /item\.proveedorId = '';/.test(zUV) && /item\.eventual = true;/.test(zUV));

// ── 6. filtro de OC vivas ──
/* v1017 reescribió el filtro con returns explícitos al excluir las órdenes de producción */
ok('el filtro mira status (no solo estatus)', /o\.status === 'CANCELADA'/.test(zE) && /o\.estatus === 'CANCELADA'/.test(zE));

// ── 7. número de comprobante congelado ──
ok('la entrega guarda su número al firmar', /_entrega\.seq = /.test(ex('window._recepcionConfirmar = async function')));
ok('y el listado respeta el guardado', /\(r && r\.seq\) \? r\.seq :/.test(zE));

// ── 8. _numLimpio acotado al correlativo ──
const zNL = ex('function _numLimpio(');
let fNL = null;
try { fNL = new Function('return (' + zNL + ')')(); } catch(e){}
if (fNL) {
  ok('no toca los ceros del nombre del proyecto', fNL('CASA 007 – 00002') === 'CASA 007 – 2');
  ok('sigue limpiando el correlativo y la OC', fNL('VLA – 00002 - OC 00002') === 'VLA – 2 - OC 2');
  ok('el documento de la OC también lo usa', /_numLimpio\(String\(\(oc && oc\.numero\)/.test(ex('function _ocNumeroPartes(')));
}

// ── 10. la numeración de BODEGA también rellena huecos (queja de Antonio: quedó "BODEGA – 2"
//        siendo el único pedido, porque el 1 se había eliminado) ──
const zBN = ex('function _bodegaNextNum(');
let fBN = null;
try { fBN = new Function(ex('function _primerNumeroLibre(') + '\nreturn (' + zBN + ')')(); } catch(e){}
if (fBN) {
  ok('bodega sin pedidos arranca en 1', fBN([]) === 1);
  ok('si se eliminó el 1, el siguiente vuelve a ser 1', fBN([{numero:'BODEGA – 2'}]) === 1);
  ok('con 1 y 2 sigue el 3', fBN([{numero:'BODEGA – 1'},{numero:'BODEGA – 2'}]) === 3);
  ok('rellena el hueco del medio', fBN([{numero:'BODEGA – 1'},{numero:'BODEGA – 3'}]) === 2);
} else ok('_bodegaNextNum evaluable', false);

// ── 9. XSS del texto libre ──
const zCard = ex('function renderPedidoCard(');
ok('el proyecto del pedido va escapado', /esc\(pd\.proyectoPedido \|\| p\.name\)/.test(zCard));
ok('el apto también', /esc\(pd\.apto\)/.test(zCard));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
