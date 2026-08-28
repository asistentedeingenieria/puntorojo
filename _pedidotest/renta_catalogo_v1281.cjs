/* v1281 · ORDEN DE RENTA — FASE A (Antonio, 24-ago: "los andamios, rodos, camas los
   ALQUILAMOS — en vez de ORDEN DE COMPRA debe generar una ORDEN DE RENTA con cuánto
   tiempo y a qué costo"). Decisiones (preguntadas): se marca EN EL CATÁLOGO; costo =
   tarifa × tiempo (periodo DÍA/SEMANA/MES por producto); con control de devolución.
   FASE A: (1) el producto del catálogo se marca SE RENTA con su periodo (chip que
   cicla COMPRA → RENTA·DÍA → RENTA·SEM → RENTA·MES, solo admin/autorizador, sellado
   union-merge v1070); (2) la serie RENTA queda registrada en TODA la maquinaria de
   series (_ocSerieDe por flag esRenta, folio corto, formato con código de obra
   v1180, pestaña de filtro v1204). FASE B: generación de la orden. FASE C: lista con
   VENCE EL + DEVUELTO e impresión. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* ── 1. chip SE RENTA en el catálogo ── */
const zRow = ex('function renderCatProvProductos(');
ok('la fila del producto lleva el chip de renta', /_catProdRentaCiclo\(/.test(zRow) && /RENTA/.test(zRow));
const zCiclo = ex('window._catProdRentaCiclo = function');
ok('_catProdRentaCiclo existe con el gate de autorizador', /precios\.autorizar/.test(zCiclo) || /users\.manage/.test(zCiclo));
ok('cicla COMPRA → DÍA → SEMANA → MES y SELLA (union-merge v1070)', /DIA/.test(zCiclo) && /SEMANA/.test(zCiclo) && /MES/.test(zCiclo) && /_ts = Date\.now\(\)/.test(zCiclo));
ok('el encabezado del catálogo tiene la columna RENTA', /<div>RENTA<\/div>/.test(html));
/* v1306 re-ancló los anchos (descripción gana espacio); la intención de v1281 es que el
   grid tenga SEIS columnas (con RENTA), no valores exactos */
ok('las columnas del grid crecieron (fila y encabezado, 6 columnas)', /minmax\(0,1fr\) 64px 106px 106px 78px 32px/.test(html));

/* ── 2. helper puro ── */
const zInfo = ex('function _prodRentaInfo(');
let f = null; try { f = new Function(zInfo + '; return _prodRentaInfo;')(); } catch(e){}
ok('_prodRentaInfo evalúa', typeof f === 'function');
if (f) {
  ok('producto sin marca → no renta', f({ nombre: 'PLANCHA' }).renta === false);
  ok('producto marcado → renta con periodo', f({ nombre: 'ANDAMIO', renta: true, rentaPeriodo: 'DIA' }).renta === true && f({ renta: true, rentaPeriodo: 'DIA' }).periodo === 'DIA');
  ok('marcado sin periodo → DIA por defecto', f({ renta: true }).periodo === 'DIA');
  ok('etiqueta del periodo', f({ renta: true, rentaPeriodo: 'SEMANA' }).etiqueta === 'SEMANA' && f({ renta: true, rentaPeriodo: 'MES' }).etiqueta === 'MES');
}

/* ── 3. la serie RENTA registrada en toda la maquinaria ── */
const zSerie = ex('function _ocSerieDe(');
ok('_ocSerieDe: esRenta → RENTA', /esRenta/.test(zSerie) && /'RENTA'/.test(zSerie));
ok('folio corto reconoce RENTA', /\(RENTA\|OC\|DESP\|OP\|DPP\|TRAS\)/.test(html));
const _mRegex = (html.match(/\(RENTA\|OC\|DESP\|OP\|DPP\|TRAS\)/g) || []).length;
ok('las DOS puntas del formato (folio corto + código de obra) la reconocen', _mRegex >= 2);
ok('la pestaña de filtro por serie ofrece RENTA', /\['OC','DESP','OP','DPP','TRAS','RENTA'\]/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
