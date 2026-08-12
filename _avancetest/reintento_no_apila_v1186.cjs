/* v1186 — EL REINTENTO YA NO SE APILA SOBRE LAS ESCRITURAS ENCOLADAS

   LA EVIDENCIA DEFINITIVA (11-ago ~21:15, condiciones perfectas): con CERO empleados
   conectados, el resource-exhausted volvió a disparar. NO era la contención de los 50:
   UN SOLO cliente se satura a sí mismo. El mecanismo, paso a paso:

   1. La subida con debounce despacha ~900 KB de documentos (batches de hasta 450 ops).
   2. El canal tarda; a los 45 s salta el guard v1139: libera el candado para poder RECIBIR
      (correcto — ese candado colgado causó los pedidos perdidos del 4-ago) y avisa que
      "la escritura sigue encolada".
   3. …y ahí estaba el error: el guard llamaba this.scheduleSave() — UN REINTENTO INMEDIATO.
      Las escrituras anteriores SIGUEN ENCOLADAS (el SDK no las cancela), y como sus hashes
      solo se aplican cuando el commit confirma, el reintento ve los documentos "cambiados"
      y ENCOLA EL PAYLOAD COMPLETO OTRA VEZ. Cada 45 s, ~1 MB más sobre la pila, hasta
      "Write stream exhausted maximum allowed queued writes".

   EL FIX — esperar, no apilar:
   · _subidaEnVuelo: la promesa de la subida en curso. Mientras exista, NADIE despacha otra:
     el debounce y el guard solo levantan la bandera _reintentarAlConfirmar.
   · Cuando la subida por fin CONFIRMA (aunque tarde minutos), sus hashes quedan aplicados y
     la bandera dispara UNA re-subida — que el hash-skip vuelve barata (solo lo que cambió).
   · RED DE SEGURIDAD contra la promesa colgada PARA SIEMPRE (el incidente v1139 original):
     si 90 s después del guard la subida sigue sin confirmar, se ABANDONA esa promesa y se
     permite UN reintento. Acotado: un duplicado cada 135 s como peor caso, no uno cada 45.
   · forceUploadNow (las acciones de plata) se ENCADENA detrás de la subida en vuelo en vez
     de despachar en paralelo, y al confirmar descarga la bandera pendiente.
   · El catch real (la escritura RECHAZADA, no lenta) no cambia: _chipError y su backoff. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const sch = ex(code, 'scheduleSave(){');
ok('scheduleSave existe', !!sch);

console.log('— el debounce NO despacha si hay una subida en vuelo —');
ok('gate de entrada: subida en vuelo o force en vuelo ⇒ solo bandera',
  /if \(this\._subidaEnVuelo \|\| this\._forceInFlight\) \{ this\._reintentarAlConfirmar = true; return; \}/.test(sch));

console.log('\n— el guard de 45 s ya NO re-encola —');
ok('el guard NO llama scheduleSave directo (eso era la pila)',
  !/console\.warn\('\[v1139\][\s\S]{0,200}this\.scheduleSave\(\)/.test(sch));
ok('en su lugar levanta la bandera', /_chipError\(_errLento\(\)\)[\s\S]{0,200}_reintentarAlConfirmar = true/.test(sch));
ok('sigue liberando el candado para RECIBIR (la protección v1139 original)',
  /if \(!this\.uploadingNow\) return;[\s\S]{0,60}this\.uploadingNow = false;/.test(sch));

console.log('\n— la red de seguridad contra la promesa colgada PARA SIEMPRE —');
ok('arma el abandono a los 90 s del guard', /_guardAbandono = setTimeout\(/.test(sch) && /90000/.test(sch));
ok('el abandono solo actúa si ES la misma subida colgada (identidad)', /_subidaEnVuelo === _p0/.test(sch));
ok('y permite UN reintento, avisando', /se ABANDONA/.test(sch) && /_subidaEnVuelo = null;[\s\S]{0,80}scheduleSave\(\)/.test(sch));

console.log('\n— al CONFIRMAR: limpiar y despachar lo acumulado UNA vez —');
ok('la promesa en vuelo se registra', /this\._subidaEnVuelo = _p;/.test(sch));
ok('al resolver se limpia por identidad (no pisa una más nueva)', /if \(this\._subidaEnVuelo === _p\) this\._subidaEnVuelo = null;/.test(sch));
ok('se desarma el abandono al resolver', /clearTimeout\(this\._guardAbandono\)/.test(sch));
ok('la bandera dispara UNA re-subida al confirmar', /const _re = this\._reintentarAlConfirmar; this\._reintentarAlConfirmar = false;/.test(sch) && /if \(_re\) \{ try \{ this\.scheduleSave\(\); \} catch/.test(sch));
ok('el catch real no cambió: _chipError con su backoff', /catch\(\(e\) => \{[\s\S]{0,400}this\._chipError\(e\);/.test(sch));

console.log('\n— forceUploadNow (plata) se ENCADENA, no apila —');
const fun = ex(code, 'async forceUploadNow(){');
ok('si hay subida con debounce en vuelo, espera y reintenta', /if \(this\._subidaEnVuelo\) \{[\s\S]{0,220}\.then\(\(\) => this\.forceUploadNow\(\)\)/.test(fun));
ok('su coalescing propio (v954) sigue intacto', /_forceInFlight/.test(fun) && /_forceQueued/.test(fun));
ok('al confirmar descarga la bandera pendiente', /_reintentarAlConfirmar/.test(fun));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
