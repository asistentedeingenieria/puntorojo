/* v1104 — DOS PEDIDOS DE ANTONIO SOBRE LA PESTAÑA ANTICIPOS DE LA OBRA:
   (A) "el diseño de esto quiero que salga a todo lo largo, no así como ahorita" — la tarjeta
       tenía max-width:560px y dejaba media pantalla en blanco.
   (B) "aquí en el proyecto sí quiero que se pueda ver cómo va el proceso de compra y de
       solicitud, ya que necesito que la persona que lo pidió de obra pueda ver en qué status
       está su pedido."
   El seguimiento vivía SOLO en ADMINISTRACIÓN, donde el supervisor no entra: pedía el anticipo
   y quedaba a ciegas hasta que alguien le avisaba por WhatsApp. Ahora ve sus solicitudes con
   el estado en palabras y el último comentario de compras — que es exactamente lo que estaba
   preguntando ("¿ya lo compraron?"). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— A. a todo lo ancho —');
const bloque = html.slice(html.indexOf('id="planilla-antsolic"'), html.indexOf('id="planilla-antsolic"') + 1800);
ok('el bloque existe', bloque.length > 500);
/* el comentario del cambio NOMBRA el max-width viejo para explicar qué se quitó: se mira el
   markup sin comentarios, igual que en v1094 con el nombre del material */
const bloqueSinNotas = bloque.replace(/<!--[\s\S]*?-->/g, '');
ok('ya no tiene el max-width que lo achicaba', !/max-width:560px/.test(bloqueSinNotas));
ok('la tarjeta quedó sin ancho tope', /<div class="card" style="padding:22px 18px">/.test(bloqueSinNotas));

console.log('\n— B. el estado de MIS solicitudes —');
ok('hay contenedor para el seguimiento', /id="_antMisSolic"/.test(html));
ok('existe el render', /window\._antRenderMisSolicitudes = function/.test(html));
ok('se dispara al entrar a la pestaña', /tab === 'antsolic'[\s\S]{0,120}_antRenderMisSolicitudes/.test(html));

const zE = ex('window._antEstadoLegible = function(');
ok('existe el traductor de estado', zE.length > 150);
let f = null; try { f = new Function('return (' + zE.replace(/^window\._antEstadoLegible = /,'') + ')')(); } catch(e){}
ok('es evaluable', !!f);
if (f) {
  ok('pendiente de cotización se explica en palabras', /COTIZACIÓN/.test(f({estado:'pendiente_cotizacion'}).txt));
  ok('pendiente de autorización también', /AUTORIZACIÓN/.test(f({estado:'pendiente_autorizacion'}).txt));
  ok('la pausa gana sobre el estado (es lo que explica la demora)',
    /PAUSA/.test(f({estado:'pendiente_cotizacion', pausada:true}).txt));
  ok('entregada', /ENTREGADA/.test(f({estado:'entregada'}).txt));
  ok('cancelada', /CANCELADA/.test(f({estado:'cancelada'}).txt));
  ok('un estado desconocido no rompe', typeof f({estado:'raro'}).txt === 'string');
  ok('sin solicitud tampoco', typeof f(null).txt === 'string');
}

console.log('\n— cada quien ve lo suyo —');
const zR = ex('window._antRenderMisSolicitudes = function(');
ok('filtra por el correo de quien pidió', /solicitadoPor/.test(zR) && /_getUserEmail/.test(zR));
ok('compras y el admin ven todas', /users\.manage/.test(zR) && /anticipos\.cotizar/.test(zR));
ok('usa el array real de comentarios {texto,por,cuando}', /comentarios\[s\.comentarios\.length-1\]/.test(zR));
ok('escapa lo que pinta', /_e\(/.test(zR));
ok('no escribe nada (es solo lectura)', !/saveState|forceUploadNow/.test(zR));

/* v1105 (Antonio): "las entregadas deben de estar en un historial colapsable" — con 6 entregadas
   arriba, lo único en proceso (el nivel láser pausado) quedaba enterrado al final. */
console.log('\n— v1105: las entregadas van a un historial colapsable —');
ok('separa lo cerrado de lo activo', /_cerrada/.test(zR) && /'entregada'/.test(zR));
ok('arriba solo lo que sigue en proceso', /activas\.map\(tarjeta\)/.test(zR));
ok('las entregadas van al historial', /cerradas\.map\(tarjeta\)/.test(zR));
ok('el historial arranca CERRADO', /window\._antHistOpen = false/.test(html));
ok('se abre con un clic', /window\._antToggleHist = function/.test(html) && /_antToggleHist\(\)/.test(zR));
ok('dice cuántas hay', /cerradas\.length/.test(zR) && /ENTREGADA/.test(zR));
ok('si no queda nada en proceso lo dice', /TODO LO PEDIDO YA SE ENTREGÓ/.test(zR));
ok('cancelada también cuenta como cerrada', /'cancelada'/.test(zR));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
