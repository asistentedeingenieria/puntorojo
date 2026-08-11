/* v1168 — MI ERROR DE v1166: el proyecto quedó "sucio para siempre" y reescribía 858 KB
   en cada subida de cada usuario, hasta desbordar la cola de escrituras de Firestore.

   SÍNTOMA (11-ago, 00:33 y 00:35, con 50 personas trabajando):
     FirebaseError: [code=resource-exhausted]: Write stream exhausted maximum allowed queued writes
     @firebase/firestore: Using maximum backoff delay to prevent overloading the backend
   minutos después de importar los 375 gastos históricos a VICINIA DEL CARMEN.

   CAUSA RAÍZ — las dos puntas del hash quedaron desalineadas:
     · SUBIR   (uploadCurrent 9773): projects[_xi] = _projSinGastosImp(_xp)  → hashea SIN gastos
     · BAJAR   (applyRemote 10643):  _projSinPagosCongelados(_projSinReceta(pp)) → hashea CON gastos
   Nunca pueden coincidir ⇒ el hash-skip ("si no cambió, no lo reescribas") deja de acertar y
   el documento MÁS PESADO de la base se reescribe entero en CADA subida. Antes de v1166 esas
   escrituras sencillamente no ocurrían.

   Lo peor: el comentario que yo mismo dejé en v930 (líneas 10639-10642) advierte de este
   error exacto para la receta — "hashearla crearía re-escrituras eternas" — y lo repetí con
   los gastos. La partición se copió a medias: faltaban las tres piezas que receta (v930) y
   pagos congelados (v931) sí tienen.

   REGLA QUE QUEDA: partir un dato a su propio documento son CUATRO piezas, no una. (1) el
   strip al subir, (2) el re-adjuntado al bajar, (3) el hash calculado sobre la MISMA forma
   canónica en ambas puntas, y (4) la migración de los que aún vienen embebidos. Si falta la
   3, no se rompe nada visible: solo se reescribe todo, siempre, hasta que la base se satura. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— LA SIMETRÍA (el corazón del bug) —');
const srcStrip = ex(code, 'function _projSinGastosImp(');
ok('existe _projSinGastosImp', !!srcStrip);
if (srcStrip) {
  const strip = new Function(srcStrip + '\nreturn _projSinGastosImp;')();
  const conGastos = { id: 'p1', name: 'VICINIA', materiales: { pedidos: [1,2], gastosImp: [{id:'g1',total:100},{id:'g2',total:200}] } };
  const sinGastos = { id: 'p1', name: 'VICINIA', materiales: { pedidos: [1,2] } };
  /* LA PROPIEDAD que hace que los dos hashes coincidan: pasar por el strip vuelve
     INDISTINGUIBLE al proyecto que trae los gastos del que no los trae. */
  ok('el strip neutraliza la diferencia (subida ≡ bajada)',
    JSON.stringify(strip(conGastos)) === JSON.stringify(strip(sinGastos)));
  ok('NO muta el original — en memoria la app sigue viendo los gastos',
    conGastos.materiales.gastosImp.length === 2);
  ok('tolera un proyecto sin materiales', (() => { try { strip({ id: 'x' }); return true; } catch(e){ return false; } })());
  ok('tolera null', (() => { try { strip(null); return true; } catch(e){ return false; } })());
}

console.log('\n— la punta que faltaba: applyRemote hashea con la MISMA forma canónica —');
const hashLine = (code.match(/const _nh = \{\};[\s\S]{0,420}?this\._projHashes = _nh;/) || [''])[0];
ok('la línea del hash existe', !!hashLine);
ok('descuenta la receta (v930)', /_projSinReceta/.test(hashLine));
ok('descuenta los pagos congelados (v931)', /_projSinPagosCongelados/.test(hashLine));
ok('DESCUENTA LOS GASTOS IMPORTADOS (v1168) ← lo que faltaba', /_projSinGastosImp/.test(hashLine));

console.log('\n— migración: los proj_ que aún traen gastos embebidos salen del hash-skip —');
ok('_assembleFromSnap marca los embebidos', /_gastosImpEmbebidaIds/.test(code));
ok('applyRemote los saca del hash-skip', /_gastosImpEmbebidaIds \|\| \[\]\)\.forEach/.test(hashLine + code));
ok('y limpia la clave temporal', /delete merged\._gastosImpEmbebidaIds/.test(code));

console.log('\n— los hashes del doc gastosimp_ se siembran al BAJAR (si no, se reescribe entero cada sesión) —');
ok('_assembleFromSnap expone _gastosImpDocOnly', /data\._gastosImpDocOnly/.test(code));
ok('applyRemote siembra this._gastosImpHashes desde lo bajado', /_gastosImpDocOnly[\s\S]{0,240}this\._gastosImpHashes/.test(code));
ok('y limpia la clave temporal', /delete merged\._gastosImpDocOnly/.test(code));

console.log('\n— higiene: el doc de un proyecto eliminado se borra (receta y pagos ya lo hacían) —');
const up = ex(code, 'async uploadCurrent(){');
ok('borra receta_ de proyectos eliminados', /receta_/.test(up) && /delete/.test(up));
ok('borra gastosimp_ de proyectos eliminados', /gastosimp_' \+ id|gastosimp_'\+id/.test(up));

console.log('\n— no se rompió la partición: el orden SEGURO sigue intacto —');
ok('el doc se confirma ANTES de quitar los gastos del clon',
  up.indexOf("doc('gastosimp_'") >= 0 && up.indexOf("doc('gastosimp_'") < up.indexOf('_projSinGastosImp(_xp)'));
ok('si la escritura falla, los gastos VIAJAN EMBEBIDOS (no se pierden)', /viajan embebidos|continue;/.test(up));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
