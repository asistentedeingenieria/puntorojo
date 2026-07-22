/* v957 (pedido de Antonio: "revisá que TODOS los avances por apartamento funcionen y se
   actualicen"). Auditoría de 4 agentes sobre las 4 vistas + PDF. Pantallas OK; se
   corrigieron los 9 hallazgos reales:
   COBRO: (1) el import RESUMEN PR repinta la vista DESPUÉS de escribir el avance;
   (2) path PDF sella _ts por apto y (3) avanceMetaTs al guardar oficiales; (4) los 3
   editores manuales sellan _ts; (5) el path legacy del Excel sella _ts; (6) los
   oficiales del Excel REEMPLAZAN (no mezclan — adiós fantasmas de PDFs viejos) y el
   sello solo se pone si el Excel trajo oficiales.
   PAGO: (7) pagarEtapaPlanilla y (8) autorizarPagoPlanilla fuerzan subida (dinero);
   (9) el PDF de pago usa la MISMA unión que la pantalla (window._pagoPcts5). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function zone(marker, len){ const i = html.indexOf(marker); return i > -1 ? html.slice(i, i + (len||2000)) : ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── COBRO: path PDF sella ──
const zPdf = zone('El PDF guarda en pdfCumulativo', 900);
ok('path PDF: apto sellado con _ts', /_ts = Date\.now\(\)/.test(zPdf));
const zPdfMeta = zone('Guardar % oficial de cada torre del PDF', 900);
ok('path PDF: avanceMetaTs sellado', /avanceMetaTs = Date\.now\(\)/.test(zPdfMeta));

// ── COBRO: editores manuales sellan ──
ok('abrirEditorApto sella', /_ts = Date\.now\(\)/.test(zone("showToast('APTO ACTUALIZADO'", -1) || zone('APTO ACTUALIZADO', 400)) || /_ts = Date\.now\(\)[\s\S]{0,200}APTO ACTUALIZADO/.test(html));
ok('updateCobroApto sella', /rec\._ts = Date\.now\(\)/.test(zone('window.updateCobroApto = function', 900)));
ok('updateCobroAptoEst sella', /_ts = Date\.now\(\)/.test(zone('window.updateCobroAptoEst = function', 1100)));

// ── COBRO: path legacy sella (2 formatos × reset + escritura) ──
const zLeg = zone('Reset solo del apto la PRIMERA vez', 4500);
ok('path legacy: >= 4 sellos _ts', (zLeg.match(/_ts = Date\.now\(\)/g) || []).length >= 4);

// ── COBRO: oficiales del Excel REEMPLAZAN + re-render después de escribir ──
const zPR = zone('CARGAR DESDE "RESUMEN PR"', 11000);
ok('oficiales: REEMPLAZO sin Object.assign', /_trajoOficiales/.test(zPR) && !/Object\.assign\(\{\}, _pP\.cobro\.avanceLevels/.test(zPR));
ok('re-render tras escribir el avance', /avanceMetaTs = Date\.now\(\)[\s\S]{0,900}renderCobroAvanceApto/.test(zPR));

// ── PAGO: acciones de dinero fuerzan subida ──
ok('pagarEtapaPlanilla (activa) fuerza subida', /Pago liquidación generado[\s\S]{0,400}forceUploadNow/.test(html));
ok('autorizarPagoPlanilla fuerza subida', /Pago liquidación autorizado[\s\S]{0,400}forceUploadNow/.test(html));

// ── PDF de pago = pantalla ──
ok('window._pagoPcts5 expuesta', /window\._pagoPcts5 = _pagoPcts5/.test(html));
const zMetric = zone('function _avAptoMetric', 3500);
ok('_avAptoMetric usa _pagoPcts5 con fallback max()', /_pagoPcts5/.test(zMetric) && /Math\.max\(Number\(v\)\|\|0, Number\(_manP\[i\]\)\|\|0\)/.test(zMetric));
ok('_avAptoMetric sin ternario viejo de prioridad absoluta', !/var pc=\(a\.pagoManual/.test(zMetric));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
