/* v1307 · CASO VLA-47 (Antonio, 28-ago): el supervisor generó VLA-47 desde receta, la hoja
   con QR salió, pero el pedido NUNCA llegó a la nube — solo el número quedó quemado.
   CAUSA (auditoría 4 frentes): pedirEtapaCompleta era el ÚNICO creador de pedidos SIN el
   blindaje v1170: (a) el forceUploadNow de la reserva viaja ANTES del push — sube el número
   sin el pedido; (b) tras el push solo saveState() con debounce, sin confirmar ni avisar;
   (c) el toast verde mentía antes de intentar escribir; (d) p/t/l capturados antes del await
   del modal (regla v940 violada — push a objeto huérfano posible); (e) _forceInFlight
   colgado bloqueaba TODA subida futura sin rescate.
   FIX: cinturón v1170 completo post-push + re-lectura del state vivo + abandono a 90s. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const fn = html.slice(html.indexOf('async function pedirEtapaCompleta'), html.indexOf('v982: AUTO-SINCRONIZAR'));
const iPush = fn.indexOf('p.materiales.pedidos.push(pedido)');
ok('slice y push localizados', fn.length > 1000 && iPush > 0);
const post = fn.slice(iPush);

/* 1) blindaje v1170 DESPUÉS del push */
ok('marca POR ENVIAR (_pedPendAdd)', post.includes('_pedPendAdd(pedido.id)'));
ok('fuerza y ESPERA la subida', post.includes('(await CloudSync.forceUploadNow()) !== false'));
ok('sella nubeOk y limpia pendientes solo si confirmó', post.includes('pedido.nubeOk = true') && post.includes('_pedPendClear()'));
ok('aviso honesto _pedidoAvisoEnvio', post.includes('_pedidoAvisoEnvio(_nubeOk'));
ok('copia sellada del QR viaja al crear', post.includes('_pedVerifSubir(pedido, p)'));
ok('el toast mentiroso murió', !fn.includes('GENERADO AUTOMÁTICAMENTE'));

/* 2) regla v940: re-leer el state vivo tras los awaits, ANTES de mutar */
ok('p/t/l re-asignables', fn.includes('let p = activeProj()'));
const iRelee = fn.indexOf('_pvivo');
ok('re-lectura tras el modal y antes de la reserva', iRelee > 0 && iRelee < fn.indexOf('pedidoCounter') && /const _pvivo = activeProj\(\)/.test(fn));
ok('aborta si la obra cambió (sin mutar nada)', /_pvivo\.id !== p\.id/.test(fn));

/* 3) canal colgado: _forceInFlight se abandona a los 90s (patrón v1276) */
const force = html.slice(html.indexOf('async forceUploadNow()'), html.indexOf('async forceUploadNow()') + 7000);
const iAband = force.indexOf('this._forceInFlight === _miForce');
ok('abandono 90s libera _forceInFlight', iAband > 0 && force.slice(iAband, iAband + 400).includes('this._forceInFlight = null') && force.includes('}, 90000)'));
ok('abandono 90s libera también _forceQueued', iAband > 0 && force.slice(iAband, iAband + 400).includes('this._forceQueued = null'));

/* 4) cambio de lógica de sync ⇒ APP_SYNC sube (ritual v892); piso, no igualdad */
const m = html.match(/APP_SYNC_VERSION = (\d+)/);
ok('APP_SYNC_VERSION >= 946', m && Number(m[1]) >= 946);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
