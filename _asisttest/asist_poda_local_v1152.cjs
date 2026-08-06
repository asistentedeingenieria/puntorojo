/* v1152 — INCIDENTE 6-ago (10:25 am): la copia LOCAL no se podaba y el ciclo volvió

   Antonio, a gritos: "NO ME ESTA SINCRONIZANDO... LA GENTE ESTA SUBIENDO PEDIDOS Y NO ME
   SALEN". Consola: payload de asistencia de 934 kB + resource-exhausted + "ignorando
   remote — hay escritura local pendiente".

   CAUSA RAÍZ (no era el archivado el que falló — la nube estaba PODADA en 447 kB desde la
   mañana, verificado): la copia LOCAL solo se podaba cuando applyRemote lograba APLICAR un
   snapshot (guard B, v1135)... y el dispositivo del admin casi nunca lo aplica porque
   SIEMPRE tiene escrituras pendientes. Círculo vicioso: sube el payload GORDO (934 kB) →
   satura la cola del SDK (resource-exhausted) → se saltea applyRemote (pendingWrite) → la
   copia local nunca se poda → vuelve a subir gordo. El dispositivo deja de RECIBIR.

   EL ARREGLO: _asistPodarLocal() — la poda deja de depender de que un snapshot logre
   aplicarse: se poda la COPIA LOCAL directamente al inicio de CADA subida de asistencia
   (antes del hash). Es la misma semántica del guard B (los días < corte están VERIFICADOS
   en el archivo — el corte solo avanza tras la verificación día-por-día de v1148); acá
   solo se ejecuta proactivamente. Fail-open: sin corte no poda nada. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— la poda de la copia local —');
const zP = ex(html, 'function _asistPodarLocal(');
ok('existe', !!zP);
let podarFn = null;
try { if (zP) podarFn = new Function('state', '_asistCutoffVigente', 'return (' + zP + ')'); } catch(e){}
const podar = podarFn ? ((asis, cut) => {
  const st = { asistenciaGlobal: asis };
  return { n: podarFn(st, () => cut)(), st };
}) : null;
ok('evalúa', typeof podar === 'function');
if (podar) {
  const asis = { '2026-06-10': { p1: {} }, '2026-07-05': { p2: {} }, '2026-07-06': { p3: {} }, '2026-08-06': { p4: {} } };
  let r = null;
  try { r = podar(JSON.parse(JSON.stringify(asis)), '2026-07-06'); } catch(e){ r = null; }
  ok('poda lo ESTRICTAMENTE menor al corte', r && !r.st.asistenciaGlobal['2026-06-10'] && !r.st.asistenciaGlobal['2026-07-05']);
  ok('el día del corte SE QUEDA (regla v1135)', r && !!r.st.asistenciaGlobal['2026-07-06'] && !!r.st.asistenciaGlobal['2026-08-06']);
  ok('devuelve cuántos podó', r && r.n === 2);
  ok('FAIL-OPEN: sin corte no poda nada', (function(){ const x = podar(JSON.parse(JSON.stringify(asis)), ''); return x && x.n === 0 && Object.keys(x.st.asistenciaGlobal).length === 4; })());
  ok('corte malformado no poda nada', (function(){ const x = podar(JSON.parse(JSON.stringify(asis)), '06/07'); return x && x.n === 0; })());
  ok('sin asistencia no revienta', (function(){ try { return podar(null, '2026-07-06').n === 0; } catch(e){ return false; } })());
}

console.log('\n— cableada donde rompe el ciclo —');
const zU = ex(code, 'async _asistUploadSmart(db, stamp)');
ok('la subida poda ANTES de armar el payload y el hash',
  /_asistPodarLocal\(\)/.test(zU) && zU.indexOf('_asistPodarLocal') < zU.indexOf('JSON.stringify(_asistPayload)'));
ok('el hash-skip sigue después (sin cambios no escribe)', /_asistHash === _asistJson/.test(zU));
ok('la telemetría de tamaño sigue (v649)', /_asistSizeWarned/.test(zU));

console.log('\n— el ritual de sync —');
ok('APP_SYNC_VERSION subió a 927', /APP_SYNC_VERSION = 927/.test(html));
ok('los guards A/B del merge siguen intactos (la poda no los reemplaza)', /GUARD A/.test(html) && /GUARD B/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
