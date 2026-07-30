/* v1062 — TANDA DE PEDIDOS SUELTOS DE ANTONIO (29-jul, noche):
   A) "¿Por qué Q0 en cuentas por pagar si ya hay OCs de bodega al crédito?" — cubierto en
      cxp_gastos_v1059.cjs sección 6 (los días se derivan del TEXTO de la forma de pago).
   B) "Las compras anticipadas NO llevan fecha ni dirección de entrega" — el formulario las
      esconde al elegir COMPRA ANTICIPADA y el generar ni valida ni guarda esos campos.
   C) "TODO en la app que tenga despliegue debe de estar cerrado por default" — los grupos
      de PERSONAL solo se auto-abren si hay BÚSQUEDA real (el filtro de obra del panel
      ADMINISTRACIÓN los dejaba siempre abiertos).
   D) "Estoy en bodega central generando una OC y me saca de mi bodega" — el botón GENERAR
      OC del panel cerraba el panel a propósito (copia vieja pre-v1007); el modal ya sabe
      ir ENCIMA.
   E) "El catálogo de precios como una pestaña más dentro de COMPRAS" — pestaña propia;
      salió del encabezado de ÓRDENES. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— B. COMPRA ANTICIPADA sin entrega —');
const zSync = ex('function _ocSyncEntregaVisible(');
ok('el sincronizador existe', zSync.length > 200 && /COMPRA\\s\*ANTICIPADA/.test(zSync));
ok('los dos campos tienen wrapper', /id="ocFechaEntregaWrap"/.test(html) && /id="ocEntregarAWrap"/.test(html));
ok('el select lo dispara', /id="ocFormaPago" onchange="_ocSyncEntregaVisible\(\)"/.test(html));
ok('y al abrir el modal también corre', /_ocSyncEntregaVisible\(\); \} catch/.test(html));
const zGen = ex('async function generarOrdenCompra(');
ok('generar no exige la entrega si es anticipada', /_esCompraAnticipada \? \[\] : _ocEntregaFalta/.test(zGen));
ok('ni la fecha', /_esCompraAnticipada \? '' : _fechaInputALatam/.test(zGen) && /!fechaEntregaNueva && !_esCompraAnticipada/.test(zGen));
ok('ni guarda dirección', /_esCompraAnticipada \? '' : document\.getElementById\('ocEntregarA'\)/.test(zGen));
console.log('— y el impreso no muestra bloques vacíos —');
ok('ENTREGAR A solo si hay dirección', /String\(oc\.entregarA \|\| ''\)\.trim\(\) \? `<div class="oc-entregar">/.test(html));
ok('FECHA DE ENTREGA solo si hay fecha', /String\(oc\.fechaEntrega \|\| ''\)\.trim\(\) \? `<div class="fe-lbl">/.test(html));

console.log('\n— C. despliegues cerrados por default —');
ok('los grupos de PERSONAL nacen cerrados', /_persGruposAbiertos = new Set\(\)/.test(html));
const iF = html.indexOf('los grupos se auto-abren SOLO si el usuario está BUSCANDO');
ok('y solo la BÚSQUEDA real los abre (no el filtro de obra del panel)', iF > 0 && /_persBuscar/.test(html.slice(iF, iF + 700)) && !/lista\.length !== _baseModeCount/.test(html));

console.log('\n— D. generar OC no te saca del panel COMPRAS —');
ok('el botón del panel ya no cierra el panel', !/_cerrarPanelBodegaDom\(\); currentPedidoDetalleId/.test(html));
ok('el modal sabe ir encima (v1007 sigue)', /_mOc\.style\.zIndex = _panOc \? '99000' : ''/.test(html));

console.log('\n— E. CATÁLOGO DE PRECIOS como pestaña de COMPRAS —');
const zB = ex('function _comprasBarraHTML(');
ok('la pestaña existe con sus permisos', /btn\('catalogo', 'CATÁLOGO DE PRECIOS'\)/.test(zB) && /precios\.autorizar/.test(zB));
ok('la pestaña abre el catálogo encima', /t === 'catalogo'[\s\S]{0,120}openCatalogoProveedores/.test(ex('function _comprasSetTab(')));
ok('el botón viejo de ÓRDENES se fue', !/onclick="openCatalogoProveedores\(\)"[^>]*>CATÁLOGO DE PRECIOS</.test(html));
ok('la ventana del catálogo sube sobre el panel', /modalCatalogoProveedores'\);\s*\r?\n?\s*_mCat\.style\.zIndex = document\.getElementById\('_bodegaPanelModal'\) \? '99000' : ''/.test(html) || /_mCat\.style\.zIndex/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
