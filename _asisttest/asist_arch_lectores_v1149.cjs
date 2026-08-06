/* v1149 — ARCHIVADO DE ASISTENCIA, FASE 3: los lectores ven el archivo

   Sin esta fase, el archivado (v1148) dejaría CIEGOS a los reportes: el PDF mensual ofrece
   12 meses atrás y el semanal 8 semanas — con el corte a 30 días recorrerían días que ya no
   están en el doc caliente y saldrían EN BLANCO SIN ERROR. Y el picker de asistencia admite
   cualquier fecha vieja: la pantalla mostraría vacío un día que sí existe en el archivo.

   LO NUEVO:
   · _asistArchAsegurar(fechas) — async: agrupa las fechas < corte por MES, baja los docs
     asistArch/<mes> que falten, siembra state._asistArchive (sin pisar lo ya sembrado) y
     cachea el mes como cargado AUNQUE el doc no exista (no re-pedir). Un error de red avisa
     con toast (EL REPORTE PUEDE SALIR INCOMPLETO) y NO marca el mes (reintenta después).
   · _asistConArchivo() — lectura combinada archivo∪caliente donde EL CALIENTE MANDA.
   · Cableado: los reportes de RANGO (semanal, mensual, semanal legado) leen la vista
     combinada y sus botones ASEGURAN el archivo antes de generar; los ~12 lectores de UN
     día pasan a _getAsistenciaDia (el shim caliente→archivo de v1135, hasta hoy muerto);
     el picker (#asistFecha) carga el mes al elegir un día archivado y re-pinta.

   LO QUE NO CAMBIA: los 7 ESCRITORES siguen leyendo el doc caliente directo — escriben ahí
   y ya están bloqueados sobre días archivados (v1148). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* ══ 1. _asistConArchivo — la vista combinada ══ */
console.log('— la vista combinada: el caliente MANDA —');
const zC = ex(html, 'function _asistConArchivo(');
ok('existe', !!zC);
let conArchFn = null;
try { if (zC) conArchFn = new Function('_getAsistencia', 'state', 'return (' + zC + ')'); } catch(e){}
const conArch = conArchFn ? ((hot, arch) => conArchFn(() => hot, { _asistArchive: arch })()) : null;
ok('evalúa', typeof conArch === 'function');
if (conArch) {
  const hot = { '2026-08-01': { p1: { presente: true } } };
  const arch = { '2026-06-10': { p2: { presente: true } }, '2026-08-01': { p1: { presente: false } } };
  const v = conArch(hot, arch);
  ok('une archivo y caliente', !!v['2026-06-10'] && !!v['2026-08-01']);
  ok('en empate gana el CALIENTE', v['2026-08-01'].p1.presente === true);
  ok('sin archivo devuelve el caliente tal cual', conArch(hot, null) === hot && conArch(hot, {}) === hot);
}

/* ══ 2. _asistArchAsegurar — el cargador bajo demanda ══ */
console.log('\n— el cargador: por mes, cacheado, con aviso si falla —');
const zA = ex(html, 'async function _asistArchAsegurar(');
ok('existe y es async', zA.length > 300);
let asegurar = null;
const mkEnv = (docs, failMes) => {
  const env = { state: { _asistArchive: {} }, cargados: {}, gets: [], toasts: [] };
  const db = { collection: () => ({ doc: (m) => ({ get: async () => {
    env.gets.push(m);
    if (m === failMes) throw new Error('red');
    const d = docs[m];
    return { exists: !!d, data: () => ({ asistenciaJson: d || '' }) };
  } }) }) };
  try {
    const f = new Function('firebase', 'state', 'window', '_asistCutoffVigente', 'showToast', 'return (' + zA + ')')(
      { firestore: () => db }, env.state, { _asistArchMesesCargados: env.cargados }, () => '2026-07-06', (m, c) => env.toasts.push(String(m)));
    asegurar = (fechas) => f(fechas).then(n => ({ n, env }));
  } catch(e){ asegurar = null; }
  return env;
};
ok('evalúa con entorno simulado', (function(){ mkEnv({}); return typeof asegurar === 'function'; })());
if (asegurar) {
  (async () => {
    /* pide 3 fechas de 2 meses viejos + 1 caliente ⇒ baja SOLO los 2 meses viejos */
    let env = mkEnv({ '2026-06': JSON.stringify({ '2026-06-10': { p1: {} } }), '2026-05': JSON.stringify({ '2026-05-02': { p2: {} } }) });
    let r = await asegurar(['2026-06-10', '2026-05-02', '2026-07-06', 'basura']);
    ok('solo baja los meses ANTERIORES al corte', env.gets.sort().join(',') === '2026-05,2026-06');
    ok('siembra el cache de lectura', !!env.state._asistArchive['2026-06-10'] && !!env.state._asistArchive['2026-05-02']);
    ok('marca los meses como cargados', env.cargados['2026-06'] === true && env.cargados['2026-05'] === true);

    /* segunda pasada: nada que pedir */
    await asegurar(['2026-06-15']);
    ok('un mes cargado NO se re-pide', env.gets.length === 2);

    /* doc inexistente: se cachea igual (no re-pedir un mes que no existe) */
    env = mkEnv({});
    await asegurar(['2026-04-01']);
    ok('mes sin doc también queda cacheado', env.cargados['2026-04'] === true);

    /* error de red: avisa y NO cachea (reintenta después) */
    env = mkEnv({}, '2026-03');
    await asegurar(['2026-03-15']);
    ok('el error de red avisa (REPORTE INCOMPLETO)', env.toasts.some(t => /INCOMPLETO/.test(t)));
    ok('y NO marca el mes (reintenta después)', !env.cargados['2026-03']);

    /* lo sembrado NO se pisa (el archivador pudo sembrar una versión más fresca) */
    env = mkEnv({ '2026-02': JSON.stringify({ '2026-02-01': { viejo: true } }) });
    env.state._asistArchive['2026-02-01'] = { fresco: true };
    await asegurar(['2026-02-01']);
    ok('lo ya sembrado no se pisa', env.state._asistArchive['2026-02-01'].fresco === true);

    parte2();
  })();
} else { parte2(); }

function parte2(){
  /* ══ 3. el cableado de los reportes de RANGO ══ */
  console.log('\n— los reportes de rango leen la vista combinada —');
  ok('semanal y mensual leen _asistConArchivo (los 2 sitios)',
    (code.match(/var A=\(typeof _asistConArchivo==='function'\)\?_asistConArchivo\(\):_getAsistencia\(\);/g) || []).length === 2);
  ok('el semanal LEGADO también', /_asistConArchivo/.test(ex(code, 'function descargarAsistenciaSemanalPDF(')));
  const zS = ex(code, 'window.abrirPdfSemanal = function');
  ok('el botón del semanal ASEGURA la semana antes de generar',
    /_asistArchAsegurar\([\s\S]{0,80}\.then\([\s\S]{0,120}_generarPdfSemanal/.test(zS) || /_asistArchAsegurar[\s\S]{0,200}_generarPdfSemanal/.test(zS));
  const zM = ex(code, 'window.abrirPdfMensual = function');
  ok('el del mensual también (ofrece 12 meses atrás)', /_asistArchAsegurar/.test(zM));

  /* ══ 4. los lectores de UN día usan el shim ══ */
  console.log('\n— los lectores de un día despiertan el shim de v1135 —');
  ok('los 5 lectores const dia=A[fecha] pasaron al shim',
    (code.match(/const dia=_getAsistenciaDia\(fecha\);/g) || []).length === 5);
  ok('ya nadie deriva dia de A[fecha] directo', !/const dia=A\[fecha\]\|\|\{\};/.test(code));
  ok('los 4 inline del día del picker también',
    (code.match(/_getAsistenciaDia\(_asistFechaActual\(\)\)/g) || []).length >= 4);
  ok('los 3 modales (faltan ingreso/salida, ausentes) también',
    (code.match(/const dia=\(typeof _getAsistenciaDia==='function'\)\?_getAsistenciaDia\(fecha\):\{\};/g) || []).length === 3);
  const zP = ex(code, 'function setAsistFecha(');
  ok('el picker carga el mes al elegir un día archivado y re-pinta',
    /_asistDiaArchivado/.test(zP) && /_asistArchAsegurar/.test(zP) && /renderPersonal/.test(zP));

  /* ══ 5. lo que no cambia ══ */
  console.log('\n— lo que no cambia —');
  const zW = ex(code, 'function toggleAsistenciaGlobal(');
  ok('los ESCRITORES siguen sobre el doc caliente directo', /const A=_getAsistencia\(\)/.test(zW));
  ok('_getAsistenciaDia sigue: caliente primero, archivo después',
    (function(){ const z = ex(code, 'function _getAsistenciaDia('); return z.indexOf('asistenciaGlobal') < z.indexOf('_asistArchive'); })());
  ok('el guard de escritores sigue (v1148)', /_asistDiaArchivado\(f\)/.test(zW));

  console.log('PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail ? 1 : 0);
}
