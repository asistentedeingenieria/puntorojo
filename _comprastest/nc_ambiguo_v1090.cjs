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
const zI = ex('function _internoKey(');
let f = null;
/* v1094: _ncDeCompra ahora casa el material con _internoKey (exacta, respeta el paréntesis).
   Se inyecta la implementación REAL — si se rompe, este test lo canta. */
try { f = new Function('CATALOGO_COMPRAS','_ocItemMemKey','_provsDelProducto', zI + '\nreturn (' + zN + ')'); } catch(e){}
ok('existe _ncDeCompra y es aislable', !!f && zN.length > 200);
ok('existe _internoKey (la clave que NO borra el paréntesis)', zI.length > 80);

if (f) {
  const key = s => String(s == null ? '' : s).toUpperCase().replace(/[”“]/g, '"').replace(/[’‘]/g, "'")
    .replace(/\(.*?\)/g, '')   /* ← el colapso REAL de normOcName: se come la marca */
    .replace(/\s+/g, ' ').trim();
  const CAT = [
    /* el orden es el de la app: la plancha USG está declarada ANTES que la DUBAI */
    { interno: 'PLANCHA ULTRALIGHT ½" X 4\' X 8\' (USG)', compras: ['TABLA ULTRALIGHT ½" X 4\' X 8\''] },
    { interno: 'PLANCHA ULTRALIGHT ½" X 4\' X 8\' (DUBAI NACIONAL)', compras: ['TABLA YESO LIGHT SAINTGOBAIN ½" X 4\' X 8\'', 'TABLAYESO 12.7mm X 1.22m X 2.4m'] },
    { interno: 'CLAVO CON ESCUADRA 1"', compras: ['CLAVO C/ESCUADRA 1"'] },
    { interno: 'MATERIAL RARO', compras: ['NO ESTA EN NINGUN LADO', 'TAMPOCO ESTA'] },
    { interno: 'IGUAL', compras: ['IGUAL'] }
  ];
  /* el catálogo real: PANEL PERFECTO tiene el TABLAYESO y SISTEGUA la TABLA ULTRALIGHT */
  const enCatalogo = { 'TABLAYESO 12.7MM X 1.22M X 2.4M': [{ id: 'pp', nombre: 'PANEL PERFECTO, S.A.', precio: 58 }],
                       'TABLA ULTRALIGHT ½" X 4\' X 8\'': [{ id: 'ss', nombre: 'SISTEGUA, S.A.', precio: 65 }],
                       'CLAVO C/ESCUADRA 1"': [{ id: 'x', nombre: 'OTRO', precio: 1 }] };
  const provs = n => enCatalogo[key(n)] || [];
  const nc = f(CAT, key, provs);

  console.log('\n— EL CASO DE ANTONIO —');
  /* v1094 — LA CAUSA RAÍZ (diagnóstico en vivo, 31-jul): _ocItemMemKey termina en normOcName,
     que BORRA todo lo que va entre paréntesis. Así '(DUBAI NACIONAL)' y '(USG)' colapsaban en
     la MISMA clave y la búsqueda del material se quedaba con la PRIMERA fila de la tabla — la
     del USG — que traduce a TABLA ULTRALIGHT (SISTEGUA, Q65). Por eso la orden salía al
     proveedor equivocado por más que se afinara el desempate entre variantes: la fila leída ya
     era la que no era. La app devolvía literalmente 'TABLA ULTRALIGHT ½" X 4' X 8''.
     El borrado de paréntesis NO se toca: es lo que hace casar el nombre de la receta con el del
     Excel del proveedor (que no trae la marca). Lo que cambia es que la TRADUCCIÓN casa el
     material de forma exacta con _internoKey, que sí respeta el paréntesis. */
  ok('la plancha DUBAI resuelve al nombre de PANEL PERFECTO (no agarra la fila del USG)',
    nc('PLANCHA ULTRALIGHT ½" X 4\' X 8\' (DUBAI NACIONAL)') === 'TABLAYESO 12.7mm X 1.22m X 2.4m');
  ok('y la plancha USG sigue resolviendo a LA SUYA',
    nc('PLANCHA ULTRALIGHT ½" X 4\' X 8\' (USG)') === 'TABLA ULTRALIGHT ½" X 4\' X 8\'');
  ok('dos materiales que solo se distinguen por el paréntesis NO se traducen igual',
    nc('PLANCHA ULTRALIGHT ½" X 4\' X 8\' (DUBAI NACIONAL)') !== nc('PLANCHA ULTRALIGHT ½" X 4\' X 8\' (USG)'));

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
  /* v1093 (lo que destapó el diagnóstico en vivo): con DOS variantes en el catálogo NO gana
     la primera declarada sino la MÁS BARATA — el mismo criterio con que la app elige
     proveedor. El caso real tenía el nombre caro (Q65) declarado antes que el barato (Q58). */
  const enCat2 = Object.assign({}, enCatalogo, { 'TABLA YESO LIGHT SAINTGOBAIN ½" X 4\' X 8\'': [{ id: 's', nombre: 'SISTEGUA', precio: 65 }] });
  ok('dos variantes en el catálogo: gana la MÁS BARATA, no la primera',
    f(CAT, key, n => enCat2[key(n)] || [])('PLANCHA ULTRALIGHT ½" X 4\' X 8\' (DUBAI NACIONAL)') === 'TABLAYESO 12.7mm X 1.22m X 2.4m');
  /* el caso EXACTO de la app: TRES nombres de compra, el caro declarado en medio */
  const CAT3 = [{ interno: 'PLANCHA X', compras: ['NO ESTA', 'CARO', 'BARATO'] }];
  const cat3 = { 'CARO': [{ id: 'c', nombre: 'CARO SA', precio: 65 }], 'BARATO': [{ id: 'b', nombre: 'BARATO SA', precio: 58 }] };
  ok('con tres variantes también gana la más barata',
    f(CAT3, key, n => cat3[key(n)] || [])('PLANCHA X') === 'BARATO');
  ok('un precio en 0 no se toma por "más barato"',
    f(CAT3, key, n => (key(n) === 'BARATO' ? [{ id: 'b', nombre: 'B', precio: 0 }] : cat3[key(n)] || []))('PLANCHA X') === 'CARO');
}

console.log('\n— la tabla de materiales quedó intacta —');
ok('el material DUBAI sigue con sus dos nombres de compra', /PLANCHA ULTRALIGHT[^}]*TABLAYESO 12\.7mm X 1\.22m X 2\.4m/.test(html));
/* la regla es que la LÓGICA no nombre a un material concreto; los comentarios sí documentan
   el caso real que la originó (v1094), así que se miran las líneas de código, no las notas */
const zNsinNotas = zN.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
ok('no se hardcodeó ningún material en la lógica', !/DUBAI|ULTRALIGHT|PANEL PERFECTO|SISTEGUA/.test(zNsinNotas));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
