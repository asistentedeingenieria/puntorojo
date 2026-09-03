/* v1260 (Antonio, 18-ago, con dos EF2-10 en la mano: "eso NO puede pasar — son
   correlativos diferentes para TODOS"). El contador v1169 es merge-max, no transaccional:
   dos dispositivos creando a la vez tomaban el MISMO número. Dos capas:
   1. RESERVA INMEDIATA: al sellar el número, forceUploadNow — la ventana de colisión
      baja de minutos (debounce) a ~1 segundo.
   2. SELF-HEAL determinista en el merge (_pedidosRenumeraColisiones): colisión dentro
      del contenedor ⇒ el gemelo MÁS JOVEN (ts, luego id) que AÚN NO TIENE ÓRDENES se
      renumera al siguiente libre del prefijo, sella _ts, re-sella su copia del QR
      (verifOk=false, gate v1244) y reserva el número nuevo. Con órdenes vivas NO se
      toca (la hoja ya viajó — por eso los dos EF2-10 históricos quedan). Idempotente.
      Toca applyRemote ⇒ APP_SYNC 942. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— 1. reserva inmediata —');
ok('los DOS selladores de número fuerzan la subida al instante', (function(){
  const a = html.indexOf("_pedidoSeqSellar(proyectoTipo === 'MANUAL'");
  const b = html.indexOf('_pedidoSeqSellar(p.materiales, numero); } catch(e){}   // v1169');
  return a > 0 && /forceUploadNow/.test(html.slice(a, a + 400)) && b > 0 && /forceUploadNow/.test(html.slice(b, b + 400));
})());

console.log('— 2. self-heal determinista —');
const zH = ex('function _pedidosRenumeraColisiones(');
ok('existe el helper', zH.length > 400);
let f = null;
try { f = new Function('_pedidoSeqSellar', 'return (' + zH + ')')(function(cont, num){
  const m = String(num).match(/^(.*?)\s*[–-]\s*(\d+)\s*$/); if (!m) return;
  cont.pedidoSeq = cont.pedidoSeq || {}; const p = m[1].trim(), n = parseInt(m[2], 10);
  if (n > (cont.pedidoSeq[p] || 0)) cont.pedidoSeq[p] = n;
}); } catch(e){}
if (f) {
  const mk = () => ({
    pedidos: [
      { id: 'a', numero: 'EF2 – 10', ts: 100 },
      { id: 'b', numero: 'EF2 – 10', ts: 200 },
      { id: 'c', numero: 'EF2 – 11', ts: 300 }
    ],
    ordenes: [], pedidoSeq: { 'EF2': 11 }
  });
  const c1 = mk();
  ok('renumera al MÁS JOVEN al siguiente libre (11 ocupado ⇒ 12)', f(c1) === true && c1.pedidos[1].numero === 'EF2 – 12' && c1.pedidos[0].numero === 'EF2 – 10');
  ok('sella _ts y re-sella la copia del QR', c1.pedidos[1]._ts > 0 && c1.pedidos[1].verifOk === false);
  ok('reserva el número nuevo en el contador', c1.pedidoSeq['EF2'] === 12);
  ok('idempotente: segunda pasada sin cambios', f(c1) === false);
  const c2 = mk();
  c2.ordenes = [{ id: 'o1', pedidoId: 'b', status: 'AUTORIZADA' }];
  /* v1314 (caso VEC-151): antes "los dos históricos quedan" era el caso degenerado —
     ahora el DUEÑO del número es quien tiene OC (b) y el viejo sin OC (a) se renumera */
  ok('con OC en el joven: el joven conserva y el viejo sin OC se renumera', f(c2) === true && c2.pedidos[1].numero === 'EF2 – 10' && c2.pedidos[0].numero === 'EF2 – 12');
  const c3 = mk();
  c3.pedidos[1].status = 'CANCELADO';
  ok('un CANCELADO no cuenta como colisión', f(c3) === false);
} else ok('helper evaluable', false);
ok('los 3 contenedores lo corren tras el merge de órdenes',
  (html.match(/_pedidosRenumeraColisiones\((rp\.materiales|_bmR|_vmR)\)/g) || []).length === 3);
/* v1278: la versión siguió subiendo (943 con pedarch) — la intención de esta aserción
   es "quedó EN o ARRIBA de 942", no clavar el número para siempre */
ok('APP_SYNC_VERSION en 942 o más', (Number((html.match(/const APP_SYNC_VERSION = (\d+);/) || [])[1]) || 0) >= 942);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
