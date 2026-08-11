/* v1169 — EL NÚMERO DE PEDIDO SE RESERVA Y NO SE REPARTE DOS VECES

   EL CASO (11-ago): RONY creó el pedido ESSENZA F2 – 10 en su dispositivo, lo imprimió con
   firma y lo mandó por WhatsApp. Ese pedido nunca llegó a la nube. Como el número se DERIVA
   contando los pedidos VISIBLES (nextPedidoCode → _primerNumeroLibre), el 10 seguía "libre"
   para todos los demás: SUSANA hizo el suyo, recibió el MISMO 10 y le generó OC. Ya había
   pasado antes (dos VLA-11, incidente v1139).

   DECISIÓN DE ANTONIO (11-ago): "que ya no se reutilicen" los números. Revierte la regla de
   v992 (rellenar huecos), que además era una vía más para repartir dos veces el mismo número:
   bastaba con que un pedido se borrara —o no llegara— para que su número volviera al ruedo.

   EL DISEÑO: un contador MONÓTONO por prefijo (p.materiales.pedidoSeq[prefijo]) que solo
   puede subir. El próximo número es max(contador, mayor número visible) + 1.
     · Sobrevive al borrado: si se elimina el 7, el contador sigue en 7 y el próximo es el 8.
     · Se auto-sana: si el contador se pierde o llega atrasado, lo visible manda.
     · Su merge entre dispositivos es GANA EL MAYOR — idempotente, conmutativo y asociativo.
       Eso NO es un detalle: esta app ya tuvo dos incidentes por merges que no convergen
       (encienden needsResync en cada pasada y disparan bucles de re-subida). Un máximo no
       puede oscilar, así que es seguro sincronizarlo.

   ALCANCE: solo la serie de PEDIDOS. Los folios de OC/DESP/OP siguen con _primerNumeroLibre
   — Antonio no pidió cambiarlos y tienen otras reglas (v992/v994).

   OJO: esto reduce muchísimo el choque pero NO lo vuelve imposible por sí solo — dos personas
   sin conexión entre sí siguen pudiendo emitir el mismo número. La garantía de entrega va
   aparte; esto es la mitad del blindaje que no depende de la red. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— el próximo número (función pura) —');
const srcSig = ex(code, 'function _pedidoSeqSiguiente(');
ok('existe _pedidoSeqSiguiente', !!srcSig);
if (srcSig) {
  const sig = new Function(srcSig + '\nreturn _pedidoSeqSiguiente;')();
  ok('obra nueva: arranca en 1', sig(0, []) === 1);
  ok('sigue al último usado', sig(0, [1,2,3]) === 4);
  ok('NO rellena huecos (revierte v992) ← la decisión de Antonio', sig(0, [1,3]) === 4);
  ok('EL CASO RONY: el contador manda aunque el pedido no esté visible', sig(10, []) === 11);
  ok('un pedido borrado no devuelve su número al ruedo', sig(7, [1,2]) === 8);
  ok('se auto-sana: si lo visible va más adelante, gana lo visible', sig(5, [7]) === 8);
  ok('tolera basura en los usados', sig(0, [null, undefined, 'x', 4]) === 5);
  ok('tolera contador basura', sig('x', [2]) === 3 && sig(null, [2]) === 3);
  ok('nunca devuelve algo ya usado', (() => { for (let i=0;i<40;i++){ const u=[1,5,9]; if (u.indexOf(sig(0,u)) >= 0) return false; } return true; })());
}

console.log('\n— el merge entre dispositivos: GANA EL MAYOR —');
const srcMg = ex(code, 'function _mergePedidoSeq(');
ok('existe _mergePedidoSeq', !!srcMg);
if (srcMg) {
  const mg = new Function(srcMg + '\nreturn _mergePedidoSeq;')();
  ok('gana el mayor por prefijo', mg({A:5},{A:3}).A === 5 && mg({A:3},{A:5}).A === 5);
  ok('une prefijos distintos', (() => { const r = mg({A:5},{B:2}); return r.A === 5 && r.B === 2; })());
  /* LAS TRES PROPIEDADES que garantizan que este dato NO puede provocar un bucle de re-sync */
  ok('IDEMPOTENTE: aplicarlo dos veces da lo mismo',
    JSON.stringify(mg(mg({A:5},{A:3}),{A:3})) === JSON.stringify(mg({A:5},{A:3})));
  ok('CONMUTATIVO: no importa quién llegó primero',
    JSON.stringify(mg({A:5,B:1},{A:3,B:9})) === JSON.stringify(mg({A:3,B:9},{A:5,B:1})));
  ok('MONÓTONO: el resultado nunca baja', mg({A:9},{A:1}).A === 9 && mg({A:1},{A:9}).A === 9);
  ok('tolera null y vacío', (() => { try { return mg(null, {A:1}).A === 1 && JSON.stringify(mg(null,null)) === '{}'; } catch(e){ return false; } })());
}

console.log('\n— enganchado en la app —');
const npc = ex(code, 'window.nextPedidoCode = function(');
ok('nextPedidoCode usa el contador', /_pedidoSeqSiguiente\(/.test(npc));
ok('lee la serie del prefijo desde pedidoSeq', /pedidoSeq/.test(npc));
ok('sigue contando los pedidos visibles (auto-sanación)', /_mat\.pedidos/.test(npc));
ok('sigue contando las OC que citan un pedido', /pedidoNumero/.test(npc));

console.log('\n— la reserva se sella al CREAR (no al mirar) —');
ok('existe el sellador', /_pedidoSeqSellar\s*\(/.test(code));
const sellar = ex(code, 'function _pedidoSeqSellar(');
ok('el sellador es monótono: nunca baja el contador', /Math\.max|> *\(?cur|>= *v/.test(sellar));
ok('se sella en los DOS caminos de creación de pedido',
  (code.match(/_pedidoSeqSellar\(/g) || []).length >= 3);

console.log('\n— el contador viaja y se une en applyRemote —');
ok('el merge de proyectos une pedidoSeq', /_mergePedidoSeq\(/.test(code));

console.log('\n— los folios de OC NO se tocaron (otra serie, otras reglas) —');
ok('_primerNumeroLibre sigue existiendo', /function _primerNumeroLibre\(/.test(code));
ok('las OC siguen usándolo', (code.match(/_primerNumeroLibre\(/g) || []).length >= 5);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
