/* v1125 — EL DESPACHO PRE-PAGO APARECE EN LAS ÓRDENES DE COMPRA DE LA OBRA (Antonio, 3-ago):
   "que también una vez generada se vaya al apartado de órdenes de compras dentro de compras
    del proyecto que se seleccionó para que finanzas lo pueda autorizar."

   HOY no aparece: renderOrdenesList lee SOLO p.materiales.ordenes, y los dos constructores de
   despachos hacen push al contenedor de la MADRE (la bodega), aunque el despacho guarde
   destinoProyectoId con la obra que recibe. No es un filtro que lo esconda: la lista nunca
   mira el contenedor donde vive.

   SE CAMBIA LA LECTURA, NO EL DATO. Mover el despacho al contenedor del proyecto obligaría a
   tocar los dos constructores, migrar los despachos existentes y pelear con el union-merge por
   contenedor de v972 (un registro que cambia de contenedor puede duplicarse o resucitar).
   Además el saldo pre-pago ya se calcula con _dppOrdenesGlobal, que barre los tres.
   El patrón a copiar ya existe y está probado: GASTOS y CUENTAS POR PAGAR barren los tres
   contenedores y deciden la pertenencia con _gastoDestinoDeOrden, no con dónde vive la orden.
   Así, la MISMA orden que ya suma al gasto de la obra pasa a verse en su lista.

   TRAMPAS QUE ESTE TEST FIJA (todas reales, salieron de leer el código):
   a) NO se puede filtrar con _pedidoEsDeEstaObra: el despacho hereda el pedidoId de la madre
      (pedido de BODEGA, de abastecimiento) y ese filtro lo rechazaría como "DE OTRO CLIENTE".
   b) Hay que deduplicar por id, porque el barrido global incluye state.projects.
   c) No se puede abrir la fuente a cualquier cosa: un TRASIEGO también es esDespacho y NO
      pertenece a la lista de órdenes de compra de la obra.
   d) El despacho nace PENDIENTE_AUTORIZACION y tiene que verse ARRIBA, no enterrado en el
      historial colapsado: con el pedidoId heredado de la madre, si ese pedido de bodega ya
      está RECIBIDO, _ocPendienteDeRecibir lo mandaría al historial y Antonio diría, con razón,
      que "sigue sin aparecer". */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zD = ex(code, 'function _despachosHaciaProyecto(');
ok('existe el buscador de despachos hacia una obra', zD.length > 120);
ok('es PURA: solo lee', !/saveState|forceUploadNow|\.push\(/.test(zD.replace(/out\.push\(/g,'')));

let f = null;
try {
  f = new Function('_dppOrdenesGlobal','_ocSerieDe','_gastoDestinoDeOrden',
    zD + '\nreturn _despachosHaciaProyecto;');
} catch(e){ console.log('   (no compiló: ' + e.message + ')'); }

if (f) {
  const serieDe = o => String((o && o.serie) || '');
  const destinoDe = o => String((o && o.destinoProyectoId) || '');
  const P = { id:'ESSENZA-F2', materiales:{ ordenes:[] } };
  /* el escenario real: despachos en el contenedor de bodega, con destino a varias obras */
  const GLOBAL = [
    { id:'d1', serie:'DPP', destinoProyectoId:'ESSENZA-F2', status:'PENDIENTE_AUTORIZACION', ts:5 },
    { id:'d2', serie:'DPP', destinoProyectoId:'VICINIA-DC', status:'PENDIENTE_AUTORIZACION', ts:4 },
    { id:'d3', serie:'DPP', destinoProyectoId:'ESSENZA-F2', status:'AUTORIZADA', ts:3 },
    { id:'t1', serie:'TRAS', destinoProyectoId:'ESSENZA-F2', status:'AUTORIZADA', ts:2 },
    { id:'o1', serie:'OC',  destinoProyectoId:'ESSENZA-F2', status:'AUTORIZADA', ts:1 },
  ];
  const g = (proj, global) => f(() => global, serieDe, destinoDe)(proj, global);

  console.log('\n— trae los despachos que van a ESTA obra —');
  const r = g(P, GLOBAL);
  ok('trae los dos de ESSENZA', r.length === 2 && r.map(o=>o.id).sort().join() === 'd1,d3');
  ok('no trae el de la otra obra', !r.some(o => o.id === 'd2'));
  ok('(c) NO trae trasiegos: no son órdenes de compra de la obra', !r.some(o => o.id === 't1'));
  ok('(c) NO trae órdenes de compra normales (esas ya vienen por su contenedor)', !r.some(o => o.id === 'o1'));

  console.log('\n— (b) sin duplicar lo que ya está en la obra —');
  const P2 = { id:'ESSENZA-F2', materiales:{ ordenes:[ GLOBAL[0] ] } };
  const r2 = g(P2, GLOBAL);
  ok('el que YA vive en la obra no se repite', r2.filter(o => o.id === 'd1').length === 0);
  ok('el otro sí entra', r2.length === 1 && r2[0].id === 'd3');

  console.log('\n— lo que no debe entrar —');
  ok('un despacho CANCELADO no se lista', g(P, GLOBAL.concat([{ id:'x', serie:'DPP', destinoProyectoId:'ESSENZA-F2', status:'CANCELADA' }])).length === 2);
  ok('sin proyecto no revienta', Array.isArray(g(null, GLOBAL)));
  ok('sin órdenes no revienta', g(P, []).length === 0);
  ok('una orden basura no lo tumba', g(P, [null, {}, { serie:'DPP' }]).length === 0);
}

console.log('\n— la lista de la obra lo usa —');
const zR = ex(code, 'function renderOrdenesList(');
ok('renderOrdenesList suma los despachos hacia esta obra', /_despachosHaciaProyecto\(/.test(zR));
ok('(a) NO los pasa por el filtro de pedido de la obra (los rechazaría como ajenos)',
  /_despachosHaciaProyecto\([\s\S]{0,400}_ordAjenas|_ordAjenas[\s\S]{0,400}_despachosHaciaProyecto\(/.test(zR));
ok('(d) un despacho pendiente de autorizar va ARRIBA, no al historial colapsado',
  /PENDIENTE_AUTORIZACION[\s\S]{0,200}_ocPend|_esDppPend|_ocPend\.push/.test(zR));

console.log('\n— finanzas lo puede autorizar desde ahí —');
const zA = ex(code, 'async function autorizarOrden(');
ok('autorizarOrden resuelve la orden en CUALQUIER contenedor', /_bodegaFindOc\(/.test(zA));
ok('exige el permiso de finanzas', /compras\.revisar/.test(zA));

console.log('\n— el badge de la pestaña cuenta lo mismo que la lista —');
const zB = ex(code, 'window._cntOCsPend = function(');
ok('el contador también mira los despachos hacia la obra', /_despachosHaciaProyecto\(/.test(zB));

console.log('\n— el despacho deja de heredar el pedido de la madre —');
const zC = ex(code, 'window._dppCrearDesdeMadre = async function(');
ok('limpia pedidoId al clonar (si no, avisa al solicitante de un pedido ajeno)', /pedidoId:\s*''/.test(zC));
ok('y pedidoNumero', /pedidoNumero:\s*''/.test(zC));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
