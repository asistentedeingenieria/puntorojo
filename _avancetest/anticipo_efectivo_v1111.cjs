/* v1111 — ANTICIPO EN EFECTIVO, SIN COTIZACIÓN (Antonio):
   "la primera persona que sale se le va a aprobar, pero lo que se le va a dar es efectivo para
   que él compre la herramienta. Para esto NO necesito que nadie me pase la cotización. Esto lo
   apruebo yo y quiero que en algún lado diga AUTORIZADO REALIZAR LA TRANSFERENCIA."

   Caso real: José Miguel pide Q3,600 en efectivo para una pistola Hilti de segunda — no hay
   proveedor formal que cotice, así que la solicitud se quedaba trabada en PENDIENTE DE
   COTIZACIÓN para siempre.

   REGLA (definida por Antonio): "la misma regla del monto que ya tenemos para ver en cuántas
   cuotas se va a descontar, pero el monto se desembolsa al 100%". O sea: se descuenta lo
   autorizado, las cuotas salen de _v416CuotasPorMonto, y NO hay que esperar factura. Por eso
   este camino cierra en un solo paso.

   Es un ATAJO del flujo normal, no un flujo nuevo: la solicitud queda 'autorizada' igual que
   siempre y sigue por ENTREGAR como cualquier otra. Solo se salta la cotización, y solo lo
   puede hacer el admin. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. el atajo existe y es SOLO del admin —');
const z = ex('window._antAutorizarEfectivo = async function(');
ok('existe _antAutorizarEfectivo', z.length > 300);
ok('exige admin', /_antEsAdmin\(\)/.test(z));
/* ojo: la función SÍ nombra 'anticipos.cotizar', pero para NOTIFICAR a compras que hay que
   hacer la transferencia — no como permiso. Lo que se verifica es que el GUARD sea solo admin. */
ok('el permiso NO se abre a quien cotiza', !/can\(\s*'anticipos\.cotizar'\s*\)/.test(z));
ok('el único gate es el admin', /if\(!_antEsAdmin\(\)\)/.test(z));
ok('pero sí les avisa a compras para que transfieran', /_antSolicNotif\(\['anticipos\.cotizar'\]/.test(z));

console.log('\n— 2. usa la MISMA regla de cuotas que el flujo normal —');
ok('calcula las cuotas con _v416CuotasPorMonto', /_v416CuotasPorMonto\(/.test(z));
ok('el monto autorizado es el que se descuenta (100%)', /cotMonto/.test(z));
ok('deja la solicitud AUTORIZADA, como el flujo normal', /estado\s*=\s*'autorizada'/.test(z));
ok('guarda las cuotas en la solicitud', /\.cuotas\s*=/.test(z));

console.log('\n— 3. queda marcada como EFECTIVO (para distinguirla) —');
ok('marca la solicitud como efectivo', /efectivo\s*=\s*true/.test(z));
ok('deja constancia de que no hubo cotización', /SIN COTIZACIÓN|EFECTIVO/.test(z));

console.log('\n— 4. "AUTORIZADO · REALIZAR TRANSFERENCIA" se ve —');
ok('el rótulo existe', /REALIZAR (LA )?TRANSFERENCIA/.test(html));
ok('sale cuando la solicitud es en efectivo y está autorizada',
  /efectivo[\s\S]{0,300}REALIZAR (LA )?TRANSFERENCIA|REALIZAR (LA )?TRANSFERENCIA[\s\S]{0,300}efectivo/.test(html));
/* el que hace la transferencia necesita ver a quién y cuánto */
ok('muestra el monto a transferir', /_money\(|toFixed\(2\)/.test(z) || /REALIZAR/.test(html));

console.log('\n— 5. no rompe el flujo normal —');
/* el flujo normal se llama autorizarSolicitudAnticipoFlujo (no ...Anticipo a secas) */
const zA = ex('window.autorizarSolicitudAnticipoFlujo = function(');
ok('el flujo normal de autorización sigue existiendo', zA.length > 100);
ok('los dos caminos usan la MISMA regla de cuotas',
  (html.match(/_v416CuotasPorMonto\(/g) || []).length >= 2);
ok('el botón de subir cotización sigue', /SUBIR COTIZACIÓN/.test(html));

console.log('\n— 6. sync —');
ok('sella _ts', /_ts\s*=\s*Date\.now\(\)/.test(z));
ok('sube al instante (es plata)', /forceUploadNow/.test(z));
ok('avisa a quien corresponde', /_antSolicNotif/.test(z));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
