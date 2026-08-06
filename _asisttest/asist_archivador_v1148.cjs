/* v1148 — ARCHIVADO DE ASISTENCIA, FASE 2: el archivador (solo admin)

   Contexto: appState/asistencia va en ~770 KB del techo DURO de 1 MB y ya degrada (el canal
   saturado dispara el guard v1139 en vivo — visto en la consola de Antonio el 5-ago). La
   FASE 1 (v1135) dejó los guards A/B del corte en _mergeAsistencia y el cutoff en
   appState/config; NADIE escribe el archivo todavía. Esta fase lo escribe.

   DECISIONES VALIDADAS (4-ago, supuestos corregidos):
   · Colección NUEVA asistArch/<YYYY-MM> — NO appState (hay onSnapshot de la colección entera:
     los ~30 clientes se bajarían el archivo en cada snapshot).
   · Por MES (año ≈ 4.3 MB nace reventado; mes ≈ 369 KB) y como STRING asistenciaJson
     (techo de 40k índices que ya mordió en julio; un string = 1 entrada).
   · Guard de tamaño: si el JSON de un mes pasa de 700 KB se ABORTA ese archivado con aviso
     (partir en -A/-B queda para cuando de verdad pase; hoy un mes anda por la mitad).
   · REGLA DE ORO: el archivo se CONFIRMA (re-lee y verifica día por día) ANTES de avanzar el
     cutoff. El recorte del doc caliente NO lo hace el archivador: lo hace el guard A en el
     próximo merge — por eso el archivador jamás toca appState/asistencia ni escribe tombstones.
   · La fuente es la UNIÓN servidor∪local SIN corte (_mergeAsistencia con cutoff '') — lo que
     el servidor tiene + lo local aún no subido; nada se queda afuera.
   · Cutoff nuevo = hoy − 30 días (31 días calientes con el del corte incluido, que SE QUEDA).
     Monótono vía _asistCutoffMax: jamás retrocede.

   HALLAZGO DEL MAPEO (5-ago): los 7 escritores de asistencia aceptan CUALQUIER fecha del
   picker (#asistFecha no tiene min). Con el corte activo, una marca sobre un día archivado se
   descartaría EN SILENCIO en el próximo merge (guard B, sin changed). Se bloquean con toast. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* ══ 1. _asistArchAgruparMes — PURA ══ */
console.log('— agrupar por mes lo que se va al archivo —');
const zG = ex(html, 'function _asistArchAgruparMes(');
ok('existe', !!zG);
let agrupar = null;
try { agrupar = new Function('return (' + zG + ')')(); } catch(e){}
ok('evalúa', typeof agrupar === 'function');
if (agrupar) {
  const asis = {
    '2026-06-10': { p1: { presente:true, _ts:1 } },
    '2026-06-28': { p1: { presente:true, _ts:2 }, p2: { presente:false, motivo:'x', _ts:3 } },
    '2026-07-03': { p3: { presente:true, _ts:4 } },
    '2026-07-06': { p1: { presente:true, _ts:5 } },
    '2026-07-07': { p1: { presente:true, _ts:6 } },
    'basura':     { p9: { presente:true } }
  };
  const r = agrupar(asis, '2026-07-06');
  ok('solo lo ESTRICTAMENTE menor al corte se archiva', r && r.meses && !!r.meses['2026-06'] && !!r.meses['2026-07']);
  ok('el día del corte SE QUEDA caliente (regla v1135)', r && !((r.meses['2026-07'] || {})['2026-07-06']));
  ok('junio agrupa sus dos días', r && Object.keys(r.meses['2026-06']).length === 2);
  ok('julio solo lleva el día 03', r && Object.keys(r.meses['2026-07']).length === 1 && !!r.meses['2026-07']['2026-07-03']);
  ok('cuenta los días archivables', r && r.dias === 3);
  ok('una clave malformada NO se archiva (se queda caliente)', r && !Object.keys(r.meses).some(m => Object.keys(r.meses[m]).indexOf('basura') >= 0));
  ok('los registros viajan INTACTOS', r && r.meses['2026-06']['2026-06-28'].p2.motivo === 'x');
  ok('FAIL-OPEN: corte vacío no agrupa nada', (function(){ const x = agrupar(asis, ''); return x && x.dias === 0 && Object.keys(x.meses).length === 0; })());
  ok('FAIL-OPEN: corte malformado no agrupa nada', (function(){ const x = agrupar(asis, '06/07/2026'); return x && x.dias === 0; })());
  ok('PURA: la fuente no se toca', Object.keys(asis).length === 6 && !!asis['2026-06-10']);
}

/* ══ 2. _asistArchFaltantes — PURA (la verificación día por día) ══ */
console.log('\n— la verificación: qué falta en el doc re-leído —');
const zF = ex(html, 'function _asistArchFaltantes(');
ok('existe', !!zF);
let faltantes = null;
try { faltantes = new Function('return (' + zF + ')')(); } catch(e){}
ok('evalúa', typeof faltantes === 'function');
if (faltantes) {
  const fuente = { '2026-06-10': { p1:{}, p2:{} }, '2026-06-11': { p3:{} } };
  ok('doc completo ⇒ sin faltantes', faltantes(fuente, JSON.parse(JSON.stringify(fuente))).length === 0);
  ok('un DÍA ausente se reporta', faltantes(fuente, { '2026-06-10': { p1:{}, p2:{} } }).some(s => s.indexOf('2026-06-11') >= 0));
  ok('una PERSONA ausente se reporta', faltantes(fuente, { '2026-06-10': { p1:{} }, '2026-06-11': { p3:{} } }).some(s => s.indexOf('p2') >= 0));
  ok('el doc puede traer MÁS (uniones previas) sin quejarse', faltantes(fuente, Object.assign({ '2026-05-01': { p9:{} } }, JSON.parse(JSON.stringify(fuente)))).length === 0);
  ok('doc vacío ⇒ falta todo', faltantes(fuente, {}).length >= 2);
}

/* ══ 3. _asistDiaArchivado — el guard de los escritores ══ */
console.log('\n— día archivado = solo lectura —');
const zD = ex(html, 'function _asistDiaArchivado(');
ok('existe', !!zD);
let archivado = null;
try { archivado = new Function('_asistCutoffVigente', 'return (' + zD + ')')(() => '2026-07-06'); } catch(e){}
ok('evalúa', typeof archivado === 'function');
if (archivado) {
  ok('anterior al corte ⇒ archivado', archivado('2026-07-05') === true);
  ok('el día del corte NO está archivado (sigue caliente)', archivado('2026-07-06') === false);
  ok('posterior ⇒ no archivado', archivado('2026-07-07') === false);
  ok('acepta corte explícito (testeable)', archivado('2026-07-05', '2026-07-01') === false && archivado('2026-06-30', '2026-07-01') === true);
  ok('fecha malformada ⇒ no bloquea (fail-open)', archivado('basura') === false);
}
ok('sin corte vigente jamás bloquea', (function(){
  try { const f = new Function('_asistCutoffVigente', 'return (' + zD + ')')(() => ''); return f('2020-01-01') === false; } catch(e){ return false; }
})());

/* ══ 4. el archivador ══ */
console.log('\n— _asistArchivarViejo: el flujo con la regla de oro —');
const zA = ex(code, 'window._asistArchivarViejo = async function');
ok('existe y es async', zA.length > 800);
ok('SOLO admin', /users\.manage/.test(zA));
ok('lee el doc caliente DEL SERVIDOR', /doc\('asistencia'\)[\s\S]{0,40}\.get\(\)/.test(zA));
ok('la fuente es la UNIÓN servidor∪local SIN corte', /_mergeAsistencia\([^)]*,\s*null,\s*''\)/.test(zA));
ok('agrupa por mes con el corte NUEVO', /_asistArchAgruparMes\(/.test(zA));
/* [^)]* se cortaba en el ')' de todayKey() — la llamada real es _asistCutoffObjetivo(todayKey(), 30) */
ok('el corte nuevo = hoy − 30, monótono', /_asistCutoffObjetivo\(todayKey\(\),\s*30\)/.test(zA) && /_asistCutoffMax\(/.test(zA));
ok('sin nada que archivar avisa y sale', /NADA QUE ARCHIVAR/.test(zA));
ok('confirma con el admin ANTES de escribir', /prConfirm/.test(zA) && zA.indexOf('prConfirm') < zA.indexOf("collection('asistArch')"));
ok('escribe en la colección NUEVA asistArch', /collection\('asistArch'\)/.test(zA));
ok('por TRANSACCIÓN (une con el doc del mes si ya existe)', /runTransaction/.test(zA));
/* entre el stringify y el set están el guard de 700 KB y el usuario — ventana de 400 */
ok('el contenido va como STRING (techo de 40k índices)', /JSON\.stringify\(_union\)[\s\S]{0,400}asistenciaJson/.test(zA));
ok('la unión con el mes existente usa el MISMO merge (nunca pisa)', (zA.match(/_mergeAsistencia\(/g) || []).length >= 2);
ok('guard de tamaño: un mes de más de 700 KB aborta', /700000|700_000/.test(zA));
ok('REGLA DE ORO: re-lee y verifica ANTES de subir el corte',
  /_asistArchFaltantes\(/.test(zA) && zA.indexOf('_asistArchFaltantes') < zA.indexOf('asistCutoff:'));
ok('si falta algo NO avanza el corte y avisa en rojo', /faltantes|_falt/i.test(zA) && /'red'/.test(zA));
ok('el corte sube a appState/config con merge (conserva minSyncVersion)',
  /doc\('config'\)[\s\S]{0,220}\{\s*merge:\s*true\s*\}/.test(zA));
ok('espeja el corte local de inmediato (el arranque sin snapshot no resucita)', /_ASIST_CUT_KEY|localStorage/.test(zA));
ok('siembra el cache de lectura state._asistArchive', /_asistArchive/.test(zA));
ok('deja rastro en el log', /logActivity/.test(zA));
ok('JAMÁS toca el doc caliente ni borra nada', !/doc\('asistencia'\)[\s\S]{0,60}\.(set|update)/.test(zA) && !/FieldValue\.delete/.test(zA));

/* ══ 5. el botón y los guards de los escritores ══ */
console.log('\n— botón de admin + los 7 escritores bloqueados —');
const zB = ex(code, 'function _adminPdfBotonesHTML(');
ok('el botón vive en ADMINISTRACIÓN, solo admin', /_asistArchivarViejo/.test(zB) && /users\.manage/.test(zB));
const escritores = [
  'function toggleAsistenciaGlobal(',
  'async function _marcarObraPequena(',
  'function setAsistenciaObra(',
  'function setAsistenciaObraDesc(',
  'function markAllPresentGlobal(',
  'function _guardarAusenciaMotivo(',
  'function _quitarAusencia('
];
escritores.forEach(m => {
  const z = ex(code, m);
  ok('bloqueado sobre día archivado: ' + m.replace(/^(async )?function /, '').replace('(', ''),
    /_asistDiaArchivado\(/.test(z) && /ARCHIVAD/.test(z));
});

/* ══ 6. lo que no cambia ══ */
console.log('\n— lo que no cambia —');
ok('el cache _asistArchive sigue SIN subir (stripLocal)', /delete clone\._asistArchive/.test(html));
ok('los guards A/B del merge siguen intactos (v1135)', /GUARD A/.test(html) && /GUARD B/.test(html));
ok('_asistSplitByAge (por año, legado) no se tocó', /function _asistSplitByAge\(/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
