/* v1180 — CÓDIGO ÚNICO DE OBRA EN TODOS LOS DOCUMENTOS (OC1 - 000017)

   Pedido de Antonio (11-ago), con las TRES decisiones preguntadas y respondidas:
   · Mapa fijo: ESSENZA FASE 2=1 · VICINIA DEL CARMEN=2 · TORELO=3 · VICINIA LAS AMÉRICAS=4 ·
     LAS CUMBRES - JADE=5 · LOS ARCOS=6 · los VARIOS nuevos toman el siguiente libre y se lo
     quedan PARA SIEMPRE (ningún código se repite jamás).
   · Formato CON ceros a 6 dígitos: "OC1 - 000017" (revierte v992 a sabiendas — se le señaló
     la contradicción y eligió los ceros).
   · Se renumeran TODAS, incluidas las ya enviadas a proveedores, y las CINCO series llevan el
     código: OC, DESP, OP, DPP y TRAS ("DPP1 - 000001 en este caso seria de essenza").

   ARQUITECTURA — DERIVADO, NO MIGRADO. El número guardado no se toca: el formato nuevo se
   calcula al MOSTRAR (en _numLimpio, el embudo por el que pasan todas las tarjetas, botones,
   toasts e impresos). Así "todas las ya generadas" aparecen con el formato nuevo en toda la
   app SIN reescribir un solo vínculo: las facturas, pedidos, despachos y trasiegos siguen
   apuntando a su orden intactos. Esta app ya pagó cuatro incidentes por mutar datos que otros
   consumen; un derivado es reversible, una migración no.

   El registro de códigos de VARIOS (state.obraCodigos) viaja por la nube con un merge PURO:
   gana el MENOR por nombre (el primero que asignó) y las colisiones se resuelven de forma
   determinista — idempotente y conmutativo, porque un merge que no converge ya provocó dos
   incidentes acá. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const srcN = ex(code, 'function _obraCodigoNorm(');
const srcD = ex(code, 'function _obraCodigoDe(');
const srcF = ex(code, 'function _docNumNuevo(');
const srcM = ex(code, 'function _mergeObraCodigos(');
const srcA = ex(code, 'function _obraCodigoAsegurar(');
ok('existen las cinco piezas', !!srcN && !!srcD && !!srcF && !!srcM && !!srcA);
if (!srcN || !srcD || !srcF || !srcM) { console.log('PASS='+pass+' FAIL='+fail); process.exit(1); }
const fijos = (code.match(/var OBRA_CODIGOS_FIJOS = \{[\s\S]*?\};/) || [''])[0];
const F = new Function(fijos + '\n' + srcN + '\n' + srcD + '\n' + srcF + '\n' + srcM
  + '\nreturn { norm:_obraCodigoNorm, de:_obraCodigoDe, fmt:_docNumNuevo, mg:_mergeObraCodigos };')();

console.log('— el mapa fijo de Antonio, con acentos y FASE↔F —');
ok('ESSENZA FASE 2 = 1 (y su prefijo ESSENZA F2)', F.de('ESSENZA FASE 2', {}) === 1 && F.de('ESSENZA F2', {}) === 1);
ok('VICINIA DEL CARMEN = 2', F.de('VICINIA DEL CARMEN', {}) === 2);
ok('TORELO = 3', F.de('TORELO', {}) === 3);
ok('VICINIA LAS AMÉRICAS = 4 (con y sin acento)', F.de('VICINIA LAS AMÉRICAS', {}) === 4 && F.de('VICINIA LAS AMERICAS', {}) === 4);
ok('LAS CUMBRES - JADE = 5 (y la variante LA CUMBRES del dashboard)', F.de('LAS CUMBRES - JADE', {}) === 5 && F.de('LA CUMBRES - JADE', {}) === 5);
ok('LOS ARCOS = 6', F.de('LOS ARCOS', {}) === 6);
ok('un varios nuevo lee del registro', F.de('TIFFANY', { 'TIFFANY': 7 }) === 7);
ok('desconocido sin registro = 0 (sin código, no se inventa)', F.de('CASA X', {}) === 0);

console.log('\n— EL FORMATO (los ejemplos textuales de Antonio) —');
ok('la orden 17 de essenza: OC1 - 000017', F.fmt('ESSENZA F2 – 13 - OC 17') === 'OC1 - 000017');
ok('DPP1 - 000001 para essenza', F.fmt('ESSENZA F2 – 4 - DPP 1') === 'DPP1 - 000001');
ok('VLA con acento: OC4 - 000009', F.fmt('VICINIA LAS AMÉRICAS – 17 - OC 9') === 'OC4 - 000009');
ok('LOS ARCOS: OC6 - 000001', F.fmt('LOS ARCOS – 1 - OC 1') === 'OC6 - 000001');
ok('los ceros viejos del folio no estorban', F.fmt('TORELO – 2 - OC 00004') === 'OC3 - 000004');
ok('DESP y OP y TRAS también llevan código', /^DESP3 - 000002$/.test(F.fmt('TORELO – 1 - DESP 2')) && /^OP1 - 000005$/.test(F.fmt('ESSENZA F2 – 9 - OP 5')) && /^TRAS2 - 000001$/.test(F.fmt('VICINIA DEL CARMEN – 3 - TRAS 1')));

console.log('\n— lo que NO se toca —');
ok('un número de PEDIDO queda igual (solo los documentos llevan código)', F.fmt('ESSENZA F2 – 13') === 'ESSENZA F2 – 13');
/* v1181: Antonio decidió que BODEGA CENTRAL también lleva código — se le dio el 7 (el
   siguiente libre; 1-6 son las obras) y los VARIOS nuevos siguen en 8+. */
ok('BODEGA CENTRAL = OC7 (v1181)', F.fmt('BODEGA – 9 - OC 9') === 'OC7 - 000009');
const srcS = ex(code, 'function _serieFolioCorto(');
ok('existe _serieFolioCorto (la etiqueta corta de los botones)', !!srcS);
if (srcS) {
  const corto = new Function(srcS + '\nreturn _serieFolioCorto;')();
  ok('el botón dice "OC 10", del numero CRUDO', corto('BODEGA – 9 - OC 00010') === 'OC 10');
  ok('también para las otras series', corto('ESSENZA F2 – 4 - DPP 1') === 'DPP 1');
  ok('sin serie devuelve el numero tal cual', corto('ESSENZA F2 – 13') === 'ESSENZA F2 – 13');
}
ok('los botones cortos usan la etiqueta corta (ya no .pop() del formateado)',
  (code.match(/_serieFolioCorto\(o\.numero\)/g) || []).length >= 2);
ok('los PEDIDOS se muestran con la SIGLA de la obra (VLA – 19)', /_obraSigla\(/.test(ex(code, 'function _numLimpio(')));
ok('el No. GRANDE del impreso lleva el formato nuevo', /_docNumNuevo\(oc\.numero\)/.test(code));
ok('un prefijo desconocido queda igual (no se inventa código)', F.fmt('CASA X – 1 - OC 2') === 'CASA X – 1 - OC 2');
ok('basura y vacío pasan sin romper', F.fmt('') === '' && F.fmt(null) === '' && F.fmt('cualquier cosa') === 'cualquier cosa');

console.log('\n— el merge del registro: converge sí o sí —');
ok('une nombres distintos', (() => { const r = F.mg({A:7},{B:8}); return r.A === 7 && r.B === 8; })());
ok('mismo nombre: gana el MENOR (el primero que asignó)', F.mg({X:9},{X:7}).X === 7);
ok('COLISIÓN (dos obras nuevas offline con el mismo código): se resuelve determinista y sin repetir', (() => {
  const r = F.mg({X:7},{Y:7}); const v = Object.keys(r).map(k=>r[k]);
  return v.length === 2 && v[0] !== v[1];
})());
ok('IDEMPOTENTE: re-aplicar no cambia nada', (() => {
  const una = F.mg({X:7},{Y:7}); return JSON.stringify(F.mg(una,{Y:7})) === JSON.stringify(una);
})());
ok('CONMUTATIVO: el orden de llegada no importa', JSON.stringify(F.mg({X:7,B:9},{Y:7})) === JSON.stringify(F.mg({Y:7},{X:7,B:9})));
ok('ignora basura', (() => { try { const r = F.mg(null,{A:'x',B:2}); return r.B === 2 && !('A' in r); } catch(e){ return false; } })());

console.log('\n— enganchado en la app —');
const numL = ex(code, 'function _numLimpio(');
ok('_numLimpio deriva el formato nuevo (el embudo de TODA la app)', /_docNumNuevo\(/.test(numL));
ok('la asignación corre al crear un pedido MANUAL', /_obraCodigoAsegurar\(/.test(ex(code, 'async function submitPedido(')));
ok('el registro se une en applyRemote', /_mergeObraCodigos\(/.test(code) && /merged\.obraCodigos/.test(code));
ok('la asignación nunca baja el máximo (código nuevo = siguiente libre)', /max \+ 1|_sig/.test(srcA));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
