/* v1298 · BUS DE AUTORIZACIONES (Antonio, 27-ago: "finanzas YA autorizó y aun NO le
   sale a nadie — QUIERO QUE UNA VEZ SE AUTORICE LE SALGA A LOS CORRESPONDIENTES"):
   la firma viajaba SOLO adentro del doc gordo del proyecto (~700 KB) — con internet de
   obra esa subida falla o tarda (probado: la copia sellada del QR, de 2 KB y canal
   propio, SÍ llegó mientras la firma no). Ahora la firma viaja ADEMÁS en un doc
   chiquito: appState/autzBus.
   - EMISIÓN (_autzBusEmitir): al autorizar, entrada {n,por,porU,ts,tok,fd,sd,st,_ts}
     por oc.id con set merge (autorizadores concurrentes no se pisan); poda a 7 días
     cuando el bus pasa de 80 entradas.
   - RETIRAR (_autzBusRetirar): tumba {ret:ahora} — ret MÁS NUEVO que ts mata el
     injerto (y una re-autorización posterior escribe ts nuevo > ret y revive).
   - RECEPCIÓN: el router de snapshots (v491) ya escucha la colección — cero listeners
     nuevos; doc.id 'autzBus' se guarda en window._autzBusRemoto y applyRemote llama
     _autzBusInjertar(): injerta la firma en la orden local (3 contenedores), SIN
     needsResync (nada de manadas de re-subida; el doc canónico converge solo).
     Guardas: CANCELADA no; autzRetirada más nueva no; ya-autorizada igual o más nueva
     no. Idempotente. Los repintados v1248/v1293 la enseñan al instante.
   - AUTO-RESCATE (_autzBusAutoEmitir): cualquier aparato que TENGA una autorización
     de las últimas 48 h que al bus le falte (o esté vieja) la emite — así las firmas
     atascadas de HOY salen solas en cuanto Erlin recargue, sin consola.
   Toca applyRemote/router ⇒ APP_SYNC 944 → 945 (ritual v892). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* ── 1. emisión ── */
const zE = ex('function _autzBusEmitir(');
ok('_autzBusEmitir existe y escribe appState/autzBus con merge', /appState'\)\.doc\('autzBus'\)/.test(zE) && /merge: true/.test(zE));
ok('la entrada lleva lo necesario para injertar', ['por', 'ts', 'tok', 'fd', 'sd'].every(k => new RegExp(k + ':').test(zE)));
ok('poda a 7 días cuando el bus engorda (>80)', /> 80/.test(zE) && /864e5|7 \* 24/.test(zE));
ok('el AUTORIZAR emite al bus tras sellar', (function(){ const i = html.indexOf('oc.selloDigital = `AUTORIZADO DIGITALMENTE POR'); return i > 0 && /_autzBusEmitir\(oc\)/.test(html.slice(i, i + 500)); })());
ok('el RETIRAR escribe la tumba ret', (function(){ const i = html.indexOf('oc2.autzRetirada = {'); return i > 0 && /_autzBusRetirar\(oc2\)/.test(html.slice(i, i + 1600)); })() && /ret: Date\.now\(\)/.test(ex('function _autzBusRetirar(')));

/* ── 2. recepción ── */
ok('el router de snapshots guarda el bus', /doc\.id === 'autzBus'/.test(html) && /_autzBusRemoto/.test(html));
const zI = ex('function _autzBusInjertar(');
ok('_autzBusInjertar existe', zI.length > 500);
ok('applyRemote lo llama SIN needsResync (antes de los repintados)', (function(){
  const i = html.indexOf('_autzBusInjertar()', html.indexOf('applyRemote'));
  const zCtx = html.slice(i - 700, i + 200);
  return i > 0 && !/needsResync = true/.test(zCtx) && html.indexOf('_autzBusInjertar()') < html.indexOf("console.warn('[v1248] repintado COMPRAS'");
})());

/* ── 3. el injerto, FUNCIONAL ── */
if (zI.length > 500) {
  try {
    const inj = (bus, ordenes) => {
      const st = { projects: [{ materiales: { ordenes: ordenes } }], bodegaMat: { ordenes: [] }, variosMat: { ordenes: [] } };
      const w = { _autzBusRemoto: bus };
      const hubo = new Function('window', 'state', zI + '\nreturn _autzBusInjertar();')(w, st);
      return { hubo, ordenes };
    };
    const E = { n: 'OC2 - 000074', por: 'ERLIN TRIGUEROS', porU: 'oficina', ts: 1000, tok: 'tok74', fd: 'F', sd: 'S', st: 'AUTORIZADA', _ts: 1001 };
    const r1 = inj({ o74: E, _last: 1 }, [{ id: 'o74', status: 'PENDIENTE_AUTORIZACION', _ts: 5 }]);
    ok('injerta la firma completa y sella _ts', r1.hubo === true && r1.ordenes[0].status === 'AUTORIZADA' && r1.ordenes[0].autorizadoPor === 'ERLIN TRIGUEROS' && r1.ordenes[0].verifTok === 'tok74' && r1.ordenes[0]._ts >= 1001);
    ok('idempotente: segunda pasada no cambia nada', inj({ o74: E }, [r1.ordenes[0]]).hubo === false);
    ok('la tumba ret más nueva mata el injerto', inj({ o74: Object.assign({}, E, { ret: 2000 }) }, [{ id: 'o74', status: 'PENDIENTE_AUTORIZACION' }]).hubo === false);
    ok('re-autorización posterior a la tumba revive (ts > ret)', inj({ o74: Object.assign({}, E, { ret: 2000, ts: 3000 }) }, [{ id: 'o74', status: 'PENDIENTE_AUTORIZACION' }]).hubo === true);
    ok('CANCELADA no se toca', inj({ o74: E }, [{ id: 'o74', status: 'CANCELADA' }]).hubo === false);
    ok('una retirada local más nueva que la firma manda', inj({ o74: E }, [{ id: 'o74', status: 'DEVUELTA', autzRetirada: { ts: 5000 } }]).hubo === false);
    ok('orden que no está aquí no revienta', inj({ oX: E }, [{ id: 'o74' }]).hubo === false);
  } catch(e){ ok('injerto evaluable', false); console.log('  ' + e.message); }
}

/* ── 4. auto-rescate y ritual ── */
const zA = ex('function _autzBusAutoEmitir(');
ok('auto-rescate: emite lo autorizado reciente que al bus le falta', /48/.test(zA) && /_autzBusEmitir\(/.test(zA) && /_autzBusInjertar\(\)/.test(html) && /_autzBusAutoEmitir\(\)/.test(html.slice(html.indexOf('applyRemote'))));
ok('APP_SYNC_VERSION subió a 945', /const APP_SYNC_VERSION = 945/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
