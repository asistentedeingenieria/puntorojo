/* v953 INCIDENTE 18-jul (reporte de Antonio): facturas subidas y estimaciones marcadas
   PAGADO desaparecían "al rato"; la estimación 15 existía en un dispositivo y no en otros;
   el avance por apto no actualizaba. CAUSA RAÍZ (3 agentes + código):
   (1) p.cobro (rows + avanceAptos + estimacionExcel) era el ÚLTIMO dato de dinero en
       LWW puro: sin _ts, sin tombstones, sin union-merge => cualquier dispositivo con
       copia vieja re-subía el proj_ entero y pisaba todo en la flota (patrón ESSENZA 03-jul).
   (2) Los mutadores de cobro solo hacían saveState() (debounce 1200ms) — cerrar la PWA
       rápido o mala señal perdía el cambio.
   (3) La auto-limpieza de ensureDataV9 borraba filas "vacías" — exactamente la forma de
       una estimación recién agregada.
   FIX: _mergeCobroProyecto (unión por fila + tombstones rowsEliminadas + avanceAptos por
   sello + estimacionExcel por ts) cableado en applyRemote; sellos _ts en TODOS los
   mutadores; forceUploadNow en los de dinero; la limpieza respeta filas con _ts;
   degradaciones del importador ahora AVISAN (RESUMEN PR faltante, Storage fallido,
   AVANCE PR ilegible). APP_SYNC 909. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFrom(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
const extractFn = n => extractFrom('function '+n+'(');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. _mergeCobroProyecto: existe y es PURO ──
const srcM = extractFn('_mergeCobroProyecto');
ok('_mergeCobroProyecto existe', !!srcM);
const srcById = extractFn('_mergeById');
let fn = null;
try { fn = new Function('_mergeById', 'return (' + srcM + ')')(new Function('return (' + srcById + ')')()); } catch(e){}
ok('_mergeCobroProyecto evaluable', typeof fn === 'function');
if (typeof fn === 'function') {
  const mk = (rows, extra) => ({ cobro: Object.assign({ rows: rows }, extra||{}) });
  // factura local más nueva vence a la copia vieja del remoto
  let lp = mk([{ id:'e8', d:'ESTIMACIÓN #8', factura:'202195955', sf:'EMITIDA', _ts: 2000 }]);
  let rp = mk([{ id:'e8', d:'ESTIMACIÓN #8', factura:'', sf:'PENDIENTE', _ts: 1000 }]);
  let chg = fn(lp, rp);
  ok('la factura local (sello más nuevo) vence a la copia vieja', chg === true && rp.cobro.rows[0].factura === '202195955' && rp.cobro.rows[0].sf === 'EMITIDA');
  // estimación solo-local (la 15) se preserva
  lp = mk([{ id:'e15', d:'ESTIMACIÓN #15', vp_ci: 369208.47, _ts: 3000 }]);
  rp = mk([]);
  chg = fn(lp, rp);
  ok('la estimación solo-local NO se pierde', chg === true && rp.cobro.rows.some(r => r.id === 'e15'));
  // tombstone mata y no resucita
  lp = mk([], { rowsEliminadas: { 'e9': 111 } });
  rp = mk([{ id:'e9', d:'ESTIMACIÓN #9', _ts: 1 }]);
  fn(lp, rp);
  ok('la lápida elimina la fila en el remoto', !rp.cobro.rows.some(r => r.id === 'e9') && rp.cobro.rowsEliminadas && rp.cobro.rowsEliminadas['e9'] === 111);
  // avance por apto: sello más nuevo gana; sin sellos, el que tiene DATOS no se pierde
  lp = mk([], { avanceAptos: { a1: { pdfCumulativo: 70, _ts: 500 } } });
  rp = mk([], { avanceAptos: { a1: { pdfCumulativo: 40, _ts: 100 } } });
  fn(lp, rp);
  ok('avanceAptos: gana el sello más nuevo', rp.cobro.avanceAptos.a1.pdfCumulativo === 70);
  lp = mk([], { avanceAptos: { a2: { pdfCumulativo: 55 } } });
  rp = mk([], { avanceAptos: {} });
  fn(lp, rp);
  ok('avanceAptos: sin sellos, los DATOS no se pierden', rp.cobro.avanceAptos.a2 && rp.cobro.avanceAptos.a2.pdfCumulativo === 55);
  // puntero del Excel guardado: gana el ts más nuevo
  lp = mk([], { estimacionExcel: { url:'u15', ts: 900 } });
  rp = mk([], { estimacionExcel: { url:'u13', ts: 200 } });
  fn(lp, rp);
  ok('estimacionExcel: gana el ts más nuevo', rp.cobro.estimacionExcel.url === 'u15');
  // idempotente
  const rp2 = JSON.parse(JSON.stringify(rp));
  ok('idempotente (regla v856)', fn(JSON.parse(JSON.stringify(rp)), rp2) === false);
  ok('proyecto sin cobro no truena', fn({}, {}) === false);
}

// ── 2. cableado en applyRemote junto al blindaje de planillas ──
const iWire = html.indexOf('_mergePlanillaProyecto(_locProj[rp && rp.id], rp)');
const wireZone = iWire > -1 ? html.slice(iWire, iWire + 1200) : '';
ok('applyRemote llama _mergeCobroProyecto en el forEach de proyectos', /_mergeCobroProyecto\(_locProj\[rp && rp\.id\], rp\)/.test(wireZone));
ok('el blindaje de cobro marca needsResync', /_chgC[\s\S]{0,120}needsResync = true/.test(wireZone));

// ── 3. sellos _ts en los mutadores ──
ok('uploadFacturaPDF sella _ts', /_ts = Date\.now\(\)/.test(extractFrom('async function uploadFacturaPDF(')));
ok('updateEst sella _ts', /_ts = Date\.now\(\)/.test(extractFrom('async function updateEst(')));
ok('updateEstDate sella _ts', /_ts = Date\.now\(\)/.test(extractFn('updateEstDate')));
ok('updateEstVP sella _ts', /_ts = Date\.now\(\)/.test(extractFn('updateEstVP')));
ok('addEstimacion sella _ts', /_ts:\s*Date\.now\(\)/.test(extractFn('addEstimacion')));
ok('_doDeleteFacturaPDF sella _ts', /_ts = Date\.now\(\)/.test(extractFrom('async function _doDeleteFacturaPDF(')));
ok('toggleEstNoAmort sella _ts', /_ts = Date\.now\(\)/.test(extractFrom('window.toggleEstNoAmort = function')));
ok('autorizarSolicitudAmort sella _ts', /_ts = Date\.now\(\)/.test(extractFrom('window.autorizarSolicitudAmort = function')));

// ── 4. subida inmediata en las acciones de dinero ──
ok('uploadFacturaPDF fuerza subida', /forceUploadNow/.test(extractFrom('async function uploadFacturaPDF(')));
ok('updateEst fuerza subida', /forceUploadNow/.test(extractFrom('async function updateEst(')));
ok('updateEstDate fuerza subida', /forceUploadNow/.test(extractFn('updateEstDate')));
ok('addEstimacion fuerza subida', /forceUploadNow/.test(extractFn('addEstimacion')));
ok('delLastEstimacion fuerza subida', /forceUploadNow/.test(extractFrom('async function delLastEstimacion(')));

// ── 5. borrado con lápida ──
ok('delLastEstimacion escribe tombstone rowsEliminadas', /rowsEliminadas\[[^\]]+\] = Date\.now\(\)/.test(extractFrom('async function delLastEstimacion(')));

// ── 6. la auto-limpieza respeta filas selladas ──
const iClean = html.indexOf('Limpieza defensiva: remover estimaciones placeholder');
const cleanZone = iClean > -1 ? html.slice(iClean, iClean + 900) : '';
ok('la limpieza NO borra filas con _ts (estimaciones nuevas)', /if \(r\._ts\) return true/.test(cleanZone));

// ── 7. degradaciones del importador ahora AVISAN ──
ok('camino legado avisa que falta la hoja RESUMEN PR', /NO TRAE LA HOJA "RESUMEN PR"|SIN LA HOJA "RESUMEN PR"/.test(html));
const iCatch = html.indexOf("[estimacion excel guardar]");
ok('el fallo al guardar el Excel en Storage ya no es silencioso', iCatch > -1 && /showToast/.test(html.slice(iCatch - 50, iCatch + 400)));
ok('AVANCE PR ilegible avisa', /HOJA "AVANCE PR"|AVANCE PR NO SE PUDO/.test(html));
ok('la descarga muestra la fecha del archivo guardado', /DESCARGANDO EL EXCEL GUARDADO/.test(extractFrom('window.descargarEstimacionExcel = async function')));

// ── 8. sellos en el importador RESUMEN PR (filas y avance) ──
const iPR = html.indexOf('CARGAR DESDE "RESUMEN PR"');
const prZone = iPR > -1 ? html.slice(iPR, iPR + 7000) : '';
ok('las filas del RESUMEN PR nacen selladas', /row\._ts = Date\.now\(\)/.test(prZone));
ok('el avance por apto se sella al importar', /avanceAptos\[aid\]\._ts = Date\.now\(\)/.test(prZone));

// ── 9. kill-switch ──
ok('APP_SYNC_VERSION subió a >= 909', (Number((html.match(/const APP_SYNC_VERSION = (\d+)/) || [])[1]) || 0) >= 909);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
