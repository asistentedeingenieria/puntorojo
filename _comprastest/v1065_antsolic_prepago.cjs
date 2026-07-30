/* v1065 — DOS PEDIDOS DE ANTONIO (30-jul):
   A) "los supervisores desde aquí puedan hacer solicitudes de anticipos… una pestaña que
      se llame ANTICIPOS al lado de RESUMEN POR PERSONA y lo ÚNICO que quiero que tenga es
      poder hacer la solicitud de un anticipo para alguien" — pestaña antsolic en la vista
      LIQUIDACIÓN de la obra. NO se toca el nodo planilla-anticipos (ese es la gestión
      completa y ADMINISTRACIÓN lo toma prestado, v1018).
   B) "una bodega de compras pre-pago… que todo lo que se compre prepago se registre en
      una sola bodega y que después se pueda ir despachando desde esa bodega" — tarjeta
      BODEGA PRE-PAGO en COMPRAS>BODEGA CENTRAL, 100% DERIVADA de las OC madre COMPRA
      ANTICIPADA (v1061): registrar = crear la madre; el saldo se deriva; despachar =
      _dppCrearDesdeMadre. Nada nuevo se guarda ⇒ sin cambio de sync. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— A. pestaña ANTICIPOS en la LIQUIDACIÓN de la obra —');
ok('el botón existe junto a RESUMEN POR PERSONA, gateado para solicitar',
  /data-plantab="resumenpersona"[\s\S]{0,400}data-plantab="antsolic"[^>]*data-perm="anticipos\.solicitar\|users\.manage"[^>]*>ANTICIPOS</.test(html));
ok('el contenedor propio existe (NO se toca planilla-anticipos, prestado a ADMIN)',
  /id="planilla-antsolic"/.test(html));
const iC = html.indexOf('id="planilla-antsolic"');
const zC = html.slice(iC, iC + 1600);
ok('lo ÚNICO que tiene: el botón de solicitar (flujo v777)', /_antAbrirSolicitar\(\)/.test(zC) && /SOLICITAR ANTICIPO/.test(zC));
ok('con su permiso', /data-perm="anticipos\.solicitar\|users\.manage"/.test(zC));
/* el conmutador VIVO es la ÚLTIMA definición de setPlanillaTab (la 1ª está muerta, v958) */
ok('el conmutador vivo togglea el contenedor nuevo', /'resumenpersona','anticipos','antsolic','ocs'/.test(html));

console.log('\n— B. BODEGA PRE-PAGO en COMPRAS>BODEGA CENTRAL —');
const zB = ex('function _bodegaPrepagoHTML(');
ok('existe la vista', zB.length > 800);
ok('junta TODAS las madres COMPRA ANTICIPADA (3 contenedores)', /_ocEsPrepagoMadre/.test(zB) && /_bodegaMatStore/.test(zB) && /variosMat/.test(zB) && /p\.materiales/.test(zB));
ok('el saldo por liberar es DERIVADO', /_dppSaldoDeMadre/.test(zB));
ok('de acá se despacha (mismo flujo v1061)', /_dppCrearDesdeMadre/.test(zB));
ok('con los permisos de OC', /compras\.autorizar/.test(zB));
ok('la madre pendiente de autorizar no despacha', /PENDIENTE DE AUTORIZAR/.test(zB));
ok('el vacío explica cómo se registra', /COMPRA ANTICIPADA/.test(zB));
ok('sobregiro en rojo', /B91C1C/.test(zB));
ok('el contenedor vive en la sección BODEGA CENTRAL', /id="_comprasSecBodega">[\s\S]{0,300}id="_bodegaPrepagoWrap"/.test(html));
ok('y el panel lo pinta', /_bodegaPrepagoWrap'\)[\s\S]{0,80}_bodegaPrepagoHTML\(\)/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
