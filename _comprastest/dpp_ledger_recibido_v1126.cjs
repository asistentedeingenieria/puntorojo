/* v1126 — LOS DOS BUGS QUE SALIERON AL MAPEAR EL CIRCUITO (Antonio: "arregla los dos")

   ── BUG 1: SALDO FANTASMA EN LA BODEGA CENTRAL ──
   La orden madre COMPRA ANTICIPADA está EXCLUIDA de la recepción en bodega (v1089): nunca
   genera ENTRADA en state.bodegaMovs. Pero sus despachos hijos SÍ generaban SALIDA al
   autorizarse, porque _bodegaSalidaDespacho filtra por `oc.esDespacho` y eso no distingue un
   despacho de bodega (serie DESP, que sí tuvo entrada) de uno pre-pago (que nunca la tuvo).
   Resultado: el ledger resta material que jamás estuvo en la bodega central y el saldo se va a
   NEGATIVO. Como el rojo del panel es la señal de comprar, manda a comprar lo que YA está
   pagado. Es la contradicción entre v1061 (que quería la SALIDA) y v1089.

   El material pre-pagado no pasa por la bodega central: va del proveedor a la obra. Su cuenta
   vive en el panel BODEGA PRE-PAGO (saldo por liberar), que es otra contabilidad.

   DOS PARTES, porque los despachos ya autorizados YA escribieron su SALIDA:
   (a) hacia adelante: no se escribe;
   (b) hacia atrás: el saldo es DERIVADO (no hay contador mutable), así que las SALIDAS viejas
       se IGNORAN al derivar. Nada que borrar, ningún tombstone, ningún dato tocado — el mismo
       criterio de self-heal de v1064 ("campo derivable ⇒ sanar desde la estructura dueña").

   ── BUG 2: EL DESPACHO NO TENÍA ACUSE DE RECIBIDO EN LA OBRA ──
   Desde v1125 el despacho se ve en las OC de la obra, pero sin forma de confirmar que llegó:
   el botón MARCAR RECIBIDO exige !oc.esDespacho porque suma existencias a la BODEGA CENTRAL,
   que no es lo que pasa acá. El despacho necesita su propio acuse: confirma que el material
   llegó A LA OBRA, sin tocar el ledger de bodega. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— BUG 1a: el despacho pre-pago ya NO descuenta de la bodega central —');
const zS = ex(code, 'function _bodegaSalidaDespacho(');
ok('existe la salida de despacho', zS.length > 100);
let salida = null;
try {
  salida = new Function('state','window','_bodegaMovsList','_bodegaMov','_ocSerieDe',
    zS + '\nreturn _bodegaSalidaDespacho;');
} catch(e){ console.log('   (no compiló: ' + e.message + ')'); }
if (salida) {
  const corre = oc => {
    const movs = [];
    const st = { bodegaMovs: movs };
    const win = { _bodegaYaTieneMov: (ms, id, t) => ms.some(m => m.tipo === t && m.ref && m.ref.ocId === id) };
    /* la serie real se deduce de los flags cuando el campo no existe (_ocSerieDe en la app) */
    const serieDe = o => String((o && o.serie) || (o && o.esPrepago ? 'DPP' : '') || (o && o.esTrasiego ? 'TRAS' : '') || 'OC');
    salida(st, win, () => movs, (tipo, name, qty, ref) => ({ tipo, name, qty, ref }), serieDe)(oc);
    return movs;
  };
  const items = [{ name:'TABLA ULTRALIGHT', qty:40 }];
  ok('un despacho PRE-PAGO no escribe SALIDA', corre({ id:'d1', esDespacho:true, esPrepago:true, items }).length === 0);
  ok('tampoco por serie DPP (aunque falte el flag)', corre({ id:'d2', esDespacho:true, serie:'DPP', items }).length === 0);
  ok('un TRASIEGO tampoco (es obra→obra, no sale de la bodega central)',
    corre({ id:'t1', esDespacho:true, esTrasiego:true, items }).length === 0);
  ok('el despacho NORMAL de bodega SÍ sigue descontando (ese material sí entró)',
    corre({ id:'x1', esDespacho:true, serie:'DESP', items }).length === 1);
  ok('y una orden que no es despacho no toca el ledger', corre({ id:'o1', items }).length === 0);
}

console.log('\n— BUG 1b: las SALIDAS ya escritas dejan de restar (self-heal) —');
const zB = ex(code, 'window._bodegaSaldos = function(');
ok('el saldo acepta la lista de despachos a ignorar', /function\s*\(\s*movs\s*,/.test(zB) || /_bodegaSalidasFantasma|ignorar/.test(zB));
let saldos = null;
try { saldos = new Function('_bodegaSalidasFantasma', 'var window={};' + zB + '\nreturn window._bodegaSaldos;'); } catch(e){ console.log('   (' + e.message + ')'); }
if (saldos) {
  const f = saldos(() => ({ 'd1': true }));
  const MOVS = [
    { k:'TABLA', name:'TABLA', tipo:'ENTRADA', qty:100 },
    { k:'TABLA', tipo:'SALIDA', qty:40, ref:{ ocId:'d1' } },   // despacho PRE-PAGO: fantasma
    { k:'TABLA', tipo:'SALIDA', qty:10, ref:{ ocId:'x1' } },   // despacho normal: sí resta
  ];
  const r = f(MOVS);
  ok('la salida del pre-pago no resta', r.TABLA.saldo === 90);
  ok('la del despacho normal sí', f([MOVS[0], MOVS[2]]).TABLA.saldo === 90);
  ok('el caso de Antonio: sin entrada previa, el saldo NO se va a negativo',
    f([{ k:'T', tipo:'SALIDA', qty:40, ref:{ ocId:'d1' } }]).T === undefined
    || f([{ k:'T', tipo:'SALIDA', qty:40, ref:{ ocId:'d1' } }]).T.saldo === 0);
  ok('ENTRADA y AJUSTE siguen igual',
    f([{k:'A',tipo:'ENTRADA',qty:5},{k:'A',tipo:'AJUSTE',qty:-2}]).A.saldo === 3);
  ok('sin lista de fantasmas no revienta', typeof saldos(null)([{k:'A',tipo:'ENTRADA',qty:1}]).A.saldo === 'number');
}
ok('existe el derivador de salidas fantasma', ex(code, 'function _bodegaSalidasFantasma(').length > 80);
ok('se apoya en la fuente global de órdenes', /_dppOrdenesGlobal\(\)/.test(ex(code, 'function _bodegaSalidasFantasma(')));
ok('NO borra movimientos ni escribe tombstones',
  !/bodegaMovsEliminados/.test(ex(code, 'function _bodegaSalidasFantasma(')));

console.log('\n— BUG 2: el acuse de recibido EN LA OBRA —');
const zM = ex(code, 'window._dppMarcarRecibido = async function(');
ok('existe la acción', zM.length > 300);
ok('pide confirmación antes de sellar', /prConfirm/.test(zM));
ok('sella quién y cuándo', /recibidoObra/.test(zM) && /ts:/.test(zM) && /por:/.test(zM));
ok('sella _ts (el contenedor viaja por union-merge)', /_ts\s*=/.test(zM));
ok('sube el cambio de inmediato', /forceUploadNow/.test(zM));
ok('re-lee la orden después del await (patrón v769/v940)',
  zM.indexOf('_bodegaFindOc') !== zM.lastIndexOf('_bodegaFindOc'));
ok('NO toca el ledger de la bodega central', !/_bodegaSalidaDespacho|_bodegaMovsList|bodegaMovs/.test(zM));
ok('no se puede marcar dos veces', /YA (ESTABA|FUE) (MARCADO|RECIBIDO)|ya recibido/i.test(zM));
ok('solo cuando ya está autorizado', /AUTORIZADA/.test(zM));

const zR = ex(code, 'function renderOrdenesList(');
ok('el botón sale en la fila del despacho', /_dppMarcarRecibido\(/.test(zR));
ok('dice lo mismo que en los pedidos', /YA RECIBÍ EL MATERIAL/.test(zR));
ok('y una vez marcado se ve quién lo recibió', /RECIBIDO EN OBRA/.test(zR));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
