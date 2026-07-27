/* v1005 (pedido de Antonio 27-jul): "no me gusta cómo se ve el mensaje de pendiente de
   finanzas. Este mensaje debe salir en vez de donde dice APROBADO. APROBADO debe decir solo
   si ya finanzas autorizó; de lo contrario debe decir PENDIENTE DE AUTORIZACIÓN".

   El pedido pasaba a APROBADO al GENERARSE la orden, aunque finanzas todavía no la hubiera
   firmado — y el aviso real quedaba como un texto suelto a la derecha de los botones.
   Ahora el chip de estado dice la verdad: PENDIENTE DE AUTORIZACIÓN mientras alguna de sus
   órdenes espere firma, y APROBADO recién cuando están todas autorizadas.
   El dato pd.status NO cambia — es solo cómo se muestra. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zE = ex('function _estadoPedidoMostrar(');
ok('existe _estadoPedidoMostrar', !!zE);
let f = null;
try { f = new Function('return (' + zE + ')')(); } catch(e){}
if (f) {
  const OC_PEND = { status:'PENDIENTE_AUTORIZACION' }, OC_AUT = { status:'AUTORIZADA' }, OC_VIEJA = {};
  ok('APROBADO con una OC sin firmar dice PENDIENTE DE AUTORIZACIÓN', f({ status:'APROBADO' }, [OC_PEND]).texto === 'PENDIENTE DE AUTORIZACIÓN');
  ok('y va en ámbar (espera acción)', f({ status:'APROBADO' }, [OC_PEND]).color === '#B45309');
  ok('con TODAS autorizadas sí dice APROBADO', f({ status:'APROBADO' }, [OC_AUT, OC_AUT]).texto === 'APROBADO');
  ok('una sola pendiente entre varias ya lo marca', f({ status:'APROBADO' }, [OC_AUT, OC_PEND]).texto === 'PENDIENTE DE AUTORIZACIÓN');
  ok('las OC viejas sin status cuentan como autorizadas', f({ status:'APROBADO' }, [OC_VIEJA]).texto === 'APROBADO');
  ok('sin órdenes todavía, el estado no se toca', f({ status:'APROBADO' }, []).texto === 'APROBADO');
  ok('SOLICITADO se muestra tal cual', f({ status:'SOLICITADO' }, [OC_PEND]).texto === 'SOLICITADO');
  ok('RECIBIDO también', f({ status:'RECIBIDO' }, [OC_AUT]).texto === 'RECIBIDO');
  ok('devuelve siempre texto y color', (function(){ const r = f({}, null); return typeof r.texto === 'string' && typeof r.color === 'string'; })());
}

// ── aplicado donde se ve ──
const iPan = html.indexOf('PEDIDOS DE ABASTECIMIENTO del store global');
const zPan = iPan > 0 ? html.slice(iPan, iPan + 2600) : '';
ok('la fila de bodega usa el estado real', /_estadoPedidoMostrar\(/.test(zPan));
ok('y ya no lleva el texto suelto PENDIENTE FINANZAS', !/PENDIENTE FINANZAS/.test(zPan));
const zCard = ex('function renderPedidoCard(');
ok('la tarjeta del proyecto también', /_estadoPedidoMostrar\(/.test(zCard));
const zVar = ex('window._abrirPanelVarios = function');
ok('y el panel de proyectos varios', /_estadoPedidoMostrar\(/.test(zVar));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
