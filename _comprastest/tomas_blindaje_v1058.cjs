/* v1058 — BLINDAJE DE TOMAS DE INVENTARIO (Antonio, 29-jul: "quiero que la información
   NO se pierda NUNCA… que no se dupliquen o se pierde o no se guarda bien").

   Los agujeros del merge v740 (hallados por el reconocimiento):
   1. CERRADA ganaba ENTERA sobre ABIERTA — cerrar desde la oficina descartaba lo que los
      celulares seguían contando (el patrón objeto-entero que ya mordió en v953/v972/v1039).
   2. Dos CERRADAS: ganaba entera la de fechaCierre mayor (doble cierre offline = pérdida).
   3. Borrar una línea no dejaba lápida → cualquier copia vieja la revivía.
   4. Empate de ts lo ganaba el lado local (b) → resultado distinto según quién mergeaba.
   5. Líneas contadas en una toma ya unificada (tombstoneada) morían con ella.
   6. renderAll tras applyRemote nunca repintaba inventarios → el admin miraba conteos
      viejos "en tiempo real" y cerraba antes de tiempo (gatillo del agujero 1).

   Regla nueva: las LÍNEAS se unen SIEMPRE por (locKey+material); los METADATOS del cierre
   los manda la cerrada (entre dos, la de fechaCierre mayor); lápidas de línea por clave;
   empate determinista por id; rescate de líneas post-lápida hacia la abierta superviviente.
   CAMBIO DE SYNC ⇒ APP_SYNC_VERSION 920 + minSyncVersion (ritual v892). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

let S = null;
try {
  const src = ex('function _invNorm(') + '\n' + ex('function _invUpsertLinea(') + '\n' + ex('function _invDelLinea(') + '\n' + ex('function _mergeOneToma(') + '\n' + ex('function _mergeTomas(');
  S = new Function(src + '\nreturn { one:_mergeOneToma, all:_mergeTomas };')();
} catch(e){ console.log('extract err:', e.message); }
ok('merge extraíble', !!(S && S.one && S.all));

const lin = (loc, mat, cant, ts, id) => ({ id: id || ('inv-' + loc + mat + ts), locKey: loc, material: mat, unidad: 'UNIDAD', cantidad: cant, ts: ts, by: 'x' });
const has = (t, mat) => (t.lineas || []).some(l => l.material === mat);
const cantDe = (t, mat) => { const l = (t.lineas || []).find(l => l.material === mat); return l ? l.cantidad : null; };

if (S) {
  console.log('\n— 1. EL AGUJERO GRANDE: cierre en oficina vs conteo en obra —');
  const cerrada = { id: 't1', estado: 'CERRADA', fechaInicio: '2026-07-29T08:00', fechaCierre: '2026-07-29T10:00', cerradoFirma: 'FIRMA', cerradoPorNombre: 'ADMIN', lineas: [lin('BODEGA', 'PLANCHA', 10, 100)] };
  const abierta = { id: 't1', estado: 'ABIERTA', fechaInicio: '2026-07-29T08:00', lineas: [lin('BODEGA', 'PLANCHA', 10, 100), lin('APTO1', 'POSTE', 5, 200)] };
  const m1 = S.one(cerrada, abierta);
  ok('la toma queda CERRADA (metadatos del cierre mandan)', m1.estado === 'CERRADA' && m1.fechaCierre === '2026-07-29T10:00' && m1.cerradoFirma === 'FIRMA');
  ok('pero el conteo del celular NO se pierde', has(m1, 'POSTE') && cantDe(m1, 'POSTE') === 5);
  ok('y al revés igual (a=abierta, b=cerrada)', (function(){ const m = S.one(abierta, cerrada); return m.estado === 'CERRADA' && has(m, 'POSTE'); })());

  console.log('\n— 2. doble cierre offline: se unen, no se pisa —');
  const cA = { id: 't1', estado: 'CERRADA', fechaInicio: '2026-07-29T08:00', fechaCierre: '2026-07-29T11:00', cerradoPorNombre: 'A', lineas: [lin('BODEGA', 'PLANCHA', 10, 100)] };
  const cB = { id: 't1', estado: 'CERRADA', fechaInicio: '2026-07-29T08:00', fechaCierre: '2026-07-29T12:00', cerradoPorNombre: 'B', lineas: [lin('APTO1', 'POSTE', 5, 200)] };
  const m2 = S.one(cA, cB);
  ok('metadatos de la que cerró de último', m2.fechaCierre === '2026-07-29T12:00' && m2.cerradoPorNombre === 'B');
  ok('líneas de AMBOS cierres', has(m2, 'PLANCHA') && has(m2, 'POSTE'));

  console.log('\n— 3. dos abiertas: como siempre, el ts mayor gana —');
  const o1 = { id: 't1', estado: 'ABIERTA', fechaInicio: '2026-07-29T08:00', lineas: [lin('BODEGA', 'PLANCHA', 5, 100)] };
  const o2 = { id: 't1', estado: 'ABIERTA', fechaInicio: '2026-07-29T08:00', lineas: [lin('BODEGA', 'PLANCHA', 7, 200)] };
  ok('recuento más nuevo manda', cantDe(S.one(o1, o2), 'PLANCHA') === 7 && cantDe(S.one(o2, o1), 'PLANCHA') === 7);

  console.log('\n— 4. lápidas de línea: lo borrado no revive… —');
  const conLinea = { id: 't1', estado: 'ABIERTA', fechaInicio: '2026-07-29T08:00', lineas: [lin('BODEGA', 'PLANCHA', 5, 100)] };
  const borrada = { id: 't1', estado: 'ABIERTA', fechaInicio: '2026-07-29T08:00', lineas: [], lineasEliminadas: { 'BODEGA||PLANCHA': 150 } };
  const m4 = S.one(conLinea, borrada);
  ok('la línea borrada queda fuera', !has(m4, 'PLANCHA'));
  ok('la lápida viaja en el merge', m4.lineasEliminadas && m4.lineasEliminadas['BODEGA||PLANCHA'] === 150);
  console.log('— …pero un re-conteo POSTERIOR sí vuelve —');
  const recontada = { id: 't1', estado: 'ABIERTA', fechaInicio: '2026-07-29T08:00', lineas: [lin('BODEGA', 'PLANCHA', 9, 300)] };
  ok('contar de nuevo gana a la lápida vieja', cantDe(S.one(m4, recontada), 'PLANCHA') === 9);

  console.log('\n— 5. empate de ts: resultado IGUAL en los dos lados —');
  const eA = { id: 't1', estado: 'ABIERTA', fechaInicio: 'x', lineas: [lin('BODEGA', 'PLANCHA', 5, 100, 'inv-aaa')] };
  const eB = { id: 't1', estado: 'ABIERTA', fechaInicio: 'x', lineas: [lin('BODEGA', 'PLANCHA', 7, 100, 'inv-zzz')] };
  ok('determinista (gana el mismo en ambos merges)', cantDe(S.one(eA, eB), 'PLANCHA') === cantDe(S.one(eB, eA), 'PLANCHA'));

  console.log('\n— 6. idempotencia: mergear dos veces = una —');
  const mA = S.one(cerrada, abierta);
  ok('estable', JSON.stringify(S.one(mA, abierta)) === JSON.stringify(mA));

  console.log('\n— 7. rescate: contar en una toma unificada no muere con ella —');
  const surv = { id: 'tS', estado: 'ABIERTA', fechaInicio: '2026-07-29T09:00', lineas: [] };
  const muerta = { id: 'tX', estado: 'ABIERTA', fechaInicio: '2026-07-29T08:00', lineas: [lin('APTO2', 'CANAL', 3, 600), lin('APTO2', 'VIEJA', 1, 400)] };
  const r7 = S.all([muerta], [surv], { tX: 500 });
  const survOut = r7.list.find(t => t.id === 'tS');
  ok('la toma tombstoneada NO revive', !r7.list.some(t => t.id === 'tX'));
  ok('la línea contada DESPUÉS de la lápida migra a la superviviente', survOut && has(survOut, 'CANAL') && cantDe(survOut, 'CANAL') === 3);
  ok('la línea de ANTES de la lápida no (esa sí se unificó a tiempo)', survOut && !has(survOut, 'VIEJA'));
  ok('y el rescate pide subida (changed)', r7.changed === true);
}

console.log('\n— 8. el borrado escribe lápida (regla de oro de los merges) —');
const zDel = ex('function invEliminarLinea(');
ok('invEliminarLinea deja lineasEliminadas', /lineasEliminadas/.test(zDel) && /Date\.now\(\)/.test(zDel));

console.log('\n— 9. tiempo real: applyRemote repinta inventarios visibles —');
ok('repinta tras renderAll (solo si la sección está a la vista y sin input enfocado)',
  /renderAll\(\); applyPermissions\(\);[\s\S]{0,900}mat-inventario[\s\S]{0,400}renderInventarios\(\)/.test(html));

console.log('\n— 10. ritual v892: cambio de sync ⇒ versión nueva —');
/* v1064: la versión siguió subiendo (921 = sello de planilla) — este test fija que el
   blindaje de tomas exigió AL MENOS la 920 */
ok('APP_SYNC_VERSION subió a 920+', (parseInt((html.match(/APP_SYNC_VERSION = (\d+)/)||[])[1],10)||0) >= 920);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
