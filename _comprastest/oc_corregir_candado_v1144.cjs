/* v1144 — EL BOTÓN CORREGIR AHORA SÍ CORRIGE (el candado v927 bloqueaba la edición)

   Antonio (5-ago): "La persona de finanzas ya rechazó la orden... pero cuando [compras] le da
   corregir, no le deja porque le tira un mensaje [ESTE PEDIDO YA TIENE SUS ÓRDENES GENERADAS].
   Necesito que el botón de corregir sí funcione."

   LO QUE DESTAPÓ: el candado v927 de openOrdenCompra ("un pedido con órdenes generadas no
   genera más") NUNCA tuvo la exención para el flujo de EDICIÓN. _ocEditarBorrador (v1001)
   setea _ocEditandoId y llama openOrdenCompra... que rechaza SIEMPRE, porque el pedido siempre
   tiene la orden que estás editando. Verificado en git: el candado es de v927, la edición de
   v1001, y la exención no existe en ninguna versión. El botón EDITAR de las bandejas de bodega
   estuvo roto desde entonces; v1143 solo lo puso a la vista con CORREGIR en la fila.

   ARREGLO EN DOS PARTES:
   1. EXENCIÓN en los DOS candados (openOrdenCompra y el re-check de generarOrdenCompra tras el
      await): si _ocEditandoId apunta a una orden DE ESTE pedido, se deja pasar — el barrido
      v1001 reemplaza las versiones viejas al generar, así que no se duplica nada. La exención
      exige que la orden editada pertenezca al pedido: un _ocEditandoId huérfano (quedó de otra
      pantalla) NO abre el candado.
   2. El BARRIDO de reemplazo también quita las DEVUELTAS: solo quitaba PENDIENTES, y al
      corregir una devuelta la versión vieja quedaría duplicada junto a la nueva. Aplica a los
      dos bucles (el del contenedor del pedido y el de los DPP en los tres contenedores). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— la exención del candado, en los DOS lados —');
const zO = ex(code, 'async function openOrdenCompra(');
ok('openOrdenCompra exime la edición', /_ocEditandoId/.test(zO));
ok('la exención exige que la orden editada sea DE ESTE pedido',
  /_ocEditandoId && existingOcs\.some\(o => o && o\.id === window\._ocEditandoId\)/.test(zO));
ok('sin edición, el candado v927 sigue cerrando',
  /existingOcs\.length > 0 && !_editando/.test(zO));

const zG = ex(code, 'async function generarOrdenCompra(');
ok('el re-check tras el await tiene la MISMA exención (v769/v940: una capa sola ya falló)',
  /_ocEditandoId[\s\S]{0,220}YA TIENE SUS ÓRDENES GENERADAS/.test(zG));

console.log('\n— el barrido de reemplazo también quita las DEVUELTAS —');
/* el barrido vive dentro de generarOrdenCompra; la condición vieja dejaba viva la DEVUELTA */
const _stB = (zG.match(/_stB !== 'PENDIENTE_AUTORIZACION' && _stB !== 'DEVUELTA'/g) || []).length;
ok('los dos bucles del barrido aceptan DEVUELTA', _stB >= 2);
ok('las AUTORIZADAS siguen intocables (nunca se barren)',
  !/'AUTORIZADA'\) continue;[\s\S]{0,60}splice/.test(zG.replace(/_stB !== 'PENDIENTE_AUTORIZACION' && _stB !== 'DEVUELTA'/g, 'X')));
ok('el tombstone sigue escribiéndose al barrer (v972)', /ordenesEliminadas\[o\.id\] = Date\.now\(\)/.test(zG));

console.log('\n— lo que no cambia —');
ok('el candado sigue existiendo para el camino directo', /YA TIENE SUS ÓRDENES GENERADAS/.test(zO));
ok('el reemplazo sigue ocurriendo DESPUÉS de crear las nuevas',
  zG.indexOf('created.push(oc)') < zG.indexOf('_ocEditandoId && created.length'));
ok('_ocEditandoId se limpia al terminar', /window\._ocEditandoId = ''/.test(zG));
ok('la validación de hermanas AUTORIZADAS sigue en el editor',
  /OTRA ORDEN AUTORIZADA/.test(ex(code, 'window._ocEditarBorrador = async function(')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
