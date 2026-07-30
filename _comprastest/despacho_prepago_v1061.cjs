/* v1061 — DESPACHOS PRE-PAGO (Antonio, 29-jul): "compras que hacemos anticipadamente a
   algunos proveedores… ellos ya nos van liberando según la cantidad que vamos pidiendo…
   SE HACE UNA OC PARA LA BODEGA CENTRAL CON LA CANTIDAD DE TODO EL MATERIAL QUE SE PAGA
   ANTICIPADAMENTE Y ESO SE CARGA EL GASTO A LA BODEGA Y YA DESPUÉS CONFORME VAYAN
   PIDIENDO VAMOS HACIENDO EL CARGO DE ESE GASTO A CADA PROYECTO QUE PIDA."
   Decisiones de Antonio: la OC madre se registra DESDE LA APP (forma de pago COMPRA
   ANTICIPADA en el flujo normal de OC) y los permisos son LOS MISMOS de las OCs.

   Diseño (precedente: derivar OC desde OP, constructor propio por el candado v927):
   - OC madre = OC de bodega normal con formaPago COMPRA ANTICIPADA. Ya pagada ⇒ NUNCA
     es cuenta por pagar (exclusión EXPLÍCITA, no solo de rebote por credito=0).
   - DESPACHO PRE-PAGO = orden serie DPP en el MISMO contenedor (union-merge v972 gratis):
     esDespacho:true (hereda exclusiones + SALIDA del ledger) + esPrepago:true (rama
     propia: CON precios CONGELADOS de la madre y proveedor real en el impreso).
   - Saldo por liberar 100% DERIVADO (patrón _pedidoCubre): qty madre − Σ DPP vivos.
   - El gasto viaja solo: destinoProyectoId + items con precio>0 ⇒ _gastosDeProyecto lo
     carga a la obra al precio congelado (sin caer a _precioEntradaBodega). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. la OC madre nace del flujo normal —');
const iSel = html.indexOf('id="ocFormaPago"');
const zonaSel = html.slice(iSel, iSel + 800);
ok('COMPRA ANTICIPADA es una forma de pago del select', /<option>COMPRA ANTICIPADA<\/option>/.test(zonaSel));
const zM = ex('function _ocEsPrepagoMadre(');
ok('el detector de madre existe', zM.length > 80);
let esMadre = null;
try { esMadre = new Function('return (' + zM + ')')(); } catch(e){}
ok('extraíble', typeof esMadre === 'function');
if (esMadre) {
  ok('detecta la madre', esMadre({ formaPago: 'COMPRA ANTICIPADA' }) === true);
  ok('un despacho no es madre', !esMadre({ formaPago: 'COMPRA ANTICIPADA', esDespacho: true }));
  ok('el crédito no es madre', !esMadre({ formaPago: 'CRÉDITO 30 DÍAS' }));
}

console.log('\n— 2. lo prepagado NUNCA es cuenta por pagar (exclusión explícita) —');
ok('_cuentasPorPagar la excluye por nombre', /COMPRA\\?s\*ANTICIPADA/i.test(ex('function _cuentasPorPagar(')) || /COMPRA\s*ANTICIPADA/i.test(ex('function _cuentasPorPagar(')));

console.log('\n— 3. el saldo por liberar, DERIVADO y PURO —');
const zS = ex('function _dppSaldoDeMadre(');
ok('existe', zS.length > 300);
let saldoDe = null;
try { saldoDe = new Function('var _ocItemMemKey = function(s){ return String(s||"").toUpperCase(); };\nreturn (' + zS + ')')(); } catch(e){ console.log('extract err', e.message); }
ok('extraíble', typeof saldoDe === 'function');
if (saldoDe) {
  const madre = { id: 'm1', items: [{ name: 'TABLA ULTRALIGHT', qty: 5000, precio: 65, unidad: 'UNIDAD' }] };
  const ordenes = [
    { id: 'd1', refOcMadre: 'm1', status: 'AUTORIZADA', items: [{ name: 'TABLA ULTRALIGHT', qty: 16 }] },
    { id: 'd2', refOcMadre: 'm1', status: 'PENDIENTE_AUTORIZACION', items: [{ name: 'TABLA ULTRALIGHT', qty: 4 }] },
    { id: 'd3', refOcMadre: 'm1', status: 'CANCELADA', items: [{ name: 'TABLA ULTRALIGHT', qty: 999 }] },
    { id: 'x1', refOcMadre: 'OTRA', status: 'AUTORIZADA', items: [{ name: 'TABLA ULTRALIGHT', qty: 50 }] },
  ];
  const s = saldoDe(madre, ordenes);
  const k = 'TABLA ULTRALIGHT';
  ok('descuenta los despachos vivos (16+4)', s.porItem[k] && s.porItem[k].despachado === 20);
  ok('la cancelada y la de OTRA madre no cuentan', s.porItem[k].saldo === 4980);
  ok('congela el precio de la madre', s.porItem[k].precio === 65);
  ok('total del saldo', s.totalSaldo === 4980);
}

console.log('\n— 4. crear el despacho desde la madre —');
const zC = ex('window._dppCrearDesdeMadre = async function');
ok('existe el flujo propio', zC.length > 800);
ok('mismos permisos que generar OC', /can\('compras\.autorizar'\)/.test(zC));
ok('solo madres AUTORIZADAS', /AUTORIZADA/.test(zC));
ok('re-lee el state tras el await (regla v769/v940)', (zC.match(/_bodegaFindOc\(/g) || []).length >= 2);
ok('valida contra el saldo FRESCO', (zC.match(/_dppSaldoDeMadre\(/g) || []).length >= 2);
ok('serie DPP con folio derivado', /serie:\s*'DPP'/.test(zC) && /_primerNumeroLibre/.test(zC));
ok('esDespacho + esPrepago (exclusiones y rama propia)', /esDespacho:\s*true/.test(zC) && /esPrepago:\s*true/.test(zC));
ok('cita a la madre', /refOcMadre/.test(zC) && /refOcMadreNumero/.test(zC));
ok('nace PENDIENTE de autorizar (separación de funciones v919)', /PENDIENTE_AUTORIZACION/.test(zC));
ok('total en letras del monto congelado', /numeroALetras/.test(zC));
ok('sella y sube de una (dinero)', /_ts/.test(zC) && /forceUploadNow/.test(zC));

console.log('\n— 5. autorizar re-valida el saldo —');
ok('autorizarOrden chequea el sobregiro prepago', /esPrepago[\s\S]{0,400}_dppSaldoDeMadre/.test(ex('async function autorizarOrden(')) || /esPrepago[\s\S]{0,400}_dppSaldoDeMadre/.test(ex('window.autorizarOrden = async function')));

console.log('\n— 6. el impreso: CON dinero y con el proveedor real —');
ok('el ocultador de dinero respeta esPrepago', /esDespacho = !!oc\.esDespacho && !oc\.esPrepago/.test(html));
ok('título propio', /DESPACHO PRE-PAGO/.test(ex('function printOrdenCompra(').slice(0, 20000)) || />DESPACHO PRE-PAGO</.test(html) || /'DESPACHO PRE-PAGO'/.test(html));

console.log('\n— 7. la tarjeta de la madre: saldo a la vista + botón —');
ok('la tarjeta muestra el saldo por liberar', /_dppSaldoDeMadre/.test(html.slice(html.indexOf('let _opEstado'), html.indexOf('let _opEstado') + 3500)));
ok('y el botón de despachar', /_dppCrearDesdeMadre\('/.test(html));

console.log('\n— 8. el gasto llega a la obra rotulado —');
ok('_gastosDeProyecto pasa la marca', /esPrepago: !!o\.esPrepago/.test(ex('function _gastosDeProyecto(')));
ok('renderGastos lo rotula', /DESPACHO PRE-PAGO/.test(ex('function renderGastos(')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
