/* v995 (reporte de Antonio 27-jul): un pedido con recibo ya generado seguía diciendo
   "APROBADO · OC GENERADA" y le seguía saliendo el botón YA RECIBÍ EL MATERIAL.

   CAUSA: advancePedido evalúa el permiso DOS veces. El primero (v990) usa la regla buena
   —dueño del pedido, admin, pedidos.advance o pedidos.receive— y deja pasar al SUPERVISOR.
   Después de firmar, subir el recibo y grabar pd.recepcion, un segundo gate heredado
   (role 'oficina' ⇒ exige pedidos.advance) lo rebotaba con "SIN PERMISO": el pedido quedaba
   con recepción registrada pero clavado en APROBADO.

   FIX: (1) el segundo gate reutiliza la MISMA regla que el primero;
        (2) self-heal en el punto de USO: al pintar la lista, un pedido APROBADO que ya
            tiene pd.recepcion pasa a RECIBIDO (los que ya quedaron rotos se arreglan solos). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. un solo criterio de permiso ──
const zAdv = ex('async function advancePedido(');
ok('el permiso se evalúa con _puede (regla única)', /if \(!_puede\) return showToast/.test(zAdv));
ok('ya NO queda el gate viejo que rebotaba al supervisor', !/if \(!canAdvance\) return showToast/.test(zAdv));
// el rebote tardío era el problema: no puede haber un return de permiso DESPUÉS de la recepción
const iRec = zAdv.indexOf('_recepcionHecha = true');
const iGate = zAdv.indexOf('SIN PERMISO PARA ESTA ACCIÓN', iRec > 0 ? iRec : 0);
ok('no hay ningún rechazo por permiso después de registrar la recepción', iRec > 0 && iGate < 0);

// ── 2. self-heal de los pedidos que ya quedaron mal ──
const zHeal = ex('function _healPedidosRecibidos(');
ok('existe el self-heal', !!zHeal);
let fH = null;
try { fH = new Function('return (' + zHeal + ')')(); } catch(e){}
if (fH) {
  const peds = [
    { id:'a', status:'APROBADO', recepcion:{ ts: 1 } },          // recibido pero clavado
    { id:'b', status:'APROBADO' },                                // sin recepción: no se toca
    { id:'c', status:'RECIBIDO', recepcion:{ ts: 1 } },           // ya está bien
    { id:'d', status:'SOLICITADO', recepcion:{ ts: 1 } }          // raro: tampoco se fuerza
  ];
  const n = fH(peds);
  ok('el pedido con recibo pasa a RECIBIDO', peds[0].status === 'RECIBIDO' && n === 1);
  ok('sella _ts (union-merge v972)', peds[0]._ts > 0);
  ok('deja historial de la corrección', (peds[0].history || []).some(h => h && h.to === 'RECIBIDO'));
  ok('no toca un pedido sin recepción', peds[1].status === 'APROBADO');
  ok('no re-marca uno ya recibido', peds[2].status === 'RECIBIDO' && !peds[2]._ts);
  ok('no fuerza estados anteriores a APROBADO', peds[3].status === 'SOLICITADO');
  ok('idempotente: la segunda pasada no cambia nada', fH(peds) === 0);
} else ok('_healPedidosRecibidos evaluable', false);
ok('el self-heal corre al PINTAR la lista (regla v983)', /_healPedidosRecibidos\(/.test(ex('function renderPedidosList(')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
