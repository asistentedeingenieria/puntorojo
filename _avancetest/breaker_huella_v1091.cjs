/* v1091 — EL FRENO ANTI-BUCLE VUELVE A FRENAR (hallazgo del análisis de performance, 30-jul).
   _evalResyncBreaker corta cuando ve la MISMA huella >4 veces en 90s. Pero _resyncFingerprint
   metía `asistenciaGlobal` COMPLETA en la huella: con ~30 personas marcando entrada y salida
   durante la jornada, la asistencia cambia en casi cada applyRemote → la huella era distinta
   siempre → el breaker NUNCA cortaba. El único freno contra un bucle de sincronización estaba
   neutralizado sin que se notara.
   Además la huella no cubría NINGUNO de los contenedores nuevos (proveedoresGlobales,
   solicitudesPrecios, bodegaMat, variosMat, bodegaMovs, matFix, pagosProv) — justo donde
   nacieron los merges de v1068-v1074, que es de donde saldría un bucle nuevo.
   FIX: la asistencia entra por TAMAÑO (su volumen sí importa para detectar un bucle, su
   contenido minuto a minuto no) y se suman los contenedores nuevos con el mismo criterio de
   sello que ya usa la firma de planillas. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zF = ex('function _resyncFingerprint(');
let fp = null;
try { fp = new Function('return (' + zF + ')')(); } catch(e){}
ok('existe _resyncFingerprint y es pura', !!fp && zF.length > 500);

if (fp) {
  const base = () => ({
    personalGlobal: [{ id: 'p1' }], colaboradoresGlobal: [], polizasGlobales: [], anticiposGlobales: [],
    solicitudesPolizas: [], solicitudesAnticipos: [], solicitudesColaboradores: [], solicitudesPagoEtapa: [],
    solicitudesAnticipo: [], gerenciaGlobal: [], projects: [{ id: 'o1', planilla: {} }],
    asistenciaGlobal: { '2026-07-31': [{ id: 'a1', entrada: '07:50' }] },
    proveedoresGlobales: [{ id: 'pv1', _ts: 10 }], solicitudesPrecios: [],
    bodegaMat: { ordenes: [{ id: 'oc1', _ts: 5 }] }, variosMat: { ordenes: [] },
    bodegaMovs: [], matFix: [], pagosProv: []
  });

  console.log('\n— 1. EL BUG: la asistencia ya no tapa el bucle —');
  const a = base();
  const b = base();
  /* alguien marcó su salida: la asistencia cambió, pero NADA que pudiera estar en bucle */
  b.asistenciaGlobal['2026-07-31'][0].salida = '17:02';
  ok('un marcaje de asistencia NO cambia la huella (antes la cambiaba y cegaba el freno)', fp(a) === fp(b));
  /* pero si aparece gente nueva, el volumen sí cambia: eso sí es señal */
  const c = base();
  c.asistenciaGlobal['2026-07-31'].push({ id: 'a2' });
  ok('más registros de asistencia SÍ cambian la huella (el volumen importa)', fp(a) !== fp(c));

  console.log('\n— 2. los contenedores nuevos entran en la huella —');
  const d = base(); d.proveedoresGlobales[0]._ts = 99;
  ok('un cambio en el catálogo de precios se ve', fp(a) !== fp(d));
  const e = base(); e.solicitudesPrecios = [{ id: 'sp1', _ts: 1 }];
  ok('una solicitud de precio se ve', fp(a) !== fp(e));
  const f2 = base(); f2.bodegaMat.ordenes[0]._ts = 77;
  ok('una orden de bodega se ve', fp(a) !== fp(f2));
  const g = base(); g.variosMat.ordenes = [{ id: 'v1', _ts: 3 }];
  ok('una orden de PROYECTOS VARIOS se ve', fp(a) !== fp(g));

  console.log('\n— 3. lo que ya cubría, lo sigue cubriendo —');
  const h = base(); h.personalGlobal = [{ id: 'p1' }, { id: 'p2' }];
  ok('personal', fp(a) !== fp(h));
  const i = base(); i.projects[0].planilla = { pagos: [{ id: 'pg1', _ts: 1 }] };
  ok('planilla por proyecto (v891)', fp(a) !== fp(i));

  console.log('\n— 4. estable y a prueba de basura —');
  ok('la misma entrada da la misma huella (determinista)', fp(a) === fp(base()));
  ok('sin datos no revienta', typeof fp({}) === 'string' && typeof fp(null) === 'string');
}

console.log('\n— 5. el freno sigue con su regla —');
const zB = ex('function _evalResyncBreaker(');
ok('corta con la misma huella repetida', /WIN = 90000, K = 4, COOL = 60000/.test(zB));
ok('la asistencia ya no va entera en la huella', !/merged\.asistenciaGlobal,/.test(zF));
ok('entra por tamaño', /asistenciaGlobal/.test(zF) && /length/.test(zF));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
