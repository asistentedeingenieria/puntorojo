/* v1150 (2/2) — LA ENTRADA DE LA MAÑANA YA NO SE PIERDE CON DOS CELULARES

   Hallazgo de la auditoría del 4-ago, CONFIRMADO vigente el 6-ago: la rama de registros
   SIMPLES de _mergeAsistencia (sin multiSesion) reemplaza la celda ENTERA por _ts. El
   escenario real: el celular A registra la entrada de las 07:00; el celular B no la
   recibió (sync caído, v1139) y la persona escanea a las 12:00 — computeAsistenciaMark
   solo ve el prev LOCAL, así que B forma {entrada:'12:00'} con _ts mayor... y PISA la
   celda de A. La hora de entrada real desaparece y queda una entrada falsa de mediodía.
   La rama de sesiones (v653) sí une — pero multiSesion es opt-in por persona.

   EL ARREGLO: _asistFuseCelda — cuando AMBOS registros son PRESENTES simples, se fusionan
   las horas en vez de reemplazar: se juntan TODAS las horas de los dos (entradas, salidas
   y la 'hora' legacy), la más TEMPRANA queda de entrada y la más TARDÍA de salida — así
   el escaneo de B se rescata como salida en vez de inventar una entrada falsa. El geo
   viaja con la hora que lo aportó. El resto de campos (obra, via) del ganador por _ts.
   La fusión es CONMUTATIVA (los dos celulares convergen al mismo registro) e IDEMPOTENTE
   (v856: changed solo si el resultado difiere del remoto — sin bucles de re-subida).

   LO QUE NO CAMBIA: ausencias, registros con sesiones y celdas sin horas siguen por las
   ramas de siempre. Cambio de lógica de SYNC ⇒ APP_SYNC 926 (junto con acuses_merge). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* ══ 1. _asistFuseCelda — PURA ══ */
console.log('— la fusión de horas —');
const zF = ex(html, 'function _asistFuseCelda(');
ok('existe', !!zF);
let fuse = null;
try { fuse = new Function('return (' + zF + ')')(); } catch(e){}
ok('evalúa', typeof fuse === 'function');
if (fuse) {
  /* EL CASO DEL HALLAZGO: A marcó 07:00, B (sin ver a A) marcó 12:00 */
  const A = { presente:true, entrada:'07:00', salida:null, obraId:'ob1', geoEntrada:{lat:1}, via:'cara', _ts:1000 };
  const B = { presente:true, entrada:'12:00', salida:null, obraId:'ob1', geoEntrada:{lat:2}, via:'cara', _ts:2000 };
  const f1 = fuse(A, B);
  ok('la entrada REAL (07:00) se conserva', f1 && f1.entrada === '07:00');
  ok('el escaneo de B se rescata como SALIDA (12:00)', f1 && f1.salida === '12:00');
  ok('el geo viaja con la hora que lo aportó', f1 && f1.geoEntrada.lat === 1 && f1.geoSalida && f1.geoSalida.lat === 2);
  ok('el _ts queda en el MAYOR (converge)', f1 && f1._ts === 2000);
  ok('CONMUTATIVA: los dos celulares llegan al mismo registro', JSON.stringify(fuse(A, B)) === JSON.stringify(fuse(B, A)));

  /* entrada+salida vs entrada intermedia */
  const C = { presente:true, entrada:'07:00', salida:'16:50', _ts:3000, geoSalida:{lat:9} };
  const D = { presente:true, entrada:'12:00', salida:null, _ts:2500 };
  const f2 = fuse(C, D);
  ok('entrada más temprana + salida más tardía', f2 && f2.entrada === '07:00' && f2.salida === '16:50');

  /* una sola hora distinta: sin salida inventada */
  const f3 = fuse({ presente:true, entrada:'07:00', _ts:1 }, { presente:true, entrada:'07:00', _ts:2 });
  ok('misma hora única ⇒ sin salida inventada', f3 && f3.entrada === '07:00' && !f3.salida);

  /* la 'hora' legacy cuenta como entrada */
  const f4 = fuse({ presente:true, hora:'06:30', _ts:1 }, { presente:true, entrada:'11:00', _ts:2 });
  ok('la hora LEGACY cuenta como entrada', f4 && f4.entrada === '06:30' && f4.salida === '11:00');

  /* los campos del ganador por _ts se conservan (obra, via) */
  const f5 = fuse({ presente:true, entrada:'07:00', obraId:'VIEJA', _ts:1 }, { presente:true, entrada:'12:00', obraId:'NUEVA', via:'admin', _ts:9 });
  ok('obra y via del ganador por _ts', f5 && f5.obraId === 'NUEVA' && f5.via === 'admin');

  /* cuándo NO aplica (la rama vieja decide) */
  ok('ausencia de por medio ⇒ no aplica', fuse({ presente:false, motivo:'ENFERMO', _ts:1 }, B) === null && fuse(A, { presente:false, motivo:'X', _ts:9 }) === null);
  ok('sesiones de por medio ⇒ no aplica (v653 ya une)', fuse({ presente:true, multiSesion:true, sessions:[], _ts:1 }, B) === null);
  ok('sin horas válidas ⇒ no aplica', fuse({ presente:true, _ts:1 }, { presente:true, _ts:2 }) === null);
  ok('basura ⇒ no aplica', fuse(null, B) === null && fuse(A, undefined) === null);
}

/* ══ 2. la rama plana de _mergeAsistencia usa la fusión ══ */
console.log('\n— integrada en el merge, idempotente —');
const zMm = ex(html, 'function _mergeAsistencia(');
ok('la rama plana llama la fusión', /_asistFuseCelda\(/.test(zMm));
ok('changed SOLO si difiere del remoto (v856)', /_asistFuseCelda[\s\S]{0,220}JSON\.stringify/.test(zMm));
ok('el reemplazo viejo sigue de respaldo (ausencias, sin horas)', /_ts\(lr\) > _ts\(rr\)/.test(zMm));

/* integración de verdad: correr _mergeAsistencia con los helpers reales */
let mergeReal = null;
try {
  const deps = ['_mergeSesiones', '_recToSessions', '_asistResumenSesiones', '_asistFuseCelda']
    .map(n => ex(html, 'function ' + n + '(')).join('\n');
  mergeReal = new Function('return (function(){ ' + deps + '\n' + zMm + '\nreturn _mergeAsistencia; })()')();
} catch(e){}
ok('el merge completo evalúa con sus helpers', typeof mergeReal === 'function');
if (mergeReal) {
  const local = { '2026-08-06': { p1: { presente:true, entrada:'07:00', salida:null, _ts:1000 } } };
  const nube  = { '2026-08-06': { p1: { presente:true, entrada:'12:00', salida:null, _ts:2000 } } };
  const r1 = mergeReal(local, nube, null, '');
  const cel = r1.asistencia['2026-08-06'].p1;
  ok('MERGE REAL: entrada 07:00 + salida 12:00', cel.entrada === '07:00' && cel.salida === '12:00');
  ok('MERGE REAL: marca changed (hay que subir la fusión)', r1.changed === true);
  /* segunda pasada: lo local ya fusionado contra la nube ya fusionada ⇒ quieto */
  const r2 = mergeReal({ '2026-08-06': { p1: JSON.parse(JSON.stringify(cel)) } }, r1.asistencia, null, '');
  ok('MERGE REAL: idempotente (sin bucle v856)', r2.changed === false);
  /* una ausencia manual posterior sigue ganando por la rama vieja */
  const r3 = mergeReal({ '2026-08-06': { p1: { presente:false, motivo:'PERMISO', ausenteTs:5000, _ts:5000 } } }, r1.asistencia, null, '');
  ok('MERGE REAL: la ausencia posterior sigue ganando (rama vieja)', r3.asistencia['2026-08-06'].p1.presente === false);
}

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
