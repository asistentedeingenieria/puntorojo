/* v1098 — DOS PEDIDOS DE ANTONIO (31-jul):

   (A) "Necesito solo yo como admin poder eliminar y cancelar solicitudes que ya NO van a
   aplicar. Esto lo debo de poder hacer solo yo."
   Antes: CANCELAR lo podía hacer el CREADOR de la solicitud (el supervisor que la pidió) o el
   gerente, y solo mientras estaba en pendiente_cotizacion / pendiente_autorizacion — por eso en
   la pantalla una tarjeta mostraba el botón y la de al lado no: la que ya tenía cotización
   había pasado de estado y se quedaba sin forma de cancelarse.
   Ahora: CANCELAR es SOLO del admin, y sirve en cualquier estado vivo. Justamente los casos que
   Antonio quiere matar (el nivel láser que no consiguen, la pistola que entra en 5 semanas) ya
   pasaron de la etapa donde el botón existía.

   (B) "Elimina la opción que agregaste de obra pequeña. No tiene sentido eso."
   Sale el botón OBRA PEQUEÑA de cada fila de colaborador. El CHIP informativo se queda: si
   alguien YA quedó marcado en una obra pequeña, ese dato se sigue viendo — se quita la opción
   de marcar, no el historial. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— A1. CANCELAR es solo del admin —');
const zC = ex('window.cancelarSolicitudAnticipo = async function(');
ok('cancelarSolicitudAnticipo existe', zC.length > 200);
ok('exige admin', /_antEsAdmin\(\)/.test(zC));
ok('ya NO alcanza con ser el creador', !/esCreador/.test(zC));
ok('ya NO alcanza con ser gerente', !/_antEsGerente\(\)/.test(zC));

console.log('\n— A2. se puede cancelar lo que ya no aplica, esté donde esté —');
ok('no se limita a las dos etapas iniciales', !/sol\.estado!=='pendiente_cotizacion' && sol\.estado!=='pendiente_autorizacion'/.test(zC));
ok('no se cancela lo ya cancelado', /'cancelada'/.test(zC));
ok('no se cancela lo ya entregado', /'entregada'/.test(zC));
ok('sigue re-leyendo el estado tras el modal (patrón v769/v770)', /sol2/.test(zC));

console.log('\n— A3. el botón, igual —');
ok('el botón CANCELAR se pinta solo para el admin', /_antEsAdmin\(\)[^;]*cancelarSolicitudAnticipo|cancelarSolicitudAnticipo[^;]*_antEsAdmin\(\)/.test(html) || /_puedeCancelarSol/.test(html));

console.log('\n— A4. ELIMINAR sigue como estaba (admin + cancelada + tombstone) —');
const zE = ex('window.eliminarSolicitudAnticipo = async function(');
ok('eliminarSolicitudAnticipo existe', zE.length > 150);
ok('sigue siendo solo admin', /_antEsAdmin\(\)/.test(zE));
ok('escribe tombstone (el sync no la revive)', /solicitudesAnticipoEliminadas/.test(zE));
ok('el merge sigue respetando el tombstone', /solicitudesAnticipoEliminadas/.test(html.slice(html.indexOf('_solAnTomb') - 400, html.indexOf('_solAnTomb') + 400)));
ok('el botón ELIMINAR sigue pidiendo estado cancelada', /estado==='cancelada' && _antEsAdmin\(\)/.test(html));

console.log('\n— B. fuera el botón OBRA PEQUEÑA de los colaboradores —');
ok('ya no se ofrece marcar obra pequeña desde la fila', !/_marcarObraPequena\('\+c\.id\+'\)/.test(html) && !/>OBRA PEQUEÑA<\/button>/.test(html));
ok('pero el chip de quien YA está marcado sigue (no se pierde el dato)', /_peqChip/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
