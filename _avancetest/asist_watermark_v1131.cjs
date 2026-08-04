/* v1131 — FASE 1 DEL ARCHIVADO DE ASISTENCIA: LA MARCA DE AGUA (watermark)

   EL PROBLEMA MEDIDO (4-ago-2026, producción): appState/asistencia pesa 770 KB con 50 días y
   crece 14.2 KB por día de marcado. El techo DURO de Firestore es 1 MB por documento: quedan
   ~18 días de marcado. Ya está degradando hoy (resource-exhausted, subidas colgadas).

   POR QUÉ EL ARCHIVADO NO SE SOSTIENE SOLO: _mergeAsistencia parte de una copia del remoto y le
   vuelca ENCIMA todas las fechas locales — nunca borra una fecha. Corre en applyRemote y dentro
   de la transacción de subida. Entonces basta UN dispositivo con los 50 días en su cache local
   para que, al marcar, devuelva al doc caliente todo lo que se archivó. El archivado se deshace
   solo en horas.

   LA MARCA DE AGUA es la pieza que lo hace posible: una fecha `asistCutoff` que dice "lo
   anterior a esto ya vive en el archivo". El merge la respeta en los DOS lados:
     · GUARD A (remoto): poda las fechas viejas que sigan en la nube y marca changed=true, para
       que la subida emita el borrado (la rama FieldValue.delete que hoy es código muerto).
     · GUARD B (local): descarta las fechas viejas del cache local SIN marcar changed — no hay
       nada que propagar, y así un teléfono viejo no las resucita.

   ESTA FASE NO ARCHIVA NADA. Sale con el cutoff VACÍO: comportamiento idéntico al de hoy y
   riesgo cero. Primero la flota entera tiene que tener el guard (por eso sube APP_SYNC_VERSION
   y Antonio sube minSyncVersion); recién después se archiva. Un cliente con código viejo NO
   entiende el 4º parámetro, hace tx.set del documento completo y deshace el archivado de un
   golpe — el mínimo de versión es la única barrera que lo impide.

   FAIL-OPEN es la regla de seguridad: cutoff vacío o malformado ⇒ NO se poda NADA. Jamás borrar
   por una configuración rota. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* ── las funciones puras del corte ── */
const zMax = ex(code, 'function _asistCutoffMax(');
const zObj = ex(code, 'function _asistCutoffObjetivo(');
ok('existe _asistCutoffMax', zMax.length > 60);
ok('existe _asistCutoffObjetivo', zObj.length > 60);

let cutMax = null, cutObj = null;
try { cutMax = new Function(zMax + '\nreturn _asistCutoffMax;')(); } catch(e){ console.log('  ('+e.message+')'); }
try { cutObj = new Function(zObj + '\nreturn _asistCutoffObjetivo;')(); } catch(e){ console.log('  ('+e.message+')'); }

if (cutMax) {
  console.log('\n— el corte nunca retrocede —');
  ok('se queda con el mayor', cutMax('2026-07-05','2026-06-01') === '2026-07-05');
  ok('en cualquier orden', cutMax('2026-06-01','2026-07-05') === '2026-07-05');
  ok('con uno vacío gana el otro', cutMax('', '2026-07-05') === '2026-07-05');
  ok('dos vacíos dan vacío', cutMax('', '') === '');
  ok('ignora lo malformado', cutMax('ayer', '2026-07-05') === '2026-07-05');
  ok('un formato corto no pasa', cutMax('2026-6-9', '') === '');
  ok('un número no pasa', cutMax(20260609, '') === '');
  ok('null/undefined no lo tumban', cutMax(null, undefined) === '');
}
if (cutObj) {
  console.log('\n— a qué fecha cortar —');
  ok('30 días atrás desde el 4-ago', cutObj('2026-08-04', 30) === '2026-07-05');
  ok('cruza el año', cutObj('2026-01-05', 30) === '2025-12-06');
  ok('respeta el bisiesto', cutObj('2028-03-01', 1) === '2028-02-29');
  ok('0 días es hoy mismo', cutObj('2026-08-04', 0) === '2026-08-04');
  ok('sin fecha no inventa', cutObj('', 30) === '');
}

/* ── el merge con la marca de agua ── */
const zM = ex(code, 'function _mergeAsistencia(');
ok('el merge acepta el corte como 4º parámetro', /function _mergeAsistencia\(localAsis, remoteAsis, tombSet, cutoff\)/.test(zM));

let merge = null;
try {
  merge = new Function('_mergeSesiones','_recToSessions','_asistResumenSesiones',
    zM + '\nreturn _mergeAsistencia;')(
      (a,b) => (a||[]).concat(b||[]), r => (r && r.sessions) || [], () => ({}));
} catch(e){ console.log('   (no compiló: ' + e.message + ')'); }

if (merge) {
  const rec = (ts) => ({ presente:true, entrada:'06:30', _ts: ts });
  const VIEJO = '2026-06-09', NUEVO = '2026-08-04', CUT = '2026-07-05';

  console.log('\n— (1) sin corte se comporta EXACTAMENTE como antes —');
  const base = merge({ [VIEJO]: { p1: rec(10) } }, { [NUEVO]: { p2: rec(20) } }, null);
  ok('con 3 argumentos no poda nada', !!base.asistencia[VIEJO] && !!base.asistencia[NUEVO]);
  ok('y sigue propagando lo local', base.changed === true);

  console.log('\n— (2) GUARD B: el cache local viejo NO resucita —');
  const gb = merge({ [VIEJO]: { p1: rec(10) } }, { [NUEVO]: { p2: rec(20) } }, null, CUT);
  ok('la fecha vieja del local no entra', !gb.asistencia[VIEJO]);
  ok('la nueva sigue ahí', !!gb.asistencia[NUEVO]);
  ok('NO marca cambio (no hay nada que propagar)', gb.changed === false);

  console.log('\n— (3) GUARD A: lo viejo que quede en la nube se poda —');
  const ga = merge({}, { [VIEJO]: { p1: rec(10) }, [NUEVO]: { p2: rec(20) } }, null, CUT);
  ok('la fecha vieja sale del resultado', !ga.asistencia[VIEJO]);
  ok('SÍ marca cambio (para que la subida la borre)', ga.changed === true);
  ok('lo reciente no se toca', !!ga.asistencia[NUEVO]);

  console.log('\n— (4) idempotente (la lección del bucle de v856) —');
  const r2 = merge({}, ga.asistencia, null, CUT);
  ok('la segunda pasada ya no cambia nada', r2.changed === false);

  console.log('\n— (5) el borde exacto: la fecha IGUAL al corte SE QUEDA —');
  const borde = merge({}, { [CUT]: { p1: rec(10) } }, null, CUT);
  ok('el día del corte sobrevive', !!borde.asistencia[CUT]);
  ok('y no se marca como cambio', borde.changed === false);

  console.log('\n— (6) FAIL-OPEN: jamás borrar por una configuración rota —');
  [ '', null, undefined, 'ayer', '2026-6-9', 20260609, {}, '0000-00-00x' ].forEach(function(mal, i){
    const r = merge({}, { [VIEJO]: { p1: rec(10) } }, null, mal);
    ok('corte inválido #' + (i+1) + ' no poda', !!r.asistencia[VIEJO]);
  });

  console.log('\n— (7) los tombstones siguen intactos con el corte activo —');
  const AUS = { presente:false, motivo:'FALTÓ', _ts: 77 };
  const tomb = merge({}, { [NUEVO]: { p1: AUS } }, { [NUEVO + '|p1']: 77 }, CUT);
  ok('la ausencia exacta se borra igual', !(tomb.asistencia[NUEVO] || {}).p1);
  const presente = merge({}, { [NUEVO]: { p1: rec(77) } }, { [NUEVO + '|p1']: 77 }, CUT);
  ok('un PRESENTE real nunca se borra', !!(presente.asistencia[NUEVO] || {}).p1);

  console.log('\n— lo que no debe perderse —');
  ok('un día reciente que solo está en local entra igual',
    !!merge({ [NUEVO]: { p9: rec(5) } }, {}, null, CUT).asistencia[NUEVO]);
  ok('sin datos no revienta', typeof merge(null, null, null, CUT).asistencia === 'object');
}

console.log('\n— el corte vigente y de dónde sale —');
const zVig = ex(code, 'function _asistCutoffVigente(');
ok('existe el lector del corte vigente', zVig.length > 80);
ok('lo espeja en localStorage (un arranque sin red no puede correr sin corte)', /localStorage/.test(zVig));
ok('y toma el mayor entre el local y el de la nube', /_asistCutoffMax\(/.test(zVig));
ok('el listener de config lo trae', /asistCutoff/.test(code) && /_asistCutoff/.test(code));

console.log('\n— los cuatro sitios que mergean pasan el corte —');
/* si uno solo se olvida, el hash local nunca cuadra con la nube y se arma el bucle de
   re-subida que ya mordió en v856 */
/* los tres sitios que mergean asistencia: la subida transaccional, el ensamblado del snapshot
   y applyRemote. Si UNO solo se olvidara el corte, su resultado diferiría del de los otros dos
   y el hash local nunca cuadraría con la nube: bucle de re-subida (el síntoma de v856). */
const SITIOS = [
  ['la subida transaccional',        /_mergeAsistencia\(_asistPayload, cloud, tomb, _cutTx\)/],
  ['el ensamblado del snapshot',     /_mergeAsistencia\(_coreAsist, _docAsist, null, [^)]*_asistCutoffVigente/],
  ['applyRemote',                    /_mergeAsistencia\(\s*\(state && state\.asistenciaGlobal\)[\s\S]{0,220}_asistCutoffVigente/],
];
SITIOS.forEach(([nombre, re]) => ok(nombre + ' pasa el corte', re.test(code)));
/* y que no haya APARECIDO un cuarto sitio sin corte: las llamadas totales tienen que seguir
   siendo las tres verificadas arriba */
const _llamadas = (code.match(/_mergeAsistencia\(/g) || []).length - 1;  // menos la definición
ok('siguen siendo exactamente tres los sitios que mergean', _llamadas === 3);

console.log('\n— el archivo en memoria no se sube ni se cachea —');
ok('_asistArchive queda fuera de lo que viaja a la nube', /_asistArchive/.test(code) && /delete .*_asistArchive/.test(code));

console.log('\n— el ritual de sync —');
/* >= y no el literal: el guard entró en 924 y la versión sigue subiendo con cada cambio de
   sync. Clavar el número hace que el test se rompa solo — ya mordió 4 veces (nota de v902). */
ok('APP_SYNC_VERSION es 924 o mayor',
  Number((code.match(/APP_SYNC_VERSION = (\d+)/) || [])[1] || 0) >= 924);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
