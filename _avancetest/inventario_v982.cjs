/* v982 (pedidos de Antonio 26-jul, inventario):
   1. El datalist nativo de la toma desplegaba un listado gigante y feo — ahora hay un
      panel de sugerencias MINIMALISTA (compacto, filtrado, máx 30, scroll).
   2. Al elegir/escribir el material se auto-detecta la UNIDAD (_invUnidadDe: unidad
      derivada del nombre, patrón v969).
   3. El reporte de una toma cerrada incluye P.U. y VALOR por material + TOTAL EN
      DINERO por ubicación y general (precios del catálogo de proveedores, fórmula de
      la receta qty/rend×precio). El dinero se gata con receta.verPrecios|admin. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. picker minimalista ──
ok('el input de la toma ya NO usa datalist', !/list="invCatalogo"/.test(html));
ok('panel de sugerencias compacto', /invSugPanel/.test(html) && /_invSugerir\(/.test(html));
ok('máximo 30 sugerencias (no listado gigante)', /out\.length < 30/.test(ex('function _invSugerir(')));

// ── 2. unidad automática ──
const zU = ex('function _invUnidadDe(');
ok('_invUnidadDe existe', !!zU);
let fU = null;
try { fU = new Function('_bodegaUnidadDelNombre', '_bodegaUFmt', 'return (' + zU + ')'); } catch(e){}
if (fU) {
  const f = fU(n => (/GALON/.test(String(n).toUpperCase()) ? 'GALÓN' : 'UND'), u => u);
  ok('deriva la unidad del nombre', f('RESINA DM-21 GALON') === 'GALÓN');
  ok('sin pista → UND', f('CLAVO CON ROLDANA 1"') === 'UND');
} else ok('_invUnidadDe evaluable', false);
ok('elegir sugerencia auto-llena la unidad', /_invUnidadDe\(/.test(ex('window._invSugPick = function')));

// ── 3. reporte con precios y total en dinero ──
const zH = ex('function _invHistDetalle(');
ok('el detalle calcula P.U. con el catálogo (fórmula de la receta)', /precioDeProductoReceta\(/.test(zH) && /rendimiento/.test(zH));
ok('columnas P.U. y VALOR + total por ubicación', /P\.U\./.test(zH) && /VALOR/.test(zH));
ok('resumen: VALOR TOTAL DEL INVENTARIO', /VALOR TOTAL DEL INVENTARIO/.test(zH));
ok('el dinero se gata con receta.verPrecios|admin', /receta\.verPrecios/.test(zH));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
