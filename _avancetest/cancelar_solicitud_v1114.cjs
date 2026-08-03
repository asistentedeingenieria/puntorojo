/* v1114 — CANCELAR UNA SOLICITUD DE ANTICIPO LA QUITA DE VERDAD (bug reportado por Antonio:
   "aquí cuando le doy cancelar no se elimina, solo me sale LA SOLICITUD YA CAMBIÓ DE ESTADO").

   CAUSA RAÍZ (regresión mía de v1098): ahí amplié el guard de ENTRADA a "cualquier estado vivo"
   para poder matar solicitudes que ya tenían cotización, pero dejé la RE-VALIDACIÓN de después
   del modal con el criterio viejo (solo pendiente_cotizacion / pendiente_autorizacion). La
   solicitud pasaba el primer control, se abría el confirm, y al volver rebotaba en el segundo.
   Nunca se cancelaba y el usuario solo veía el toast rojo.
   REGLA: los dos guards de una acción con modal en medio tienen que decir lo MISMO. Si se
   amplía uno, se amplía el otro.

   Además Antonio pidió que se ELIMINE, no solo que quede marcada como cancelada: una solicitud
   muerta ocupando lugar en la lista no le sirve. Se borra del array Y se escribe el tombstone
   en el mismo paso — sin tombstone el union-merge la revive desde otro dispositivo (v844). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const z = ex('window.cancelarSolicitudAnticipo = async function(');
ok('existe cancelarSolicitudAnticipo', z.length > 400);

console.log('\n— 1. EL BUG: los dos guards dicen lo mismo —');
/* el de entrada y el de después del modal, ambos por el mismo criterio */
const guards = z.match(/estado==='cancelada' \|\| \w*\.?estado==='entregada'/g) || [];
ok('hay DOS guards con el mismo criterio (entrada y post-modal)', guards.length >= 2);
ok('la re-validación ya NO exige las dos etapas iniciales',
  !/sol2\.estado!=='pendiente_cotizacion'/.test(z));
ok('sigue re-leyendo del state tras el await (patrón v769/v770)', /sol2 = _antSolics\(\)/.test(z));
ok('y sigue avisando si de verdad cambió de estado', /YA CAMBIÓ DE ESTADO/.test(z));

console.log('\n— 2. se elimina de verdad —');
ok('la saca del array', /splice\(/.test(z));
ok('escribe el tombstone (si no, el merge la revive)', /solicitudesAnticipoEliminadas\[solId\]/.test(z));
ok('sella _ts antes de sacarla', /_ts=Date\.now\(\)/.test(z));
ok('sube al instante', /forceUploadNow/.test(z));
ok('el aviso dice que se quitó', /CANCELADA Y QUITADA/.test(z));
ok('el confirm avisa que es definitivo', /definitivamente/.test(z));

console.log('\n— 3. sigue siendo solo del admin —');
ok('exige admin', /_antEsAdmin\(\)/.test(z));
ok('no se puede cancelar lo ya entregado', /estado==='entregada'/.test(z));

console.log('\n— 4. el tombstone lo respeta el sync —');
const iAR = html.indexOf('applyRemote(remoteData');
const zAR = html.slice(iAR, iAR + 40000);
ok('applyRemote conoce el tombstone de solicitudes', /solicitudesAnticipoEliminadas/.test(zAR));

console.log('\n— 5. lo que no se toca —');
ok('PAUSAR sigue con su propio criterio', /pausarSolicitudAnticipo/.test(html));
ok('ELIMINAR de canceladas sigue existiendo', /eliminarSolicitudAnticipo/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
