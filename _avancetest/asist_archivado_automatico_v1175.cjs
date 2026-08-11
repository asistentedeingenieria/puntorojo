/* v1175 — EL ARCHIVADO DE ASISTENCIA SE HACE SOLO

   LO QUE PASÓ: el archivado (v1148) funciona perfecto — movió 24 días a documentos por mes sin
   perder nada — pero hay que APRETAR UN BOTÓN cada mes. Nadie lo apretó desde el 6 de julio, y
   el 11-ago el documento caliente llevaba 32 días acumulados (507 KB por JSON, ~1 MB en el
   formato real de Firestore). Ese payload es el que satura la cola de escrituras y hace que las
   subidas tarden más de 45 s, que es lo que dispara el aviso de lentitud.

   Yo mismo escribí en las notas de v1148 que "el botón se re-aprieta cada mes". Un mantenimiento
   que depende de que alguien se acuerde no es un mantenimiento: se olvida. Se olvidó.

   Y Antonio lo pidió textual el 10-ago: "quiero que TU siempre solito estés pendiente y estés al
   día para que no vuelva a pasar. No quiero que me avises, quiero mejor que lo vayas corrigiendo".

   EL DISEÑO, conservador a propósito:
   · La decisión es una función PURA y con test: hay material suficiente Y no se corrió hace poco.
   · Solo lo dispara un ADMINISTRADOR. Si 50 dispositivos archivaran a la vez sería un desastre;
     los admins son pocos y el sello en la nube (asistArchAutoTs) evita que dos coincidan.
   · Reutiliza EL MISMO archivado probado en producción: transacción por mes, verificación día
     por día ANTES de mover el corte, y si algo falla el corte no se mueve y no se pierde nada.
     No se reescribe la lógica delicada — solo se le saca el modal de confirmación.
   · Corre en el arranque, con retraso, para no competir con la carga inicial.

   REGLA: si una tarea hay que repetirla cada mes para que la app siga sana, la app tiene que
   hacerla sola. Un recordatorio no alcanza — ya se probó y falló. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const H = 3600000, AHORA = 1786473748733;

console.log('— la decisión (PURA): cuándo corresponde archivar solo —');
const src = ex(code, 'function _asistArchAutoDebe(');
ok('existe _asistArchAutoDebe', !!src);
if (src) {
  const f = new Function(src + '\nreturn _asistArchAutoDebe;')();

  /* EL CASO REAL DEL 11-ago: 32 días acumulados y nunca se corrió el automático */
  ok('32 días viejos y nunca corrió → ARCHIVA', f(32, 0, AHORA) === true);
  ok('pocos días → no molesta', f(5, 0, AHORA) === false);
  ok('cero días → no hace nada', f(0, 0, AHORA) === false);

  console.log('\n— no se repite: como mucho una vez al día —');
  ok('ya corrió hace 1 hora → NO repite', f(32, AHORA - H, AHORA) === false);
  ok('corrió hace 25 horas → vuelve a correr', f(32, AHORA - 25*H, AHORA) === true);
  ok('corrió hace 19 horas → todavía no', f(32, AHORA - 19*H, AHORA) === false);

  console.log('\n— no rompe con datos raros —');
  ok('tolera sello basura', f(32, 'xx', AHORA) === true && f(32, null, AHORA) === true);
  ok('tolera días negativo o basura', f(-3, 0, AHORA) === false && f('x', 0, AHORA) === false);
  ok('un sello del FUTURO no lo deja corriendo en bucle', f(32, AHORA + 10*H, AHORA) === false);
}

console.log('\n— el archivado admite modo automático SIN tocar su lógica delicada —');
const arch = ex(code, 'window._asistArchivarViejo = async function(');
ok('acepta opciones', /async function\(\s*opts/.test(code) || /_asistArchivarViejo = async function\(opts/.test(code));
ok('en automático NO abre el modal de confirmación', /_auto\s*\?|opts\s*&&\s*opts\.auto|!_auto/.test(arch));
ok('el modal SIGUE existiendo para el uso manual', /prConfirm\(/.test(arch));
ok('sigue exigiendo administrador', /users\.manage/.test(arch));
ok('sigue verificando ANTES de mover el corte', /_asistArchFaltantes\(/.test(arch) && /LA VERIFICACIÓN FALLÓ|_falt\.length/.test(arch));
ok('sigue usando transacción por mes', /runTransaction/.test(arch));
ok('sella cuándo corrió el automático', /asistArchAutoTs/.test(code));

console.log('\n— el disparador —');
ok('existe el disparador automático', /_asistArchAutoIntentar/.test(code));
const disp = ex(code, 'function _asistArchAutoIntentar(');
ok('solo lo corre un administrador (50 a la vez sería un desastre)', /users\.manage/.test(disp));
ok('consulta la decisión pura', /_asistArchAutoDebe\(/.test(disp));
ok('cuenta los días viejos con el agrupador ya probado', /_asistArchAgruparMes\(/.test(disp));
ok('no interrumpe: sin modales ni toasts al usuario', !/showToast\(/.test(disp));
ok('está enganchado en el arranque con retraso', /setTimeout\([^)]*_asistArchAutoIntentar|_asistArchAutoIntentar\(\)/.test(code));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
