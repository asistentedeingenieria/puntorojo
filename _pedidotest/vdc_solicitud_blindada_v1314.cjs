/* v1314 · CASO VEC-151/152 (Antonio, 03-sep): Rony creó dos SOLICITUDES DE ETAPA (v1256)
   en VDC; el toast dijo CREADA, la hoja QR salió, pero compras no las veía y Susana acuñó
   OTRO VEC-151 (con OC). Auditoría (wf_4754ec0b): _vdcPedirEtapaObs era el ÚLTIMO creador
   sin cinturón v1170/v1307 (forceUploadNow fire-and-forget, sin POR ENVIAR, sin nubeOk,
   toast que miente) y NUNCA reservaba el número (_pedidoSeqSellar). Encima
   _pedidosRenumeraColisiones jamás tocaba al gemelo MÁS VIEJO: si el joven tenía OC,
   "dos 151 para siempre". FIX: (1) cinturón completo + reserva en la solicitud; (2) el
   DUEÑO del número es quien tiene OC (si nadie, el más viejo) y se renumeran los demás sin
   OC, contando también los números citados por OCs; (3) el bus devuelve su promesa y el
   creador cuenta la entrega por bus; (4) el injerto del bus corre la renumeración; (5) el
   auto-rescate del bus también corre desde el vigilante (fuera de applyRemote). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
function ex(sig){ let i=html.indexOf(sig); if(i<0) return ''; let s=html.indexOf('{',i), d=0; for(let j=s;j<html.length;j++){ if(html[j]==='{')d++; else if(html[j]==='}'){ d--; if(d===0) return html.slice(i,j+1); } } return ''; }

/* ── 1) el creador de la solicitud con el MISMO cinturón ── */
const fn = html.slice(html.indexOf('window._vdcPedirEtapaObs = async function'), html.indexOf('function _solEtapaHeal('));
const iPush = fn.indexOf('p.materiales.pedidos.push(pedido)');
ok('creador localizado', fn.length > 1500 && iPush > 0);
const pre = fn.slice(0, iPush), post = fn.slice(iPush);
ok('reserva el número al acuñar (_pedidoSeqSellar)', pre.includes('_pedidoSeqSellar(p.materiales, numero)'));
ok('la reserva NO viaja sola antes del push', !pre.includes('forceUploadNow'));
ok('marca POR ENVIAR', post.includes('_pedPendAdd(pedido.id)'));
ok('fuerza y ESPERA el doc gordo', post.includes('(await CloudSync.forceUploadNow()) !== false'));
ok('cuenta la entrega por bus (promesa del bus)', /_busOk\s*=\s*\(?await _pedBusEmitir\(pedido, p\.id\)/.test(post));
ok('nubeOk + limpia pendientes solo si el doc gordo confirmó', post.includes('pedido.nubeOk = true') && post.includes('_pedPendClear()'));
ok('aviso honesto', post.includes('_pedidoAvisoEnvio(_nubeOk || _busOk'));
ok('el toast mentiroso murió', !fn.includes('CREADA — AHORA COMPARTILA'));
ok('sigue mandando a compartir (v1256)', /COMPARTILA/.test(fn) && /openPedidoDetalle\(/.test(fn));
ok('bus v1309 y copia sellada siguen', post.includes('_pedBusEmitir(pedido, p.id)') && post.includes('_pedVerifSubir(pedido, p)'));

/* ── 2) renumeración: el dueño es quien tiene OC; si nadie, el más viejo ── */
const zH = ex('function _pedidosRenumeraColisiones(');
ok('helper extraído', zH.length > 400);
if (zH) {
  const f = new Function('_pedidoSeqSellar', zH + '\nreturn _pedidosRenumeraColisiones;')(function(c, n){ const m=String(n).match(/(\d+)\s*$/); const k=String(n).replace(/\s*[–-]\s*\d+\s*$/,''); c.pedidoSeq=c.pedidoSeq||{}; c.pedidoSeq[k]=Math.max(c.pedidoSeq[k]||0, m?+m[1]:0); });
  /* caso VEC-151 real: viejo SIN OC (Rony) vs joven CON OC (Susana) */
  const c1 = { pedidos: [ { id:'rony', numero:'VEC – 151', ts:100 }, { id:'susana', numero:'VEC – 151', ts:200 }, { id:'r2', numero:'VEC – 152', ts:150 } ], ordenes: [ { id:'o1', pedidoId:'susana', status:'AUTORIZADA' } ], pedidoSeq: { 'VEC': 152 } };
  ok('el que tiene OC conserva el número aunque sea más joven', f(c1) === true && c1.pedidos[1].numero === 'VEC – 151');
  ok('el viejo sin OC se renumera al siguiente libre (152 ocupado ⇒ 153)', c1.pedidos[0].numero === 'VEC – 153' && c1.pedidos[0].verifOk === false && c1.pedidos[0]._ts > 0);
  ok('reserva el nuevo en el contador', c1.pedidoSeq['VEC'] === 153);
  ok('idempotente', f(c1) === false);
  /* sin OC en ninguno: el más viejo conserva (v1260 intacto) */
  const c2 = { pedidos: [ { id:'a', numero:'EF2 – 10', ts:100 }, { id:'b', numero:'EF2 – 10', ts:200 } ], ordenes: [], pedidoSeq: { 'EF2': 10 } };
  ok('sin OC gana el más viejo', f(c2) === true && c2.pedidos[0].numero === 'EF2 – 10' && c2.pedidos[1].numero === 'EF2 – 11');
  /* los dos con OC: no se toca nada */
  const c3 = { pedidos: [ { id:'a', numero:'X – 5', ts:1 }, { id:'b', numero:'X – 5', ts:2 } ], ordenes: [ { pedidoId:'a', status:'AUTORIZADA' }, { pedidoId:'b', status:'AUTORIZADA' } ], pedidoSeq: {} };
  ok('dos con OC: intocables', f(c3) === false);
  /* los números citados por OCs de pedidos borrados también cuentan como usados */
  const c4 = { pedidos: [ { id:'a', numero:'Y – 7', ts:1 }, { id:'b', numero:'Y – 7', ts:2 } ], ordenes: [ { pedidoId:'zzz', pedidoNumero:'Y – 8', status:'AUTORIZADA' } ], pedidoSeq: {} };
  ok('salta un número que una OC ya cita', f(c4) === true && c4.pedidos[1].numero === 'Y – 9');
} else { fail += 7; }

/* ── 3) el bus devuelve su promesa ── */
const zE = ex('function _pedBusEmitir(');
ok('_pedBusEmitir devuelve la promesa del set (no la traga)', /return doc\.set\(nuevo\)\.then\(\(\) => true\)\.catch\(\(\) => false\)/.test(zE) && /return doc\.set\(\{ \[pd\.id\]: e, _last: Date\.now\(\) \}, \{ merge: true \}\)\.then\(\(\) => true\)\.catch\(\(\) => false\)/.test(zE));

/* ── 4) el injerto corre la renumeración en cada contenedor tocado ── */
const zI = ex('function _pedBusInjertar(');
ok('injerto → renumeración por contenedor', /_pedidosRenumeraColisiones\(/.test(zI) && /tocados/.test(zI));

/* ── 5) auto-rescate del bus también desde el vigilante ── */
const zV = ex('_vigilarPendientes(motivo)');
ok('vigilante corre _pedBusAutoEmitir', /_pedBusAutoEmitir\(\)/.test(zV));

/* ── 6) cambio de merge ⇒ ritual v892 (piso) ── */
const m = html.match(/APP_SYNC_VERSION = (\d+)/);
ok('APP_SYNC_VERSION >= 949', m && Number(m[1]) >= 949);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
