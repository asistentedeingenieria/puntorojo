/* v1006:
   (a) DETALLE desde BODEGA CENTRAL / PROYECTOS VARIOS — cuarto intento, con el diagnóstico
       verificado: #modalPedidoDetalle es hijo DIRECTO de <body> y ninguna regla crea un
       contexto de apilamiento por encima, así que el z-index SÍ manda. El modal se pone en
       99000 (los paneles están en 98000) y el panel QUEDA VISIBLE detrás. v1004 escondía el
       panel y por eso el fondo pasaba a ser el dashboard: se sentía igual de "sacado".

   (b) Pedido de Antonio: "quiero que las órdenes de compra también tengan un historial.
       Que esté visible solo la orden que aún está pendiente de recibir, o sea que aún no se
       haya marcado YA RECIBÍ EL MATERIAL". Las órdenes ya recibidas se guardan en un bloque
       colapsable, con el mismo patrón de pedidos y planillas. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── (a) el detalle va ENCIMA, sin esconder el panel ──
const zDet = ex('function openPedidoDetalle(');
ok('el detalle se pone por encima del panel', zDet.includes("_panelAbierto ? '99000' : ''"));
ok('el panel NO se esconde (queda visible detrás)', !zDet.includes("_panelAbierto.style.display = 'none'"));
ok('al cerrar se devuelve el z-index', ex('function closeModal(').includes("_m.style.zIndex = ''"));
ok('el modal sigue siendo hijo directo de body (lo que hace válido el z-index)', (function(){
  const i = html.indexOf('id="modalPedidoDetalle"');
  const tags = [...html.slice(0, i).matchAll(/<(\/?)div([^>]*)>/g)];
  let abiertos = 0; tags.forEach(t => { abiertos += (t[1] === '/' ? -1 : 1); });
  return abiertos === 0;
})());

// ── (b) historial de órdenes ──
const zP = ex('function _ocPendienteDeRecibir(');
ok('existe _ocPendienteDeRecibir', !!zP);
let f = null;
try { f = new Function('return (' + zP + ')')(); } catch(e){}
if (f) {
  ok('sin recepción está PENDIENTE', f({ id:'o1' }, { status:'APROBADO' }) === true);
  ok('con su entrega firmada ya NO', f({ id:'o1' }, { status:'APROBADO', recepciones:{ o1:{ ts:1 } } }) === false);
  ok('la entrega de OTRA orden no la marca', f({ id:'o1' }, { status:'APROBADO', recepciones:{ o2:{ ts:1 } } }) === true);
  ok('un pedido RECIBIDO entero cierra sus órdenes', f({ id:'o1' }, { status:'RECIBIDO' }) === false);
  ok('sin pedido (dato viejo) se considera pendiente', f({ id:'o1' }, null) === true);
  ok('las canceladas no cuentan como pendientes', f({ id:'o1', status:'CANCELADA' }, { status:'APROBADO' }) === false);
}

const zL = ex('function renderOrdenesList(');
ok('la lista separa pendientes de recibidas', /_ocPendienteDeRecibir\(/.test(zL));
ok('hay bloque de historial', /HISTORIAL DE ÓRDENES RECIBIDAS/.test(zL));
ok('con su conteo y MOSTRAR/OCULTAR', /▶ MOSTRAR|▼ OCULTAR/.test(zL));
ok('recuerda la preferencia por proyecto', /oc_historial_visible_/.test(zL));
ok('si no queda ninguna pendiente lo dice', /TODAS LAS ÓRDENES FUERON RECIBIDAS/.test(zL));
const zT = ex('window.toggleOcHistorial = function');
ok('el toggle repinta', /renderOrdenesList\(\)/.test(zT));
ok('y no explota sin localStorage', /catch/.test(zT));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
