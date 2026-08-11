/* v1176 — MEDIR EL PESO COMO LO COBRA FIRESTORE, NO COMO LO CUENTA JSON.stringify

   DE DÓNDE SALE ESTO: el 11-ago vi en la consola que el payload de la asistencia figuraba como
   "1.0 MB" mientras JSON.stringify daba 507 KB, y salté a la conclusión de que Firestore cobra
   ~2× y que TODAS nuestras alarmas de peso estaban mintiendo. **Estaba equivocado.** Ese 1.0 MB
   es el encoding de TRANSPORTE del SDK ({"presente":{"booleanValue":true}}), que infla el cable
   pero no el documento. El límite de 1 MiB se mide con otra fórmula.

   LA FÓRMULA OFICIAL (firebase.google.com/docs/firestore/storage-size), textual:
     "The size of a document is the sum of: The document name size, The sum of the string size of
      each field name, The sum of the size of each field value, 32 additional bytes"
     "String sizes are calculated as the number of UTF-8 encoded bytes + 1"
   Y la tabla de valores: boolean 1 · null 1 · number 8 SIEMPRE (int o float, sin importar los
   dígitos) · string UTF-8+1 · array = suma de sus valores SIN overhead ni índices · map = como
   un documento (o sea arrastra sus propios +32).

   EL FACTOR NO ES PAREJO, y por eso un multiplicador global habría sido un error (medido):
     8000 booleanos planos ....... 0.53×   (Firestore cobra la MITAD)
     3 strings largos ............ 1.00×
     asistencia (forma real) ..... 1.05×
     4000 objetos de 4 campos .... 1.16×
     array de 60k enteros chicos . 4.00×   (8 bytes fijos c/u contra ~2 en JSON)
   El punto de equilibrio está en ~14 campos por objeto: más chico paga overhead, más grande
   ahorra. Por eso hay que MEDIR con la fórmula, no multiplicar por una constante.

   LO QUE ESTO CIERRA: la asistencia con 507 KB de JSON son ~554 KB cobrados = 54% del límite.
   No estaba al borde. Las alarmas al 75% resultaron conservadoras por accidente — subestiman
   entre 5% y 16% para la forma dominante de esta app, y ese margen queda absorbido por el
   umbral. No había urgencia nueva; la urgencia real era la asistencia sin archivar (v1175).

   REGLA: antes de dar una alarma por buena —o por mala— hay que saber qué mide exactamente. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const srcStr = ex(code, 'function _fsStrSize(');
const srcVal = ex(code, 'function _fsValSize(');
const srcMap = ex(code, 'function _fsDocSize(');
ok('existen las tres piezas', !!srcStr && !!srcVal && !!srcMap);
if (!srcStr || !srcVal || !srcMap) { console.log('PASS='+pass+' FAIL='+fail); process.exit(1); }
const F = new Function(srcStr + '\n' + srcVal + '\n' + srcMap + '\nreturn {s:_fsStrSize, v:_fsValSize, d:_fsDocSize};')();

console.log('— EL EJEMPLO OFICIAL DE LA DOCUMENTACIÓN (la prueba que vale) —');
/* users/jeff/tasks/my_task_id con {type:'Personal', done:false, priority:1,
   description:'Learn Cloud Firestore'} → la doc dice: nombre 44 + campos 71 + 32 = 147 */
const EJEMPLO = { type: 'Personal', done: false, priority: 1, description: 'Learn Cloud Firestore' };
ok('los campos del ejemplo suman 71 + los 32 del documento = 103', F.d(EJEMPLO) === 103);
ok('con el nombre del documento (44) da los 147 que dice la doc', F.d(EJEMPLO) + 44 === 147);

console.log('\n— cada tipo, como manda la tabla oficial —');
ok('string = bytes UTF-8 + 1', F.s('abc') === 4 && F.s('') === 1);
ok('acentos cuentan sus bytes reales (UTF-8, no caracteres)', F.s('ñ') === 3 && F.s('á') === 3);
ok('boolean = 1', F.v(true) === 1 && F.v(false) === 1);
ok('null = 1', F.v(null) === 1);
ok('número = 8 SIEMPRE (1 y 1234567 cuestan igual)', F.v(1) === 8 && F.v(1234567) === 8 && F.v(3.14) === 8);
ok('array = suma de sus valores, SIN overhead ni índices', F.v([true, true, true]) === 3);
ok('array vacío = 0', F.v([]) === 0);
ok('map anidado arrastra sus propios 32', F.v({ a: true }) === 32 + F.s('a') + 1);

console.log('\n— casos reales de esta app —');
/* Un registro de asistencia: muchos campos cortos ⇒ paga overhead, factor apenas > 1 */
const MARCA = { presente: true, entrada: '07:00', salida: '17:00', obraId: 'vicinia-dc', _ts: 1786473748733,
                geoEntrada: { lat: 14.595375, lng: -90.554134, acc: 100, ts: 1783348858026 } };
ok('una marca de asistencia pesa parecido en ambos (factor cercano a 1)', (() => {
  const r = F.d(MARCA) / JSON.stringify(MARCA).length;
  return r > 0.7 && r < 1.6;
})());
/* Un descriptor de cara: 128 floats ⇒ Firestore cobra MENOS de la mitad que JSON */
ok('los descriptores de caras cuestan MENOS que en JSON', (() => {
  const caras = { d: Array.from({length: 128}, () => 0.123456789012345) };
  return F.d(caras) < JSON.stringify(caras).length / 2;
})());
/* Un array largo de enteros chicos ⇒ Firestore cobra 4× (8 bytes fijos por número) */
ok('un array de enteros chicos cuesta MÁS que en JSON (8 bytes fijos c/u)', (() => {
  const arr = { etapas: Array.from({length: 500}, (_, i) => i % 6) };
  return F.d(arr) > JSON.stringify(arr).length * 2;
})());

console.log('\n— no rompe con nada —');
ok('tolera objeto vacío', F.d({}) === 32);
ok('tolera null y undefined', (() => { try { return F.d(null) === 32 && F.v(undefined) === 1; } catch(e){ return false; } })());
ok('tolera anidamiento profundo', (() => { try { return F.d({a:{b:{c:{d:{e:1}}}}}) > 0; } catch(e){ return false; } })());

console.log('\n— la vigilancia de peso ya mide con esto —');
const vig = ex(code, 'function _autoAligerarProyectos(');
ok('_autoAligerarProyectos usa la medición real', /_fsDocSize\(/.test(vig));
ok('sigue comparando contra el límite de 1 MiB', /1048576/.test(vig));
ok('y conserva el umbral del 75%', /0\.75|UMBRAL/.test(vig));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
