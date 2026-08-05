/* v1001 (reportes de Antonio 27-jul sobre la OC impresa de bodega):

   1. "¿Por qué las órdenes de compra de bodega dice proyecto OC—A?" — el documento pasa el
      proyecto por _projSiglas, que arma siglas con la inicial de cada palabra:
      "OFICINA CENTRAL — ABASTECIMIENTO" → "OC—A". En una orden de abastecimiento tiene que
      decir BODEGA CENTRAL, y la línea de Área sobra (no hay torre ni apto).

   2. "Que compras pueda EDITAR las OC de bodega si aún no están autorizadas por finanzas,
      por si se confunde." — mientras la orden esté PENDIENTE_AUTORIZACION se puede corregir;
      una vez firmada, no (es el documento que ya se mandó al proveedor). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. encabezado del documento ──
const zP = ex('function _ocProyectoLabel(');
ok('existe _ocProyectoLabel', !!zP);
let f = null;
try { f = new Function('_projSiglas', 'return (' + zP + ')')(s => String(s || '').split(/\s+/).map(w => w[0] || '').join('')); } catch(e){}
if (f) {
  ok('una OC de abastecimiento dice BODEGA CENTRAL', f({ proyecto:'OFICINA CENTRAL — ABASTECIMIENTO' }) === 'BODEGA CENTRAL');
  ok('la marcada como de bodega también', f({ proyecto:'X', esBodega:true }) === 'BODEGA CENTRAL');
  ok('y la que ya dice BODEGA', f({ proyecto:'BODEGA CENTRAL' }) === 'BODEGA CENTRAL');
  ok('un proyecto normal conserva sus siglas', f({ proyecto:'VICINIA LAS AMÉRICAS' }) === 'VLA');
  ok('sin proyecto no rompe', typeof f({}) === 'string');
}
ok('el documento usa la etiqueta, no las siglas crudas', /_ocProyectoLabel\(oc\)/.test(html));
/* v1123: el requisito CAMBIÓ. En v1001 el Área se quitó del impreso porque repetía el proyecto;
   el 4-ago Antonio pidió lo contrario para los DESPACHOS ("necesito que se pueda poner el área
   para dónde va dirigido esta plancha" — TORRE 4, NIVEL 12, ETAPA 3), que es dato que el papel
   siempre llevó a mano y sin el cual el que recibe no sabe a qué torre subir el material.
   Ahora la línea existe pero SOLO si el documento trae área: sin dato no deja el renglón vacío,
   que era la queja original de v1001. */
/* v1141: la línea pasa por _ocAreaImpreso (areaDestino → area → pedido origen). La regla de
   fondo de v1001 se conserva: sin dato, el renglón no se imprime. */
ok('el Área solo se imprime cuando el documento la trae', /_ocAreaImpreso\(oc\)[\s\S]{0,80}<dt>Área:<\/dt>/.test(html));
ok('el modal pone BODEGA CENTRAL en el campo proyecto', /_esAbastoOc \? 'BODEGA CENTRAL'/.test(html));

// ── 2. editar la OC mientras no esté autorizada ──
const zE = ex('window._ocEditarBorrador = async function');
ok('existe la edición del borrador', !!zE);
ok('solo compras (o admin) puede editar', /compras\.autorizar/.test(zE) && /users\.manage/.test(zE));
ok('SOLO si sigue pendiente de autorización', /PENDIENTE_AUTORIZACION/.test(zE));
ok('una OC ya autorizada NO se puede tocar', /YA ESTÁ AUTORIZADA|YA FUE AUTORIZADA/.test(zE));
ok('re-abre el modal de la orden con sus datos', /openOrdenCompra|_ocCargarBorrador/.test(zE));
ok('el botón EDITAR sale en la bandeja de bodega', /EDITAR/.test(html) && /_ocEditarBorrador\(/.test(html));
// al re-generar no se duplica: la orden vieja se reemplaza
ok('regenerar reemplaza la orden en edición (no crea otra)', /_ocEditandoId/.test(html));
// el modal re-arma TODAS las órdenes del pedido: hay que cubrir los dos lados
ok('no se edita si el pedido ya tiene otra orden AUTORIZADA', /YA TIENE OTRA ORDEN AUTORIZADA/.test(zE));
const zG2 = ex('async function generarOrdenCompra(');
ok('al regenerar se quitan las versiones pendientes viejas del pedido', /_nuevos\[o\.id\]/.test(zG2) && /o\.pedidoId !== pd\.id/.test(zG2));
/* v1144: el barrido ahora también quita las DEVUELTAS (es la versión que se está corrigiendo).
   La propiedad de esta aserción SE CONSERVA: una AUTORIZADA no es ni pendiente ni devuelta,
   así que el continue la salta igual — jamás se barre. */
ok('las autorizadas nunca se borran en ese barrido',
  /_stB !== 'PENDIENTE_AUTORIZACION' && _stB !== 'DEVUELTA'\) continue/.test(zG2));
ok('el borrador reemplazado deja tombstone (union-merge v972)', /ordenesEliminadas\[o\.id\] = Date\.now\(\)/.test(zG2));
ok('el reemplazo ocurre DESPUÉS de crear las nuevas', zG2.indexOf('created.push(oc)') < zG2.indexOf('_ocEditandoId && created.length'));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
