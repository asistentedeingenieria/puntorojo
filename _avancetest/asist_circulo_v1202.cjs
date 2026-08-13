/* v1202 — EL CÍRCULO VICIOSO DE LA ASISTENCIA, CERRADO (diagnóstico 11-ago, mordió en
   vivo el 13-ago 9am: resource-exhausted "Write stream exhausted maximum allowed queued
   writes" + "ignorando remote — hay escritura local pendiente" en la hora pico de marcado).

   EL CÍRCULO: (1) scheduleAsistenciaSave NO encadenaba — el guard de 45 s liberaba la
   bandera y la SIGUIENTE marca despachaba OTRA transacción sobre la cola aún saturada
   (falsificado el 11-ago con CERO usuarios: un solo cliente se apila solo). (2) El baseline
   (_asistDayHashes/_asistHash) solo se sembraba en applyRemote, que se SALTEA con escritura
   pendiente ⇒ sin baseline, el early-exit "sin cambios → no escribir" nunca ahorraba
   transacciones. (3) El archivador automático colgaba de applyRemote+45s — lo único que no
   corre cuando el canal está ocupado, justo cuando más falta hace.

   LOS TRES CIERRES: gate _asistTxEnVuelo en _asistUploadSmart (una transacción a la vez,
   bandera _asistReSave corre UNA más al confirmar — patrón v1186); siembra del baseline en
   el FLUSH del snapshot (antes del pendingWrite-skip, solo-lectura sobre lo bajado, misma
   semántica que la siembra de applyRemote); y _asistArchAutoIntentar también al ARRANCAR. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— 1. una transacción de asistencia a la vez —');
const up = ex(code, 'async _asistUploadSmart(db, stamp){');
ok('el gate existe y NO despacha encima (bandera y afuera)', /if \(this\._asistTxEnVuelo\) \{ this\._asistReSave = true; return; \}/.test(up));
ok('la bandera se prende antes del cuerpo', /this\._asistTxEnVuelo = true;/.test(up));
ok('al confirmar se corre UNA más con estado fresco (finally)', /finally \{[\s\S]*?_asistTxEnVuelo = false;[\s\S]*?_asistReSave[\s\S]*?scheduleAsistenciaSave/.test(up));
ok('el cuerpo real quedó protegido (la transacción está dentro del try)', /try \{[\s\S]*?runTransaction/.test(up));

console.log('\n— 2. el baseline se siembra en el FLUSH (no solo en applyRemote) —');
const iF = code.indexOf('this._snapCoalesce = setTimeout(');
const zF = code.slice(iF, iF + 1600);
ok('el flush se encuentra', iF > 0);
ok('siembra _asistDayHashes desde lo bajado ANTES de applyRemote', /_asistDocOnly/.test(zF) && zF.indexOf('_asistDocOnly') < zF.indexOf('applyRemote(d'));
ok('siembra también _asistHash (mismo criterio que applyRemote: lo BAJADO)', /this\._asistHash = JSON\.stringify\(d\._asistDocOnly\)/.test(zF));

console.log('\n— 3. el archivador también corre al ARRANCAR —');
const zInit = ex(code, 'async init(){');
ok('init agenda _asistArchAutoIntentar (independiente del sync ocupado)', /_asistArchAutoIntentar/.test(zInit));

console.log('\n— 4. lo que NO cambió —');
ok('el guard de 45 s sigue (libera el chip, no la disciplina)', /la asistencia no confirmó en/.test(html));
ok('la transacción day-diff v896/v902 sigue intacta', /_asistDiffDays\(cloudDayJson, merged\)/.test(up) && /runTransaction/.test(up));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
