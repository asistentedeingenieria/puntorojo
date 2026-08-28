/* v1311 · CASO BOLSA BODEGA-16 (Antonio, 28-ago): en GENERAR OC la "BOLSA PARA BASURA
   EXTRA GRANDE" salía asignada al pseudo-proveedor "SIN PROVEEDOR FIJO / REFERENCIA" a
   Q25 (difuso, de un Excel viejo) en vez de a OPERADORA DE TIENDAS a Q35 (match EXACTO),
   y el candado v1249 (que exige exacto) no la reconocía: rótulo ASIGNADO POR CATÁLOGO +
   precio editable + "SIN PRECIO EN CATÁLOGO" a la vez.
   CAUSA: findBestProviderForItem metía exactos y difusos en UNA bolsa ordenada solo por
   precio — la referencia difusa barata le ganaba al producto exacto del proveedor real.
   FIX: EXACTO gana a DIFUSO; el pseudo-proveedor REF va al FINAL (solo gana si ningún
   proveedor real tiene el producto); entre iguales sigue ganando el más barato (v989). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const xtract = re => { const m = html.match(re); return m ? m[0] : null; };
const sNorm = xtract(/function normOcName\(txt\)\{[\s\S]*?\n\}/);
const sCat  = xtract(/function findCatalogProductForProvider\(itemName, proveedor\)\{[\s\S]*?\n\}/);
const sBest = xtract(/function findBestProviderForItem\(itemName\)\{[\s\S]*?\n\}/);
ok('funciones extraídas', !!sNorm && !!sCat && !!sBest);

if (sNorm && sCat && sBest) {
  const mk = provs => new Function('activeProj','_getProveedores','_matNombreCanonico',
    sNorm + '\n' + sCat + '\n' + sBest + '\n return findBestProviderForItem;')(
    () => ({}), () => provs, () => '');
  const OPERA = { id: 'pv-op', nombre: 'OPERADORA DE TIENDAS, S.A.', productos: [
    { nombre: 'ESCOBA MARCA LEONCITO', precio: 20 },
    { nombre: 'BOLSA PARA BASURA EXTRA GRANDE', precio: 35 } ] };
  const REF = { id: 'pv-ref', nombre: 'SIN PROVEEDOR FIJO / REFERENCIA', productos: [
    { nombre: 'BOLSA PARA BASURA', precio: 25 } ] };
  const OTRO = { id: 'pv-ot', nombre: 'DISTRIBUIDORA X', productos: [
    { nombre: 'BOLSA PARA BASURA EXTRA GRANDE', precio: 40 } ] };

  /* el caso del bug: exacto Q35 (real) debe ganarle al difuso Q25 (REF) */
  const b1 = mk([REF, OPERA])('BOLSA PARA BASURA EXTRA GRANDE');
  ok('EXACTO del proveedor real gana al DIFUSO barato de REF', b1 && b1.proveedor.id === 'pv-op' && b1.precio === 35);

  /* entre dos EXACTOS reales sigue ganando el más barato (v989 intacto) */
  const b2 = mk([OTRO, OPERA])('BOLSA PARA BASURA EXTRA GRANDE');
  ok('entre exactos reales gana el más barato', b2 && b2.proveedor.id === 'pv-op' && b2.precio === 35);

  /* REF con nombre EXACTO igual pierde contra un real exacto más caro */
  const REFX = { id: 'pv-ref', nombre: 'SIN PROVEEDOR FIJO / REFERENCIA', productos: [
    { nombre: 'BOLSA PARA BASURA EXTRA GRANDE', precio: 25 } ] };
  const b3 = mk([REFX, OTRO])('BOLSA PARA BASURA EXTRA GRANDE');
  ok('el proveedor real le gana a REF aunque REF sea más barato', b3 && b3.proveedor.id === 'pv-ot');

  /* si SOLO REF lo tiene, REF sigue sirviendo (precio de referencia) */
  const b4 = mk([REF])('BOLSA PARA BASURA EXTRA GRANDE');
  ok('REF queda como último recurso', b4 && b4.proveedor.id === 'pv-ref' && b4.precio === 25);

  /* difusos entre reales: gana el más barato (comportamiento previo intacto) */
  const F1 = { id: 'a', nombre: 'FERRETERIA A', productos: [{ nombre: 'BOLSA PARA BASURA', precio: 30 }] };
  const F2 = { id: 'b', nombre: 'FERRETERIA B', productos: [{ nombre: 'BOLSA PARA BASURA', precio: 28 }] };
  const b5 = mk([F1, F2])('BOLSA PARA BASURA EXTRA GRANDE');
  ok('entre difusos reales gana el más barato', b5 && b5.proveedor.id === 'b' && b5.precio === 28);

  /* sin coincidencias: null */
  ok('sin match devuelve null', mk([OPERA])('CEMENTO GRIS') === null);
} else { fail += 6; }

/* el fix vive en el archivo (orden exacto>ref>precio) */
ok('sort por exacto, luego no-REF, luego precio', /b\._exacto - a\._exacto\) \|\| \(a\._ref - b\._ref\) \|\| \(a\.precio - b\.precio\)/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
