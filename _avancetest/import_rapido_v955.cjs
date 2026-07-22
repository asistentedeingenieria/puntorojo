/* v955 (reporte de Antonio: "se sigue tardando demasiado en cargar los archivos" —
   overlay CARGANDO bloqueando toda la pantalla). El flujo de subir el Excel de
   estimación (rama RESUMEN PR) hacía DENTRO del overlay: subida completa del estado
   tras las filas (await uploadCurrent #1), otra tras el avance (#2), el put del .xlsx
   a Storage, OTRA subida (#3) y TRES _notifyByPerm esperadas (cada una lee users).
   uploadFacturaPDF igual: 3 notifs esperadas antes de soltar el overlay.
   FIX: las subidas intermedias se eliminan — UNA SOLA CloudSync.forceUploadNow (con
   el coalescing v954) disparada al final SIN esperar (el chip SINCRONIZANDO informa);
   las notificaciones son fire-and-forget. El overlay se suelta apenas termina el
   trabajo real (parse + Storage del archivo). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFrom(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── rama RESUMEN PR: entre el confirm y el "COBRO ACTUALIZADO" ──
const iPR = html.indexOf('CARGAR DESDE "RESUMEN PR"');
const iFin = html.indexOf("showToast('COBRO ACTUALIZADO", iPR);
const zona = (iPR > -1 && iFin > iPR) ? html.slice(iPR, iFin) : '';
ok('zona RESUMEN PR localizada', zona.length > 500);
ok('sin subidas intermedias esperadas (await uploadCurrent fuera)', !/await CloudSync\.uploadCurrent\(\)/.test(zona));
ok('UNA sola subida final (forceUploadNow, coalesced v954)', (zona.match(/CloudSync\.forceUploadNow\(\)/g) || []).length === 1);
ok('la subida final NO bloquea el overlay (sin await)', !/await CloudSync\.forceUploadNow/.test(zona));
ok('notificaciones fire-and-forget en el import', !/await _notifyByPerm/.test(zona) && /_notifyByPerm\(/.test(zona));

// ── uploadFacturaPDF: notifs sin bloquear el overlay ──
const fac = extractFrom('async function uploadFacturaPDF(');
ok('uploadFacturaPDF: notifs sin await', !/await _notifyByPerm/.test(fac) && /_notifyByPerm\(/.test(fac));
ok('uploadFacturaPDF: sigue subiendo al toque (force v953)', /forceUploadNow/.test(fac));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
