/* v1166 — GASTOS HISTÓRICOS IMPORTADOS EN SU PROPIO DOCUMENTO + auto-aligerado

   Antonio (10-ago): cargar 1.447 líneas de gasto de VICINIA DEL CARMEN... pero el
   documento de esa obra ya pesa 858 KB de 1024 y el Excel son 209 KB: NO CABE. Cargarlo
   dentro rompería el guardado para 50 personas.

   Y su pedido de fondo: "quiero que TU siempre solito estés pendiente y lo vayas
   corrigiendo, no que me avises."

   DISEÑO — el mismo patrón que la app ya usa 3 veces (receta v930, pagos congelados v931,
   asistencia v1148): lo pesado y estable vive FUERA del proyecto.
   · p.materiales.gastosImp[] (órdenes históricas) se sube a appState/gastosimp_<projId>
     y se QUITA del clon que va al doc del proyecto ⇒ el proyecto no crece ni un byte.
   · ORDEN SEGURO (regla v930/v931): el doc se CONFIRMA en la nube ANTES de quitarlo del
     clon; si falla, viaja embebido y no se pierde nada.
   · _assembleFromSnap lo re-une: en memoria la app siempre ve todo.
   · _gastosDeProyecto los SUMA como compra (son gasto real, ya facturado).
   · AUTO-ALIGERADO: _autoAligerarProyectos() corre al subir — si un proyecto pasa del 75%
     del límite, mueve sus gastos importados (y avisa en consola, sin molestar a nadie). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— la partición (patrón v930/v931) —');
const zS = ex(html, 'function _projSinGastosImp(');
ok('existe _projSinGastosImp', !!zS);
let sin = null;
try { sin = new Function('return (' + zS + ')')(); } catch(e){}
ok('evalúa', typeof sin === 'function');
if (sin) {
  const p = { id:'x', name:'OBRA', materiales:{ gastosImp:[{id:'g1',total:100}], ordenes:[{id:'o1'}] } };
  const c = sin(p);
  ok('saca gastosImp del clon', c.materiales && !c.materiales.gastosImp);
  ok('NO toca el original (pura)', Array.isArray(p.materiales.gastosImp) && p.materiales.gastosImp.length === 1);
  ok('conserva el resto del proyecto', c.materiales.ordenes && c.materiales.ordenes.length === 1 && c.name === 'OBRA');
  ok('sin gastos importados devuelve el mismo objeto', sin({ id:'y', materiales:{} }).id === 'y');
}

console.log('\n— la subida: confirmar ANTES de quitar —');
ok('escribe el doc gastosimp_<id>', /doc\('gastosimp_' \+/.test(code));
ok('el proyecto sube SIN los importados solo si el doc se confirmó', /_projSinGastosImp\(/.test(code) && /_gastosImpHashes/.test(code));
ok('si el doc falla, viajan embebidos (continue)', /gastosimp[\s\S]{0,400}continue/.test(code));
ok('hash para no reescribir lo mismo', /_gastosImpHashes\[/.test(code));
ok('borra el doc si ya no hay importados', /doc\('gastosimp_' \+ [^)]*\)\.delete\(\)/.test(code));

console.log('\n— el re-ensamblado —');
ok('_assembleFromSnap lee gastosimp_', /gastosimp_'\) === 0|indexOf\('gastosimp_'\)/.test(code));
ok('los re-adjunta al proyecto en memoria', /gastosImpById/.test(code));

console.log('\n— el gasto los suma —');
const zG = ex(code, 'function _gastosDeProyecto(');
ok('_gastosDeProyecto suma los importados', /gastosImp/.test(zG));
ok('con su propio rótulo (se distinguen de las OC vivas)', /IMPORTAD|HIST[ÓO]RIC/i.test(zG));

console.log('\n— el auto-aligerado (sin molestar a nadie) —');
const zA = ex(code, 'function _autoAligerarProyectos(');
ok('existe y corre en la subida', !!zA && /_autoAligerarProyectos\(/.test(code));
ok('umbral del 75% (avisa con meses de anticipación, no horas)', /0\.75|75/.test(zA));
ok('deja rastro en consola, no un toast que interrumpa', /console\./.test(zA) && !/showToast/.test(zA));

console.log('\n— el importador del Excel —');
const zI = ex(code, 'window._importarGastosVEC = async function');
ok('existe el importador', zI.length > 400);
ok('SOLO admin', /users\.manage/.test(zI));
ok('saltea las que ya existen por # OC o factura', /factura/.test(zI) && /numero/.test(zI));
ok('informa cuántas cargó y cuántas salteó', /salt|omit/i.test(zI));
ok('mide el peso ANTES de escribir y aborta si no cabe', /1024|1000000|_pesoProj/.test(zI));

console.log('\n— lo que no cambia —');
ok('la receta y los pagos congelados siguen particionados', /_projSinReceta/.test(code) && /_projSinPagosCongelados/.test(code));
ok('APP_SYNC_VERSION subió a 931 o más', (Number((html.match(/APP_SYNC_VERSION = (\d+)/) || [])[1]) || 0) >= 931);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
