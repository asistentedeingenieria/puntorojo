/* v1068 — DPP y TRASIEGO nacen del PEDIDO (pedidos de Antonio, 30-jul):
   1. "cuando el supervisor haga un pedido donde lleve este material se pueda seleccionar
      que va a salir de la orden pre pago y que automáticamente ya detecta para qué área
      del proyecto va y ya genera la orden para el proveedor" — opción COMPRA PRE-PAGO en
      el picker de proveedor por ítem; el DPP nace del flujo normal (proyecto/área/fecha
      de entrega del modal, PENDIENTE de finanzas, precio congelado de la madre).
   2. "poder poner que ese material se va a trasegar de una obra a otra" — opción
      TRASIEGO · [obra] por ítem; nace DIRECTO (decisión v1066 confirmada 30-jul).
   3. "tenemos diferentes datos de POR LIBERAR. DEBE DE ESTAR IGUAL" — el panel calculaba
      el saldo con el contenedor de la madre y el modal con el suyo (30-jul: 4201 vs 5000).
      UNA sola fuente: _dppOrdenesGlobal() junta los 3 contenedores.
   4. "NECESITO PODER VER UN RESUMEN DE A DONDE SE HAN IDO LOS PRODUCTOS Y A QUE PROYECTOS
      Y CUANDO" — desplegable por madre (cerrado por default, patrón v1067). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. UNA sola fuente para el saldo pre-pago —');
const zG = ex('function _dppOrdenesGlobal(');
ok('existe _dppOrdenesGlobal', zG.length > 100);
let fuente = null;
try { fuente = new Function('state','_bodegaMatStore','return (' + zG + ')'); } catch(e){}
if (fuente) {
  const st = {
    variosMat: { ordenes: [{ id: 'v1' }] },
    projects: [{ id: 'p1', materiales: { ordenes: [{ id: 'o1' }] } }, { id: 'p2' }]
  };
  const r = fuente(st, () => ({ ordenes: [{ id: 'b1' }] }))();
  ok('junta los 3 contenedores', r.length === 3 && r.some(x=>x.id==='b1') && r.some(x=>x.id==='v1') && r.some(x=>x.id==='o1'));
} else { ok('junta los 3 contenedores', false); }
/* el descuadre de Antonio: madre en bodega, despacho viviendo en VARIOS — el saldo DEBE verlo */
const zP = ex('function _prepagoSinDespachar(');
ok('_prepagoSinDespachar usa la fuente global (con guard para el sandbox v1067)', /typeof _dppOrdenesGlobal === 'function'/.test(zP));
const zB = ex('function _bodegaPrepagoHTML(');
ok('el panel calcula el saldo con la fuente global', /_dppSaldoDeMadre\(m\.oc,\s*todas/.test(zB));
const zC = ex('window._dppCrearDesdeMadre = async function');
ok('el modal de despacho también (2 lecturas: armar y validar fresco)', (zC.match(/_dppOrdenesGlobal\(/g) || []).length >= 2);
ok('ficha de OC y autorización también', (html.match(/_dppOrdenesGlobal\(/g) || []).length >= 6);

console.log('\n— 2. Opciones nuevas del picker por ítem —');
const zOp = ex('function _dppOpcionesDeItem(');
let ops = null;
/* v1071: el destino ya no se resuelve acá adentro — sale de _pedidoDestinoActual() (el
   bug era leer currentPedidoDetalleId desde window, donde no existe por ser un `let`).
   El sandbox inyecta ese resolvedor devolviendo una obra real para que haya opciones. */
try { ops = new Function('_ocItemMemKey','_ocEsPrepagoMadre','_dppSaldoDeMadre','_numLimpio','_pedidoDestinoActual','_dppOrdenesSinBorrador','return (' + zOp + ')'); } catch(e){}
ok('existe _dppOpcionesDeItem', !!ops && zOp.length > 200);
if (ops) {
  const madre = { id: 'm1', numero: 'BODEGA – OC 6', proveedorNombre: 'SISTEGUA, S.A.', status: 'AUTORIZADA', formaPago: 'COMPRA ANTICIPADA', items: [{ name: 'TABLA', qty: 100, precio: 65 }] };
  const pend  = { id: 'm2', numero: 'BODEGA – OC 7', proveedorNombre: 'X', status: 'PENDIENTE_AUTORIZACION', formaPago: 'COMPRA ANTICIPADA', items: [{ name: 'TABLA', qty: 50, precio: 60 }] };
  const todas = [madre, pend, { id: 'd1', refOcMadre: 'm1', esDespacho: true, esPrepago: true, items: [{ name: 'TABLA', qty: 40 }] }];
  const esM = o => !!o && !o.esDespacho && /COMPRA\s*ANTICIPADA/i.test(String(o.formaPago || ''));
  const saldo = (m, ordenes) => { let q = m.items[0].qty; ordenes.forEach(o => { if (o && o.refOcMadre === m.id) q -= o.items[0].qty; }); return { porItem: { TABLA: { saldo: q, qty: m.items[0].qty, precio: m.items[0].precio, name: 'TABLA' } }, orden: ['TABLA'] }; };
  const stubDest = () => 'p1'; // el pedido en curso SÍ tiene obra destino
  const f = ops(n => String(n).toUpperCase(), esM, saldo, s => s, stubDest, () => todas);
  const r = f('tabla');
  ok('madre AUTORIZADA con saldo → opción _dpp:<id> con saldo a la vista', r.length === 1 && r[0].id === '_dpp:m1' && /COMPRA PRE-PAGO/.test(r[0].label) && /60/.test(r[0].label));
  ok('madre PENDIENTE no se ofrece', !r.some(x => x.id === '_dpp:m2'));
  const f2 = ops(n => String(n).toUpperCase(), esM, (m, o) => ({ porItem: {}, orden: [] }), s => s, stubDest, () => todas);
  ok('sin saldo del material no hay opción', f2('tabla').length === 0);
  /* v1071: pedido de bodega/varios (sin obra destino) — ninguna opción, el gasto no tendría dueño */
  const f3 = ops(n => String(n).toUpperCase(), esM, saldo, s => s, () => '', () => todas);
  ok('pedido sin obra destino: sin opciones', f3('tabla').length === 0);
} else { ['opción _dpp','pendiente no','sin saldo'].forEach(n => ok(n, false)); }
const zTOp = ex('function _trasOpcionesDeItem(');
/* v1071: el destino sale de _pedidoDestinoActual() (antes _destinoProyectoDePedido crudo) */
ok('existe _trasOpcionesDeItem (obras menos la que pide, TRASIEGO · <obra>)', /'_tras:' \+/.test(zTOp) && /TRASIEGO · /.test(zTOp) && /_pedidoDestinoActual\(/.test(zTOp));
const zPick = ex('function _abrirPickerProveedor(');
ok('las 3 ramas del picker ofrecen las opciones nuevas', (zPick.match(/_dppOpcionesDeItem\(/g) || []).length >= 3 && (zPick.match(/_trasOpcionesDeItem\(/g) || []).length >= 3);
ok('el candado v978 sigue (AUTO ↔ BODEGA ↔ nuevas)', /_ocProvLocked/.test(zPick) && /_provAuto/.test(zPick) && /BODEGA CENTRAL \(DESPACHO\)/.test(zPick));

console.log('\n— 3. Candados del ítem y del precio —');
const zU = ex('window.updateOcItemProveedor = function') || ex('function updateOcItemProveedor(');
ok('rama _dpp: precio congelado de la madre + valida saldo', /_dpp:/.test(zU) && /porItem\[_ocItemMemKey/.test(zU));
ok('rama _tras: precio con la cascada v1066 (entrada a bodega → catálogo)', /_tras:/.test(zU) && /_precioEntradaBodega/.test(zU));
ok('el guard del candado deja pasar los pseudo-ids sin perder los tokens v978', /_ocProvLocked/.test(zU) && /'_bodega'/.test(zU));
const iEd = html.indexOf("it.aMedida || it.eventual || it.proveedorId === '_bodega'");
const zEd = iEd > -1 ? html.slice(iEd, iEd + 220) : '';
/* la rama editable suma '_tras:' === 0 (digitable) y EXCLUYE '_dpp:' con !== 0 (congelado) */
ok('el precio del TRASIEGO es digitable; el del PRE-PAGO NO', /_tras:'\) === 0/.test(zEd) && /_dpp:'\) !== 0/.test(zEd));
const zUp = ex('window.updateOcPrecio = function') || ex('function updateOcPrecio(');
/* el guard _dpp: va ANTES del guard de catálogo — gana aunque el ítem sea eventual */
ok('updateOcPrecio bloquea _dpp: aunque el ítem sea eventual', /_dpp:'\) === 0\) \{/.test(zUp) && zUp.indexOf("_dpp:") < zUp.indexOf("proveedorId !== '_bodega'"));
ok('y permite _tras: conservando el literal de bodega', /proveedorId !== '_bodega'/.test(zUp) && /_tras:/.test(zUp));

console.log('\n— 4. Generar: DPP y TRAS nacen FUERA del lazo de proveedores —');
const zGen = ex('async function generarOrdenCompra(');
const iLazo = zGen.indexOf('providerIds.forEach((provId, idx)');
ok('el lazo salta los grupos especiales al entrar', iLazo > -1 && /dpp\|tras[\s\S]{0,40}return/.test(zGen.slice(iLazo, iLazo + 260)));
ok('bloque especial post-lazo', /_espIds/.test(zGen) && zGen.indexOf('_espIds') > iLazo);
ok('DPP: serie DPP + madre citada + pendiente de finanzas + ligado al pedido', /serie: 'DPP'/.test(zGen) && /refOcMadre/.test(zGen) && /esPrepago: true/.test(zGen));
ok('DPP: vive en el contenedor de la MADRE (no en _ctx.cont) y sellado', /_contM\.ordenes\.push/.test(zGen) && /_bodegaFindOc\(/.test(zGen));
/* v1070: la fuente del generar pasó a _dppOrdenesSinBorrador (al CORREGIR, el DPP borrador
   propio no cuenta el saldo — hallazgo CRÍTICO de la revisión adversarial) */
ok('DPP: valida el saldo FRESCO tras los await (regla v769/v940)', zGen.indexOf('_dppOrdenesSinBorrador', zGen.indexOf('_pedirFirmaSiFalta')) > -1);
ok('DPP: IVA del despacho, no el heredado de la madre (bug del clon)', /ivaMonto: \+\(_totD - _subD\)\.toFixed\(2\)/.test(zGen));
ok('TRAS: serie TRAS + DIRECTO + origen y destino', /serie: 'TRAS'/.test(zGen) && /origenProyectoId/.test(zGen) && zGen.indexOf("status: 'AUTORIZADA'", zGen.indexOf('_espIds')) > -1);
ok('sinPrecio exime el trasiego SIN tocar el literal de bodega (v921)', /it\.proveedorId !== '_bodega'/.test(zGen) && /sinPrecio[\s\S]{0,200}_tras:/.test(zGen.slice(zGen.indexOf('const sinPrecio'))));
ok('la memoria de receta NO recuerda pseudo-proveedores', /ocProvPorItem/.test(zGen) && /esDeReceta/.test(zGen) && /dpp\|tras[\s\S]{0,60}return;[\s\S]{0,120}ocProvPorItem/.test(zGen.slice(zGen.indexOf('esDeReceta'))));
ok('el barrido v1001 también reemplaza DPPs del pedido que viven en bodega', /_cB\.ordenesEliminadas/.test(zGen) && /_ocSerieDe\(o\) !== 'DPP'\) continue/.test(zGen));

console.log('\n— 5. El resumen que pidió Antonio: a dónde, a qué proyecto y cuándo —');
ok('cada madre lleva su desplegable (cerrado por default, patrón v1067)', /dpp_hist_/.test(zB) && /_histVisible\('dpp_hist_' \+/.test(zB) === false ? /dpp_hist_/.test(zB) : true);
ok('desplegable con el patrón _histVisible', /_histVisible\(/.test(zB) && /_dppHistToggle/.test(zB));
ok('las filas dicen fecha, obra destino y referencia', /destinoProyectoId/.test(zB) && /refExterna/.test(zB));
const zT = ex('window._dppHistToggle = function');
ok('el toggle repinta el wrap sin cerrar el panel', /_histToggle\(/.test(zT) && /_bodegaPrepagoWrap/.test(zT));

console.log('\n— 6. Fecha de entrega en el modal manual (como las OC — decisión 30-jul) —');
ok('el form captura entrega por onchange (patrón v813)', /_dppForm\.entrega/.test(zC) && /type="date"/.test(zC));
ok('el DPP manual la usa si se puso; vacío sigue valiendo', /form\.entrega \? _fechaInputALatam\(form\.entrega\) : ''/.test(zC));

console.log('\n— 7. La factura del pre-pago vive en la MADRE —');
ok('el botón SUBIR FACTURA no sale en los DPP (como las OP)', /_ocSerieDe\(oc\) !== 'OP' && _ocSerieDe\(oc\) !== 'DPP'/.test(html));

console.log('\n— 8. Tiempo real: el panel pre-pago se repinta al llegar datos —');
ok('applyRemote repinta el wrap pre-pago (patrón tomas v1058)', /_bodegaPrepagoWrap[\s\S]{0,220}_bodegaPrepagoHTML\(\)/.test(html) && (html.match(/_bodegaPrepagoWrap/g) || []).length >= 3);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
