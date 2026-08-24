/* v1276 · SYNC VIGILADO (Antonio, 24-ago: "la de finanzas autoriza y a compras le
   aparece 20 MINUTOS después · el pedido del supervisor sale un día después o NO se
   sube · necesito que lo que se sube aparezca AL INSTANTE"):
   La BAJADA ya es tiempo real (onSnapshot v491 + resub v1197). Los huecos reales:
   (1) BUG: al confirmar una subida que NO escribió nada (_r === false), el early-return
       se saltaba _recuperarSnapDescartado — los snapshots descartados durante la subida
       jamás se releían: RECIBIR quedaba rehén de escribir bien.
   (2) Lo local sin confirmar (pedido POR ENVIAR v1170) solo se reintentaba cuando el
       usuario tocaba algo — el supervisor crea el pedido, guarda el teléfono, y nada
       reintenta: "hasta un día después".
   (3) Lo pospuesto por isUserBusy (usuario metido en un modal) se añejaba MUDO — la
       autorización estaba APLICADA en el dispositivo pero invisible ("20 minutos").
   FIX (ciclo de vida puro, cero cambios de merge/forma canónica — patrón v1197):
   recuperar SIEMPRE lo descartado · VIGILANTE (60 s + volvió-la-señal + volver a la
   pestaña + arranque con pendientes) que re-sube lo pendiente solo · marca _dirtyTs ·
   aviso "LLEGARON CAMBIOS DEL EQUIPO" a los 2 min de pospuesto · telemetría sync-* en
   loginDiag (misma regla, ids idempotentes). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* ── 1. recibir JAMÁS depende de escribir ── */
const zSched = ex('scheduleSave(){');
ok('scheduleSave: _recuperarSnapDescartado corre ANTES del early-return de _r===false',
  /_recuperarSnapDescartado\(\)[\s\S]{0,300}if \(_r === false\) return/.test(zSched));
const zForce = ex('async forceUploadNow(){');
ok('forceUploadNow: ídem antes del return false',
  /_recuperarSnapDescartado\(\)[\s\S]{0,300}if \(!_escribio\) return false/.test(zForce));

/* ── 2. vigilante de pendientes ── */
const zVig = ex('_vigilarPendientes(motivo){');
ok('_vigilarPendientes existe y mira los pendientes v1170 y la marca _dirtyTs',
  /_pedPendGet/.test(zVig) && /_fotosPendGet/.test(zVig) && /_dirtyTs/.test(zVig));
ok('no dispara con el canal ocupado ni sin red',
  /navigator\.onLine === false/.test(zVig) && /pendingWrite \|\| this\.uploadingNow \|\| this\._subidaEnVuelo/.test(zVig));
ok('reintenta vía scheduleSave y deja rastro sync-reintento (rate-limited)',
  /scheduleSave\(\)/.test(zVig) && /sync-reintento-pendientes/.test(zVig) && /_vigDiagUlt/.test(zVig));
ok('init: vigilante cada 60 s + al volver la señal', /_vigilanteTimer = setInterval/.test(html) && /'online', \(\) => \{ try \{ this\._vigilarPendientes/.test(html));
ok('init: arranque con pendientes marcados re-sube solo', /sync-arranque-con-pendientes/.test(html));
ok('al volver a la pestaña también vigila', /_vigilarPendientes\('volví a la pestaña'\)/.test(html));

/* ── 3. marca de "hay algo local sin confirmar" ── */
ok('scheduleSave siembra _dirtyTs', /scheduleSave\(\)\{\s*if \(!this\.enabled\) return;\s*this\._dirtyTs = Date\.now\(\)/.test(html.slice(html.indexOf('scheduleSave(){'))));
ok('la confirmación con escritura la limpia', /if \(_r === false\) return;\s*this\._dirtyTs = 0/.test(zSched));

/* ── 4. lo pospuesto añejo AVISA ── */
const iApply = html.indexOf('if (!opts.initial && this.isUserBusy())');
const zBusy = html.slice(iApply, iApply + 1400);
ok('a los 2 min de pospuesto: toast + rastro sync-pospuesto-largo', /LLEGARON CAMBIOS DEL EQUIPO/.test(zBusy) && /sync-pospuesto-largo/.test(zBusy));
ok('al aplicar se resetea el reloj del pospuesto', /_pospuestoDesde = 0/.test(zBusy));

/* ── 5. fallos y candados con rastro ── */
ok('el catch del debounce deja rastro sync-subida-fallo', /sync-subida-fallo/.test(zSched));
ok('el catch de forceUploadNow también', /sync-subida-fallo/.test(zForce));
ok('el guard de 45 s deja rastro (las épocas de "sube a ciegas")', /sync-guard-45s/.test(zSched) && /sync-guard-45s/.test(zForce));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
