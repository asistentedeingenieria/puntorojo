/* v1090 — EL MATERIAL CON VARIOS NOMBRES DE COMPRA YA RESUELVE SOLO (Antonio, 31-jul):
   "quiero que automáticamente cuando se pida esa plancha (DUBAI) seleccione la de ese
   proveedor (PANEL PERFECTO) y la descripción del producto".
   CAUSA RAÍZ: en CATALOGO_COMPRAS ese material tiene DOS nombres de compra
   ('TABLA YESO LIGHT SAINTGOBAIN…' y 'TABLAYESO 12.7mm X 1.22m X 2.4m') y _ncDeCompra
   SOLO traducía cuando había EXACTAMENTE UNO (regla v968: ante la duda, no elegir). Con dos
   devolvía null, el material se quedaba con su nombre interno, no casaba con el catálogo de
   PANEL PERFECTO y la orden caía en otro proveedor.
   FIX: si hay varias variantes, gana la que SÍ existe en el catálogo de precios. Si ninguna
   está, sigue devolviendo null (no se inventa). Si hay varias en el catálogo, la primera
   declarada — el orden de la tabla es la preferencia. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zN = ex('function _ncDeCompra(');
let f = null;
try { f = new Function('CATALOGO_COMPRAS','_ocItemMemKey','_provsDelProducto', 'return (' + zN + ')'); } catch(e){}
ok('existe _ncDeCompra y es aislable', !!f && zN.length > 200);

if (f) {
  const key = s => String(s == null ? '' : s).toUpperCase().replace(/[”“]/g, '"').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
  const CAT = [
    { interno: 'PLANCHA ULTRALIGHT ½" X 4\' X 8\' (DUBAI NACIONAL)', compras: ['TABLA YESO LIGHT SAINTGOBAIN ½" X 4\' X 8\'', 'TABLAYESO 12.7mm X 1.22m X 2.4m'] },
    { interno: 'CLAVO CON ESCUADRA 1"', compras: ['CLAVO C/ESCUADRA 1"'] },
    { interno: 'MATERIAL RARO', compras: ['NO ESTA EN NINGUN LADO', 'TAMPOCO ESTA'] },
    { interno: 'IGUAL', compras: ['IGUAL'] }
  ];
  /* en el catálogo de precios SOLO existe el nombre de PANEL PERFECTO */
  const enCatalogo = { 'TABLAYESO 12.7MM X 1.22M X 2.4M': [{ id: 'pp', nombre: 'PANEL PERFECTO, S.A.', precio: 58 }],
                       'CLAVO C/ESCUADRA 1"': [{ id: 'x', nombre: 'OTRO', precio: 1 }] };
  const provs = n => enCatalogo[key(n)] || [];
  const nc = f(CAT, key, provs);

  console.log('\n— EL CASO DE ANTONIO —');
  ok('la plancha DUBAI resuelve al nombre que SÍ está en el catálogo',
    nc('PLANCHA ULTRALIGHT ½" X 4\' X 8\' (DUBAI NACIONAL)') === 'TABLAYESO 12.7mm X 1.22m X 2.4m');

  console.log('\n— lo que ya funcionaba, sigue igual —');
  ok('un solo nombre de compra: se traduce como siempre', nc('CLAVO CON ESCUADRA 1"') === 'CLAVO C/ESCUADRA 1"');
  ok('si el nombre de compra es igual al interno, no traduce', nc('IGUAL') === null);
  ok('material que no está en la tabla: null', nc('CUALQUIER OTRA COSA') === null);

  console.log('\n— bordes: no inventar —');
  ok('varias variantes y NINGUNA en el catálogo: null (no elige a ciegas)', nc('MATERIAL RARO') === null);
  const provsVacio = () => [];
  ok('sin catálogo cargado, el de una sola variante sigue funcionando',
    f(CAT, key, provsVacio)('CLAVO CON ESCUADRA 1"') === 'CLAVO C/ESCUADRA 1"');
  ok('sin catálogo cargado, el ambiguo devuelve null', f(CAT, key, provsVacio)('PLANCHA ULTRALIGHT ½" X 4\' X 8\' (DUBAI NACIONAL)') === null);
  ok('no revienta con nombre vacío', nc('') === null && nc(null) === null);
  /* si DOS variantes están en el catálogo, manda el orden de la tabla (la preferencia) */
  const enCat2 = Object.assign({}, enCatalogo, { 'TABLA YESO LIGHT SAINTGOBAIN ½" X 4\' X 8\'': [{ id: 's', nombre: 'SISTEGUA', precio: 65 }] });
  ok('dos variantes en el catálogo: gana la primera declarada',
    f(CAT, key, n => enCat2[key(n)] || [])('PLANCHA ULTRALIGHT ½" X 4\' X 8\' (DUBAI NACIONAL)') === 'TABLA YESO LIGHT SAINTGOBAIN ½" X 4\' X 8\'');
}

console.log('\n— la tabla de materiales quedó intacta —');
ok('el material DUBAI sigue con sus dos nombres de compra', /PLANCHA ULTRALIGHT[^}]*TABLAYESO 12\.7mm X 1\.22m X 2\.4m/.test(html));
ok('no se hardcodeó DUBAI en la lógica', !/DUBAI/.test(zN));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
