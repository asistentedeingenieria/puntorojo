/* v996 (pedido de Antonio 27-jul): un pedido se reparte en varias órdenes de compra y cada
   proveedor entrega por su cuenta, otro día. Con UNA sola recepción por pedido el
   supervisor tenía que esperar a que llegara todo para firmar una vez, y el proveedor que
   llegaba primero se quedaba sin comprobante.

   DISEÑO (elegido por Antonio): se recibe POR ORDEN DE COMPRA.
     · cada entrega se guarda en pd.recepciones[ocId] con su firma, fecha, hora y ENTREGÓ,
       y emite su comprobante REC <pedido>-<n>;
     · va DENTRO del pedido (no en la orden) porque los pedidos ya viajan por union-merge
       con sello _ts (v972) — así dos supervisores firmando a la vez no se pisan;
     · pd.recepcion queda como el CONSOLIDADO de todas las entregas, así _pedidoCubre, la
       cobertura de receta y el candado de etapa (v991) siguen funcionando sin cambios;
     · el pedido pasa a RECIBIDO EN OBRA cuando TODAS sus OCs vivas están recibidas;
     · firma el solicitante O el encargado de esa obra (o admin). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const OCS = [
  { id:'o1', pedidoId:'p1', numero:'VLA – 2 - OC 1', proveedorNombre:'SISTEGUA', estatus:'ACTIVA', status:'AUTORIZADA', items:[{name:'A',qty:100,sourceKey:'k1'}] },
  { id:'o2', pedidoId:'p1', numero:'VLA – 2 - OC 2', proveedorNombre:'NOVEX',    estatus:'ACTIVA', status:'AUTORIZADA', items:[{name:'B',qty:10,sourceKey:'k2'}] }
];

// ── 1. estado de entregas (PURA) ──
const zE = ex('function _pedidoEntregas(');
ok('existe _pedidoEntregas', !!zE);
let fE = null;
try { fE = new Function('return (' + zE + ')')(); } catch(e){}
if (fE) {
  const r0 = fE({ id:'p1' }, OCS);
  ok('cuenta una entrega por orden de compra', r0.total === 2 && r0.recibidas === 0 && !r0.completo);
  ok('lista las pendientes con su proveedor', r0.pendientes.length === 2 && r0.pendientes[0].proveedorNombre === 'SISTEGUA');
  ok('numera las entregas para el comprobante (1, 2…)', r0.pendientes[0].seq === 1 && r0.pendientes[1].seq === 2);
  const pd1 = { id:'p1', recepciones:{ o1:{ ts:1 } } };
  const r1 = fE(pd1, OCS);
  ok('con una recibida cuenta 1 de 2', r1.recibidas === 1 && !r1.completo);
  ok('la pendiente que queda es la del otro proveedor', r1.pendientes.length === 1 && r1.pendientes[0].proveedorNombre === 'NOVEX');
  ok('la entrega recibida conserva su número', (r1.recibidasList || []).length === 1 && r1.recibidasList[0].seq === 1);
  const pd2 = { id:'p1', recepciones:{ o1:{ ts:1 }, o2:{ ts:2 } } };
  ok('con todas recibidas queda completo', fE(pd2, OCS).completo === true);
  const ocsCanc = [OCS[0], Object.assign({}, OCS[1], { estatus:'CANCELADA' })];
  ok('una OC cancelada no frena el pedido', fE({ id:'p1' }, ocsCanc).total === 1);
  ok('pedido sin OCs devuelve total 0 y NO completo', fE({ id:'zz' }, OCS).total === 0 && !fE({ id:'zz' }, OCS).completo);
}

// ── 2. consolidado del pedido (PURA) ──
const zC = ex('function _consolidarRecepcionPedido(');
ok('existe _consolidarRecepcionPedido', !!zC);
let fC = null;
// depende de _pedidoEntregas: se le inyecta la misma implementación
try { fC = new Function(zE + '\nreturn (' + zC + ')')(); } catch(e){}
if (fC) {
  const pdA = { id:'p1', recepciones:{
    o1:{ ts:10, por:'rony', porNombre:'RONY RIVERA', entregoNombre:'SISTEGUA', recetaRecibido:{ A:60, B:10 }, items:[{name:'A',qty:60}], parcial:true },
    o2:{ ts:20, por:'rony', porNombre:'RONY RIVERA', entregoNombre:'NOVEX',    recetaRecibido:{ A:40 },       items:[{name:'B',qty:10}], parcial:false }
  }};
  const c = fC(pdA, OCS);
  ok('suma lo recibido de todas las entregas por clave de receta', c && c.recetaRecibido.A === 100 && c.recetaRecibido.B === 10);
  ok('se queda con la fecha/hora de la ÚLTIMA entrega', c && c.ts === 20);
  ok('junta las líneas de todas las entregas', c && c.items.length === 2);
  const pdB = { id:'p1', recepciones:{ o1:{ ts:10, recetaRecibido:{ A:60 }, items:[], parcial:true } } };
  ok('falta una entrega ⇒ el consolidado es PARCIAL (libera el candado v991)', fC(pdB, OCS).parcial === true);
  const pdC = { id:'p1', recepciones:{
    o1:{ ts:10, recetaRecibido:{ A:100 }, items:[], parcial:false },
    o2:{ ts:11, recetaRecibido:{ B:10 },  items:[], parcial:false }
  }};
  ok('todas completas ⇒ el consolidado NO es parcial', fC(pdC, OCS).parcial === false);
  ok('sin ninguna entrega devuelve null', fC({ id:'p1' }, OCS) === null);
}

// ── 3. quién puede firmar (PURA) ──
const zP = ex('function _puedeRecibirEntrega(');
ok('existe _puedeRecibirEntrega', !!zP);
let fP = null;
try { fP = new Function('return (' + zP + ')')(); } catch(e){}
if (fP) {
  const pd = { solicitanteUsername:'rony' };
  ok('el solicitante puede', fP(pd, { username:'RONY' }, 'vla', false) === true);
  ok('el encargado de ESA obra puede', fP(pd, { username:'julio', obraAsignada:'vla' }, 'vla', false) === true);
  ok('el encargado de OTRA obra no', fP(pd, { username:'julio', obraAsignada:'essenza' }, 'vla', false) === false);
  ok('un tercero sin nada no', fP(pd, { username:'otro' }, 'vla', false) === false);
  ok('el admin siempre', fP(pd, { username:'otro' }, 'vla', true) === true);
  ok('sin usuario no', fP(pd, null, 'vla', false) === false);
}

// ── 4. cableado ──
ok('el modal de recepción se abre para UNA orden', /window\._abrirRecepcion = async function\(id, ocId\)/.test(html));
ok('la entrega se guarda en pd.recepciones[ocId]', /recepciones\[/.test(ex('window._recepcionConfirmar = async function')));
ok('el pedido consolida tras cada entrega', /_consolidarRecepcionPedido\(/.test(ex('window._recepcionConfirmar = async function')));
ok('el pedido sella _ts (union-merge v972)', /pd\._ts = Date\.now\(\)/.test(ex('window._recepcionConfirmar = async function')));
ok('solo pasa a RECIBIDO cuando están TODAS', /completo/.test(ex('window._recepcionConfirmar = async function')));
const zCard = ex('function renderPedidoCard(');
ok('la tarjeta muestra el avance de entregas', /DE \$\{_e\.total\} ENTREGAS RECIBIDAS/.test(zCard) && /_pedidoEntregas\(/.test(zCard));
ok('cada entrega recibida tiene su propio comprobante en la tarjeta', /imprimirRecibo\('\$\{pd\.id\}','\$\{x\.id\}'\)/.test(zCard));
ok('con un solo proveedor no cambia nada (botón de siempre)', /_ent\.total > 1/.test(zCard) && /YA RECIBÍ EL MATERIAL/.test(zCard));
ok('el comprobante numera la entrega (REC 2-1)', /_reciboDocHTML\(pd, p, paraCaptura, ocId\)|entregaSeq/.test(html));
ok('el recibo de una entrega muestra SU proveedor como quien entregó', /entregoNombre/.test(ex('function _reciboDocHTML(')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
