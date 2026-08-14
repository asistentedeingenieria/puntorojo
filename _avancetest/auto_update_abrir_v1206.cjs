/* v1206 — LA APP SE ACTUALIZA SOLA AL ABRIR (Antonio, 13-ago: "¿podemos hacer algo para
   que automáticamente se actualice en TODOS cuando lo abran?" — al subir el mínimo a 939,
   DAVID SURET quedaba parado en v938 hasta chocar con el candado o hacer el doble ciclo).

   Al abrir (+8 s) y al VOLVER a la pestaña (máx. 1 vez cada 10 min) se baja sw.js SIN
   caché y se compara su CACHE_VERSION contra la versión que corre (el chip). Si hay más
   nueva: con la app quieta (isUserBusy) se dispara _autoActualizar (v1165 — SKIP_WAITING +
   limpiar cachés + reload con guard anti-bucle). Un intento fallido para ESA versión no se
   repite en la sesión (SW trabado ⇒ no ciclar; el candado de red sigue de respaldo). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const z = ex(code, 'async function _chequearVersionPublicada(');
ok('existe', !!z);
ok('baja sw.js SIN caché (cache-bust + no-store)', /sw\.js\?nocache=/.test(z) && /no-store/.test(z));
ok('lee la versión publicada del CACHE_VERSION', /CACHE_VERSION = 'v\(\\d\+\)/.test(z) || /CACHE_VERSION/.test(z));
ok('compara contra el chip que corre', /\^v\(\\d\{3,4\}\)\$/.test(z) || /v\(\\d\{3,4\}\)/.test(z));
ok('solo actualiza si la publicada es MÁS NUEVA (nunca cicla en iguales)', /remota > local/.test(z));
ok('con un modal abierto NO recarga (reintenta al volver)', /isUserBusy/.test(z));
ok('un intento fallido para esa versión no se repite (SW trabado ⇒ no ciclar)', /_verIntento/.test(z) && /sessionStorage/.test(z));
ok('usa la maquinaria probada de v1165', /_autoActualizar\(/.test(z));
ok('throttle de 10 min', /600e3/.test(z));
ok('corre al ABRIR', /setTimeout\(function\(\)\{ _chequearVersionPublicada\('al abrir'\)/.test(code));
ok('y al VOLVER a la pestaña', /visibilitychange/.test(code.slice(code.indexOf('_chequearVersionPublicada'), code.indexOf('_chequearVersionPublicada') + 4000)));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
