/* v1173 — NO HABÍA BUCLE: EL DETECTOR DE BUCLES ESTABA CIEGO

   EL SÍNTOMA (10-ago, con la cola de escrituras saturada):
     [CIRCUIT-BREAKER] Bucle de re-sync detectado — se PAUSA la re-subida 60s.
                       Difiere del remoto en: asistencia, projects(colab/tomas/caras)

   Cuatro auditores revisaron un merge cada uno (asistencia, colaboradores, tomas, caras) con un
   refutador independiente detrás. VEREDICTO: los merges están BIEN, son idempotentes. El
   problema es la HUELLA con la que el cortacircuitos decide si "es el mismo estado repetido".

   LA CAUSA, en una línea:
       Object.keys(A).sort().map(function(d){ return d + ':' + ((A[d] || []).length); })
   `asistenciaGlobal[fecha]` es un MAPA {personaId: registro}, NO un arreglo, así que `.length`
   es **undefined siempre**. La huella de la asistencia se reduce a la lista de FECHAS:
   "2026-08-10:undefined". El comentario de v1091 dice que la asistencia "entra por TAMAÑO";
   la intención era correcta, la implementación no medía nada.

   DEMOSTRADO ejecutando el código real (no a mano): con 1 persona marcada y con 30, la huella
   da idéntica. Cinco pasadas con estados REALMENTE distintos (31→35 personas marcando) producen
   la misma cadena, y a la quinta el breaker concluye "bucle" y pausa 60 s. Era un FALSO POSITIVO:
   la app estaba sincronizando bien, solo que lento porque la cola estaba saturada por el bug de
   v1166 (ya corregido en v1168).

   Y la firma por proyecto (v891) tampoco cubría lo que el propio mensaje nombra: mira
   planillasArmadas, pagos y retenciones, pero NO planilla.colaboradores ni materiales.tomas.
   OJO — hay DOS listas de colaboradores y solo una era ciega: colaboradoresGlobal SÍ entraba en
   la huella; la del proyecto (p.planilla.colaboradores) no. El fix apunta a esa.

   ALCANCE HONESTO: el disparo falso no perdía datos ni congelaba la app — el estado ya se había
   aplicado localmente. Costaba hasta 60 s de retraso en propagar, y el toast rojo "SYNC EN PAUSA"
   que asusta a cualquiera. Pero mientras el detector estuviera ciego, un bucle DE VERDAD tampoco
   se distinguiría de esto.

   REGLA: un detector que no puede distinguir dos estados distintos no es un detector. Si una
   huella resume una estructura, hay que probar que cambia cuando la estructura cambia. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const src = ex('function _resyncFingerprint(');
ok('existe _resyncFingerprint', !!src);
if (!src) { console.log('PASS='+pass+' FAIL='+fail); process.exit(1); }
const fp = new Function(src + '\nreturn _resyncFingerprint;')();

/* Estado base realista: un día de asistencia con N personas marcadas (MAPA, no arreglo) */
function estado(nPersonas, nColabs, nTomas){
  const dia = {};
  for (let i = 0; i < nPersonas; i++) dia['p' + i] = { entrada: '07:00', salida: '17:00' };
  return {
    personalGlobal: [], colaboradoresGlobal: [], polizasGlobales: [], anticiposGlobales: [],
    asistenciaGlobal: { '2026-08-10': dia },
    projects: [{
      id: 'obra1',
      planilla: {
        planillasArmadas: [], pagos: [], retencionesPlanillas: [],
        colaboradores: Array.from({length: nColabs}, (_, i) => ({ id: 'c' + i, _ts: 1000 + i }))
      },
      materiales: { tomas: Array.from({length: nTomas}, (_, i) => ({ id: 't' + i, _ts: 2000 + i })) }
    }]
  };
}

console.log('— LA CEGUERA (el bug): la huella tiene que ver el contenido de la asistencia —');
ok('1 persona marcada ≠ 30 personas marcadas', fp(estado(1,0,0)) !== fp(estado(30,0,0)));
ok('30 ≠ 31 (una marca más y la huella cambia)', fp(estado(30,0,0)) !== fp(estado(31,0,0)));
/* El caso EXACTO que disparó el falso positivo: cinco pasadas seguidas con una marca más cada
   vez. Antes las cinco daban la misma cadena y el breaker gritaba "bucle". */
const cinco = [31,32,33,34,35].map(n => fp(estado(n,0,0)));
ok('cinco estados distintos → cinco huellas distintas (el falso positivo del 10-ago)',
  new Set(cinco).size === 5);

console.log('\n— lo que el mensaje del breaker nombraba y la huella no miraba —');
ok('colaboradores DEL PROYECTO cambian la huella', fp(estado(5,0,0)) !== fp(estado(5,8,0)));
ok('tomas de inventario cambian la huella', fp(estado(5,0,0)) !== fp(estado(5,0,3)));

console.log('\n— estabilidad: sin cambios, la huella NO puede cambiar —');
ok('el mismo estado da la misma huella', fp(estado(30,8,3)) === fp(estado(30,8,3)));
ok('dos llamadas seguidas coinciden', (() => { const e = estado(12,4,2); return fp(e) === fp(e); })());
ok('el orden de las personas del día no la altera', (() => {
  const a = estado(0,0,0), b = estado(0,0,0);
  a.asistenciaGlobal['2026-08-10'] = { x: 1, y: 2 };
  b.asistenciaGlobal['2026-08-10'] = { y: 2, x: 1 };
  return fp(a) === fp(b);
})());

console.log('\n— lo que ya funcionaba sigue funcionando —');
ok('un día nuevo cambia la huella', (() => {
  const a = estado(3,0,0), b = estado(3,0,0);
  b.asistenciaGlobal['2026-08-11'] = { p0: {} };
  return fp(a) !== fp(b);
})());
ok('colaboradoresGlobal (la lista GLOBAL) sigue contando', (() => {
  const a = estado(3,0,0), b = estado(3,0,0);
  b.colaboradoresGlobal = [{ id: 'g1' }];
  return fp(a) !== fp(b);
})());
ok('tolera estado vacío sin romper', (() => { try { return typeof fp({}) === 'string'; } catch(e){ return false; } })());
ok('tolera asistencia con arreglo (formato viejo) sin romper', (() => {
  try { return typeof fp({ asistenciaGlobal: { '2026-08-10': [1,2,3] } }) === 'string'; } catch(e){ return false; }
})());

console.log('\n— el cortacircuitos en sí no se tocó —');
const brk = ex('function _evalResyncBreaker(');
ok('sigue disparando con la MISMA huella repetida', /same > K/.test(brk));
ok('la ventana y el umbral no se aflojaron (no se tapa el síntoma)', /WIN = 90000/.test(brk) && /K = 4/.test(brk));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
