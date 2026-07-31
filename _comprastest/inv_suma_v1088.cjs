/* v1088 — AGREGAR SUMA, no reemplaza (Antonio, 31-jul, con 3 fotos):
   "en la foto 1 puse 10 unidades. Después en la foto 2 pongo 20 unidades y cuando a esa
   segunda le doy agregar NO suma el producto".
   CAUSA RAÍZ: el botón AGREGAR llamaba _invUpsertLinea, que al encontrar el mismo material
   en la misma ubicación REEMPLAZABA la cantidad (10 → 20) en vez de sumarla (10 + 20 = 30).
   Contar un inventario es acumular: se cuenta una tarima, después otra, después otra.
   FIX: el camino del BOTÓN suma; el merge del sync sigue REEMPLAZANDO (ahí el conteo más
   nuevo debe ganar, no duplicarse — v1058). Para corregir un conteo mal digitado sigue
   estando el campo editable de la fila. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zU = ex('function _invUpsertLinea(');
let up = null;
try { up = new Function('_invNorm', 'return (' + zU + ')'); } catch(e){}
ok('existe _invUpsertLinea', !!up && zU.length > 200);
if (up) {
  const f = up(s => String(s == null ? '' : s).trim().toUpperCase());
  const base = [{ id: 'l1', locKey: 'BODEGA', material: 'ACABADO EXTRA FINO BLANCO LA ROCA', unidad: 'SACO', cantidad: 10, ts: 100 }];
  const nueva = { id: 'l2', locKey: 'BODEGA', material: 'ACABADO EXTRA FINO BLANCO LA ROCA', unidad: 'SACO', cantidad: 20, ts: 200 };

  console.log('\n— 1. EL CASO DE ANTONIO: 10 + 20 = 30 —');
  const sumado = f(base, nueva, true);
  ok('no crea una fila nueva', sumado.length === 1);
  ok('SUMA las cantidades: 10 + 20 = 30', sumado[0].cantidad === 30);
  ok('conserva la fila original (no la duplica)', sumado[0].id === 'l1');
  ok('actualiza el sello de tiempo', sumado[0].ts === 200);
  ok('no toca el array original', base[0].cantidad === 10);

  console.log('\n— 2. el sync sigue REEMPLAZANDO (o duplicaría en cada merge) —');
  const reemplazado = f(base, nueva);
  ok('sin pedir suma, el conteo nuevo manda', reemplazado[0].cantidad === 20);
  ok('idempotente: re-aplicar el mismo dato no lo infla', f(f(base, nueva), nueva)[0].cantidad === 20);

  console.log('\n— 3. bordes —');
  const otro = f(base, { id: 'l3', locKey: 'N02', material: 'ACABADO EXTRA FINO BLANCO LA ROCA', cantidad: 5 }, true);
  ok('otra UBICACIÓN es otra fila (no se mezclan niveles)', otro.length === 2);
  const otroMat = f(base, { id: 'l4', locKey: 'BODEGA', material: 'TABLAYESO', cantidad: 5 }, true);
  ok('otro MATERIAL es otra fila', otroMat.length === 2);
  ok('sumar sobre una lista vacía simplemente agrega', f([], nueva, true).length === 1 && f([], nueva, true)[0].cantidad === 20);
  ok('cantidad basura no rompe la suma', f(base, { locKey: 'BODEGA', material: 'ACABADO EXTRA FINO BLANCO LA ROCA', cantidad: undefined }, true)[0].cantidad === 10);
}

console.log('\n— 4. el botón AGREGAR pide la suma —');
const iA = html.indexOf('toma.lineas=_invUpsertLinea(toma.lineas, linea');
ok('el botón usa el modo suma', iA > -1 && /toma\.lineas=_invUpsertLinea\(toma\.lineas, linea, true\)/.test(html));
ok('el merge del sync NO lo usa', /lin = _invUpsertLinea\(lin, l\);/.test(html));
ok('el toast dice el total acumulado (para que se vea que sumó)', /TOTAL/.test(html.slice(iA, iA + 400)));

/* ── v1088 (2ª parte) — la hoja 1 arranca el inventario, sin hojas en blanco ── */
console.log('\n— 5. el salto de página depende del ALTO REAL de la tabla —');
const zS = ex('function _invSaltoTabla(');
let salto = null;
try { salto = new Function('return (' + zS + ')')(); } catch(e){}
ok('existe _invSaltoTabla y es pura', !!salto && zS.length > 150);
if (salto) {
  const ALTO = 700; // alto útil de una hoja A4 vertical, aprox
  ok('tabla CORTA salta junta (no deja el título huérfano)', salto(8, 8.5, 4, ALTO) === 'avoid');
  ok('tabla LARGA fluye (o dejaría la hoja anterior vacía)', salto(60, 8.5, 4, ALTO) === 'auto');
  ok('el caso de VDC: 40 materiales de bodega no caben → fluye', salto(40, 8.5, 4, ALTO) === 'auto');
  ok('sin datos no revienta', salto(0, 8, 3.5, ALTO) === 'avoid');
}
ok('las 3 tablas del PDF lo usan', (html.match(/pageBreak: _invSaltoTabla\(/g) || []).length === 3);
ok('ya no queda ningún salto fijo en el reporte', !/pageBreak: 'avoid', rowPageBreak/.test(ex('function _invReporteDoc(')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
