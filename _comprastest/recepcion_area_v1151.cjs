/* v1151 (2/2) — COMPRAS NO RECIBE MATERIAL + la OC de bodega SIN renglón de Área

   1. Reporte de Susy (compras, por WhatsApp 6-ago): ella VE el botón YA RECIBÍ EL MATERIAL
      en los pedidos que solicitó — "Tal vez solo solicitar a Rony que marque de recibido".
      Antonio: "la persona de compras NO pueda ver lo que dice YA RECIBÍ EL MATERIAL".
      POR QUÉ lo veía: la regla v996 deja recibir al SOLICITANTE, y compras es quien
      solicita los pedidos de abasto. Pero la recepción es un acto DE LA OBRA (quien tiene
      el material enfrente), no de quien lo pidió desde la oficina.
      EL CORTE: quien tiene compras.autorizar (y no es admin) pierde el botón Y la acción —
      en el render de la lista y en el gate de advancePedido (las dos capas, regla v990:
      el permiso se evalúa en la frontera, no solo en el pintado). Rony entra por el camino
      de encargado de obra (user.obraAsignada), que sigue intacto.

   2. Antonio (6-ago, con la OC 7 de bodega impresa): "en las OC que son para bodega central
      quiero que elimines el renglon de area... Solo quiero que dejes bodega central como
      proyecto". El impreso decía Proyecto: BODEGA CENTRAL y Área: · BODEGA CENTRAL —
      redundante y con el separador huérfano. _ocAreaImpreso devuelve '' cuando el proyecto
      es BODEGA CENTRAL (y el renglón no se imprime, regla v1001). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— compras no ve el botón (el render) —');
/* el bloque del botón vive en el render de la lista de pedidos, cerca de _puedeRecibirEntrega */
const iBtn = code.indexOf('YA RECIBÍ EL MATERIAL');
const zBtn = code.slice(Math.max(0, iBtn - 2200), iBtn + 200);
ok('existe la exclusión de compras junto al botón', /_esSoloCompras/.test(zBtn));
ok('compras es quien autoriza OC pero NO admin', /compras\.autorizar[\s\S]{0,60}!can\('users\.manage'\)/.test(zBtn));
ok('la exclusión corta ANTES de los caminos que pintan el botón',
  /!_esSoloCompras && \(isOwner \|\| _puedeRec \|\| can\('users\.manage'\)\)/.test(zBtn));

console.log('\n— y tampoco puede ejecutar la acción (la frontera) —');
const zA = ex(code, 'async function advancePedido(');
ok('advancePedido tiene el mismo corte', /_esSoloCompras/.test(zA));
ok('solo aplica al paso de RECEPCIÓN (aprobar y avanzar siguen suyos)',
  /_esRecep && _esSoloCompras|_esSoloCompras && _esRecep/.test(zA));
ok('con aviso, no en silencio', /LA RECEPCIÓN LA MARCA LA OBRA|RECEPCIÓN ES DE LA OBRA/.test(zA));
ok('el encargado de obra sigue recibiendo (v996 intacto)', /_puedeRecibirEntrega\(/.test(zA));

console.log('\n— la OC de bodega central sin renglón de Área —');
const zAr = ex(html, 'function _ocAreaImpreso(');
ok('_ocAreaImpreso conoce la regla', /BODEGA CENTRAL/.test(zAr));
let area = null;
try {
  area = (label, oc) => new Function('_ocProyectoLabel', '_findPedidoGlobal', 'return (' + zAr + ')')(() => label, () => null)(oc);
} catch(e){}
ok('extraíble', typeof area === 'function');
if (area) {
  let r = null;
  try { r = area('BODEGA CENTRAL', { areaDestino: 'BODEGA CENTRAL', area: 'x' }); } catch(e){ r = 'ERR'; }
  ok('para BODEGA CENTRAL devuelve vacío (el renglón no se imprime)', r === '');
  try { r = area('VICINIA LAS AMÉRICAS', { areaDestino: 'TORRE 4 · NIVEL 12' }); } catch(e){ r = 'ERR'; }
  ok('las OC de obra siguen con su área', r === 'TORRE 4 · NIVEL 12');
}
ok('el renglón sigue condicionado a que haya área (v1001/v1141)', /_ocAreaImpreso\(oc\)[\s\S]{0,80}<dt>Área:<\/dt>/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
