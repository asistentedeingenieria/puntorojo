/* v841-fix (revisión adversarial): cerrar carreras de sync en la subida de documentos.
   #1/#2: re-validar irreversibilidad + secuencia tras la subida (3er re-read), borrando MI url.
   #5: borrar el archivo viejo SOLO si sigue siendo el que yo venía reemplazando (oldUrl===urlPrevia).
   #4: los modales de anticipo (_antModalWrap) entran a isUserBusy → applyRemote se posterga durante la subida. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractAt(startIdx){ let i=html.indexOf('{',startIdx),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(startIdx,i+1); } } return ''; }
function extractFn(name){ const m=html.indexOf('function '+name+'('); return m<0?'':extractAt(m); }
function extractAssigned(name){ const m=html.indexOf('window.'+name+' = '); return m<0?'':extractAt(m); }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// #4: isUserBusy posterga applyRemote con los modales de anticipo abiertos
const srcWrap = extractFn('_antModalWrap');
ok('_antModalWrap existe', !!srcWrap);
ok('_antModalWrap marca clase pr-ant-modal', srcWrap.indexOf('pr-ant-modal')>=0);
ok('isUserBusy incluye .pr-ant-modal', html.indexOf('#prRechazarModal, .pr-ant-modal')>=0);

// #1/#2/#5 en subirDocAnticipo
const srcSubir = extractAssigned('subirDocAnticipo');
ok('subirDocAnticipo existe', !!srcSubir);
ok('re-chequea irreversibilidad 3 veces (>=3 !esAdmin)', (srcSubir.match(/!esAdmin/g)||[]).length>=3);
ok('re-chequea secuencia tras subida (>=2 !sol2.facturaUrl)', (srcSubir.match(/!sol2\.facturaUrl/g)||[]).length>=2);
ok('captura urlPrevia antes de subir', srcSubir.indexOf('urlPrevia')>=0);
ok('borra el viejo SOLO si oldUrl===urlPrevia', /oldUrl===urlPrevia/.test(srcSubir));
ok('al abortar tras subir, borra MI url (limpieza)', srcSubir.indexOf('_borrarMiUrl')>=0);
// regresión hallada en review: abortar dejaba el modal .pr-ant-modal abierto → congelaba applyRemote (isUserBusy).
ok('cierra el modal en los aborts (no congela el sync)', srcSubir.indexOf('_cerrarDoc')>=0 && (srcSubir.match(/_cerrarDoc\(\)/g)||[]).length>=4);

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
