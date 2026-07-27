/* v997 (pedido de Antonio 27-jul): la lista de SOLICITUDES DE ANTICIPO salía ordenada solo
   por fecha, así que las entregadas —que ya no requieren nada— quedaban mezcladas entre las
   que sí esperan una acción. Pidió:
     1º las pendientes de autorizar,
     2º las autorizadas pero pendientes de FACTURA,
     3º las que ya tienen factura y faltan ENTREGAR,
     y las ENTREGADAS al historial colapsable (como planillas y pedidos).
   Dentro de cada grupo se conserva el orden por fecha (más reciente primero). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── rango por etapa del flujo (PURA) ──
const zR = ex('function _antSolicRango(');
ok('existe _antSolicRango', !!zR);
let f = null;
try { f = new Function('return (' + zR + ')')(); } catch(e){}
if (f) {
  const rCot = f({ estado:'pendiente_cotizacion' });
  const rAut = f({ estado:'pendiente_autorizacion' });
  const rSinFact = f({ estado:'autorizada' });
  const rConFact = f({ estado:'autorizada', facturaUrl:'http://x/f.pdf' });
  const rEnt = f({ estado:'entregada' });
  ok('falta cotizar va primero', rCot < rAut);
  ok('pendiente de autorizar antes que autorizada', rAut < rSinFact);
  ok('autorizada sin factura antes que con factura', rSinFact < rConFact);
  ok('con factura (falta entregar) antes que entregada', rConFact < rEnt);
  ok('las canceladas/rechazadas caen al final', f({ estado:'cancelada' }) >= rEnt && f({ estado:'rechazada' }) >= rEnt);
  // v976: una solicitud EN PAUSA no espera acción — no debe encabezar la lista
  ok('las pausadas no van primero', f({ estado:'pendiente_autorizacion', pausada:true }) > rAut);
  ok('un estado desconocido no rompe el orden', typeof f({ estado:'lo-que-sea' }) === 'number');
}

// ── separación e historial ──
const zRender = ex('function _antSolicRender(');
ok('las entregadas salen de la lista activa', /estado === 'entregada'|estado==='entregada'/.test(zRender));
ok('se ordena por rango y después por fecha', /_antSolicRango\(a\) - _antSolicRango\(b\)/.test(zRender) && /_ts/.test(zRender));
ok('hay bloque de historial', /HISTORIAL DE SOLICITUDES ENTREGADAS/.test(zRender));
ok('con conteo y MOSTRAR/OCULTAR', /▶ MOSTRAR|▼ OCULTAR/.test(zRender));
ok('recuerda si está abierto', /localStorage/.test(zRender) || /_antHistVisible/.test(html));
const zT = ex('window._antToggleHistorial = function');
ok('el toggle repinta la vista', /renderPlanillaAnticipos\(\)/.test(zT));
ok('y no explota sin localStorage', /catch/.test(zT));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
