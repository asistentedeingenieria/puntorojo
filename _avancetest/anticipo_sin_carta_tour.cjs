/* v872: (A) flujo de entrega de anticipos SIN carta firmada — el ÚNICO/último paso es subir la
   FACTURA; con factura subida, compras puede MARCAR ENTREGADO. Se quita el paso 2 (SUBIR CARTA)
   y los links CARTA: ver de las entregadas. (B) TOUR de bienvenida eliminado (sin auto-arranque
   ni botón en Ajustes). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── A) _antDocsListos: SOLO factura ──
const src = extractFn('_antDocsListos');
ok('_antDocsListos existe', !!src);
if (src) {
  const fn = new Function(src + '\nreturn _antDocsListos;')();
  ok('con factura → listo', fn({ facturaUrl:'x' }) === true);
  ok('sin factura → NO listo', fn({}) === false);
  ok('solo carta → NO listo (la carta ya no cuenta)', fn({ cartaUrl:'y' }) === false);
  ok('null no revienta', fn(null) === false);
}
// UI: sin paso de carta
ok('sin botón SUBIR CARTA', html.indexOf('>SUBIR CARTA</button>') < 0);
ok('sin PASO 2 · CARTA FIRMADA', html.indexOf('PASO 2 · CARTA FIRMADA') < 0);
ok('sin link CARTA: ver en entregadas', html.indexOf("_b.push('CARTA:") < 0);
/* v1115: el rótulo se volvió condicional — en un anticipo EN EFECTIVO no hay factura de
   proveedor, se pide el COMPROBANTE DE LA TRANSFERENCIA. El paso sigue siendo el último y
   sigue usando el mismo campo de archivo; lo único que cambia es qué se le pide a la persona. */
ok('el paso de factura/comprobante es el último',
  html.indexOf('ÚLTIMO PASO · ') >= 0
  && html.indexOf('FACTURA DEL PRODUCTO') >= 0
  && html.indexOf('COMPROBANTE DE LA TRANSFERENCIA') >= 0);
ok('MARCAR ENTREGADO sigue existiendo', html.indexOf('MARCAR ENTREGADO') >= 0);
ok('deshabilitado pide solo la factura', html.indexOf('SUBÍ LA FACTURA PARA HABILITAR') >= 0);
ok('toast pide solo factura', html.indexOf('FALTA LA FACTURA') >= 0 && html.indexOf('SUBÍ FACTURA Y CARTA FIRMADA') < 0);

// ── B) tour eliminado ──
ok('sin auto-arranque del tour (solo la definición dormida, cero llamadas)', (html.match(/_maybeStartTour/g)||[]).length === 1);
ok('sin botón VER TOUR DE BIENVENIDA en Ajustes', html.indexOf('VER TOUR DE BIENVENIDA') < 0);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
