/* v944 (reporte de Antonio: "¿por qué ya NO sale la firma de la persona que autorizó?"):
   (1) state.firmasUsuarios viajaba en el CORE por LWW puro — otro dispositivo con copia
       vieja pisaba la firma recién registrada (mismo bug que caras v611 / colaboradores
       v663). BLINDAJE en applyRemote: el remoto NUNCA borra una firma local que no trae;
       borrado deliberado = tombstone firmasEliminadas (solo admin) que gana SOLO si es
       más nuevo que el registro (firmasTs) — así re-registrar tras un borrado no revive
       el tombstone viejo. Cambio de SYNC ⇒ APP_SYNC_VERSION 906.
   (2) El sello REVISADO pasa de position:absolute a IR EN FILA al lado derecho de la
       firma (flex) — geométricamente imposible que la tape. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
function extractMethod(sig){ let m=html.indexOf(sig); if(m<0) return ''; let i=m+sig.length-1,d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. blindaje de firmas en applyRemote ──
const ap = extractMethod('applyRemote(remoteData, opts = {}){');
ok('BLINDAJE: el remoto no borra una firma local que no trae', /BLINDAJE DE FIRMAS/.test(ap) && /firmasUsuarios/.test(ap));
ok('firma preservada dispara re-subida (needsResync)', /firmasUsuarios\[k\] = _locF\[k\]; needsResync = true/.test(ap.replace(/\s+/g,' ')) || (/merged\.firmasUsuarios\[k\]/.test(ap) && ap.indexOf('needsResync = true', ap.indexOf('BLINDAJE DE FIRMAS')) > -1));
ok('tombstones unidos (firmasEliminadas) matan SOLO si son más nuevos que el registro', /firmasEliminadas/.test(ap) && /firmasTs/.test(ap));

// ── 2. registrar sella firmasTs y limpia tombstone; admin borra con tombstone ──
const g = extractFn('_firmaGuardar');
ok('registrar sella firmasTs (para ganarle a tombstones viejos)', /firmasTs\[/.test(g) && /Date\.now\(\)/.test(g));
ok('registrar limpia el tombstone propio', /firmasEliminadas/.test(g));
const b = extractFn('_adminBorrarFirma');
ok('el borrado del admin escribe tombstone (no solo delete)', /firmasEliminadas\[[^\]]+\] = Date\.now\(\)/.test(b.replace(/\s+/g,' ')) || /firmasEliminadas/.test(b));

// ── 3. sello EN FILA al lado de la firma (no puede tapar) ──
const src = extractFn('printOrdenCompra');
ok('el sello ya NO es absoluto', !/position:absolute;right:-\d+px;bottom:\d+px/.test(src));
ok('firma y sello van en FILA (flex, sello a la derecha)', /display:flex;align-items:flex-end[^"]*"[^]{0,900}REVISADO/.test(src));
ok('conserva recuadro rojo, rotación y fecha corta', /border:2px solid #D0151C/.test(src) && /_fechaSelloCorta/.test(src));

// ── 4. ritual de sync ──
ok('APP_SYNC_VERSION al menos 906', (Number((html.match(/const APP_SYNC_VERSION = (\d+)/) || [])[1]) || 0) >= 906);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
