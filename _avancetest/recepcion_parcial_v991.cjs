/* v991 (decisiones de Antonio 27-jul):
   1. RECEPCIÓN PARCIAL RE-PEDIBLE: lo que no llegó vuelve a estar disponible en PEDIR DE
      RECETA. La cobertura deja de contar lo PEDIDO y cuenta lo RECIBIDO: un pedido con
      recepción parcial no cierra sus claves (_itemsYaPedidosEtapa) y su cantidad recibida
      entra a la resta de cantidades (_coberturaAptosEtapa) → disponible = total − recibido.
   2. El recibo lleva una segunda línea ENTREGÓ (piloto/proveedor que llevó el material). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── helpers puros de cobertura ──
const zC = ex('function _pedidoCubre(');
ok('_pedidoCubre existe (zona pura)', !!zC);
let fC = null;
try { fC = new Function('return (' + zC + ')')(); } catch(e){}
if (fC) {
  ok('sin recepción cubre lo PEDIDO', JSON.stringify(fC({ recetaQty:{ A:100 } })) === JSON.stringify({ A:100 }));
  ok('con recepción parcial cubre lo RECIBIDO', JSON.stringify(fC({ recetaQty:{ A:100 }, recepcion:{ parcial:true, recetaRecibido:{ A:60 } } })) === JSON.stringify({ A:60 }));
} else ok('_pedidoCubre evaluable', false);

// ── la cobertura y el "ya pedido" respetan la recepción ──
const zCob = ex('function _coberturaAptosEtapa(');
let fCob = null;
try { fCob = new Function('_pedidoCubre', 'return (' + zCob + ')'); } catch(e){}
if (fCob) {
  const cubre = pd => (pd.recepcion && pd.recepcion.recetaRecibido) || pd.recetaQty || {};
  const f = fCob(cubre);
  // pedido de NIVEL con recepción parcial: su recibido entra a la resta
  const r1 = f([{ esDeReceta:true, recetaLevelId:'l2', recetaEtapaIdx:0, recetaQty:{ A:100 }, recepcion:{ parcial:true, recetaRecibido:{ A:60 } } }], 'l2', 0);
  ok('el pedido de NIVEL parcial suma su RECIBIDO a la cobertura', r1.A && r1.A.total === 60);
  /* v1036: el pedido de nivel CON recetaQty ahora SÍ entra a la resta por cantidades — es lo
     que permite pedir 70 de 100 y que después se ofrezca solo la diferencia. El binario quedó
     únicamente para los pedidos viejos sin recetaQty (pre-v909). */
  const r2 = f([{ esDeReceta:true, recetaLevelId:'l2', recetaEtapaIdx:0, recetaQty:{ A:100 } }], 'l2', 0);
  ok('el pedido de nivel normal SÍ entra a la resta (v1036: por cantidad)', r2.A && r2.A.total === 100);
  const r2b = f([{ esDeReceta:true, recetaLevelId:'l2', recetaEtapaIdx:0, items:{ A:100 } }], 'l2', 0);
  ok('el pedido VIEJO sin recetaQty sigue fuera (lo cierra el binario)', !r2b.A);
  // pedido POR APTO sigue igual
  const r3 = f([{ esDeReceta:true, recetaAptoId:'ap1', recetaLevelId:'l2', recetaEtapaIdx:0, recetaQty:{ A:25 } }], 'l2', 0);
  ok('los pedidos POR APTO siguen sumando como antes', r3.A && r3.A.total === 25 && r3.A.porApto.ap1);
} else ok('_coberturaAptosEtapa evaluable', false);

const zYa = ex('function _itemsYaPedidosEtapa(');
let fYa = null;
try { fYa = new Function('return (' + zYa + ')')(); } catch(e){}
if (fYa) {
  const pedNormal = { esDeReceta:true, recetaLevelId:'l2', recetaEtapaIdx:0, items:{ A:100 }, recetaKeys:['A'] };
  ok('sin recepción, la clave queda CERRADA (como siempre)', fYa([pedNormal], 'l2', 0).A === true);
  const pedParcial = Object.assign({}, pedNormal, { recepcion:{ parcial:true, recetaRecibido:{ A:60 } } });
  ok('con recepción PARCIAL la clave se libera (vuelve a pedirse el faltante)', !fYa([pedParcial], 'l2', 0).A);
  const pedCompleto = Object.assign({}, pedNormal, { recepcion:{ parcial:false, recetaRecibido:{ A:100 } } });
  ok('con recepción COMPLETA sigue cerrada', fYa([pedCompleto], 'l2', 0).A === true);
} else ok('_itemsYaPedidosEtapa evaluable', false);

// ── al confirmar se guarda lo recibido POR CLAVE DE RECETA y se libera el candado ──
const zConf = ex('window._recepcionConfirmar = async function');
ok('guarda recetaRecibido mapeando a las claves de receta', /recetaRecibido/.test(zConf) && /_nombreCompraConMedida/.test(zConf));
ok('libera el candado de etapa si quedó faltante', /_recetaLiberarCandadoEtapa\(/.test(zConf));
ok('la línea guarda su sourceKey para el mapeo', /src: x\.sourceKey/.test(ex('window._abrirRecepcion = async function')));

// ── ENTREGÓ ──
ok('el modal pide quién entregó', /_recepEntrego/.test(ex('window._abrirRecepcion = async function')));
ok('se guarda entregoNombre', /entregoNombre/.test(zConf));
const zDoc = ex('function _reciboDocHTML(');
// v993: UNA firma (recibió, con fecha y hora); ENTREGÓ va en los datos, en verde, sin firma
ok('el recibo lleva la firma de quien recibe y el nombre de quien entregó', /RECIBIÓ EN OBRA/.test(zDoc) && /ENTREGÓ/.test(zDoc) && /color:#15803D/.test(zDoc));
ok('la tarjeta marca el pedido como RECIBIDO PARCIAL', /RECIBIDO PARCIAL/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
