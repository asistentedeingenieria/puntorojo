/* v1095 — CERRAR EL CÍRCULO DEL COLAPSO DE PARÉNTESIS (continuación de v1094).
   v1094 arregló _ncDeCompra (la traducción a nombre de compra), pero el mismo colapso vive en
   otros dos puntos del circuito de compras:

   (1) _variantesDeCompra — el picker de presentaciones de la OC. Con la plancha DUBAI encuentra
       la fila de la USG (que tiene UNA sola variante) y devuelve [], así que compras NUNCA ve
       las dos presentaciones de la DUBAI y no puede elegir. BUG VIVO.
   (2) _varianteRecordada / ocVariantePorItem — la memoria de "qué presentación se eligió la vez
       pasada". Con la clave colapsada, la preferencia guardada para la USG se le filtra a la
       DUBAI y viceversa: dos productos distintos compartiendo memoria.

   REGLA que sale de esto: hay DOS normalizadores y cada uno tiene su terreno.
     - normOcName / _ocItemMemKey = MATCH contra el Excel del proveedor → borrar el paréntesis
       es CORRECTO (el Excel no trae la marca).
     - _internoKey = IDENTIDAD del material del catálogo interno → el paréntesis es lo único que
       distingue la marca, y se conserva.
   Ninguno de los dos se toca: se cambia QUIÉN usa cuál. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zI = ex('function _internoKey(');
ok('_internoKey existe (la clave de IDENTIDAD, v1094)', zI.length > 80);

/* el memKey de prueba reproduce el colapso REAL de normOcName: se come el paréntesis */
const memKey = s => String(s == null ? '' : s).toUpperCase()
  .replace(/[”“]/g, '"').replace(/[’‘]/g, "'")
  .replace(/\(.*?\)/g, '')
  .replace(/\s+/g, ' ').trim();

/* el ORDEN es el de la app: la USG está declarada ANTES que la DUBAI */
const CAT = [
  { interno: 'PLANCHA ULTRALIGHT ½" X 4\' X 8\' (USG)', compras: ['TABLA ULTRALIGHT ½" X 4\' X 8\''] },
  { interno: 'PLANCHA ULTRALIGHT ½" X 4\' X 8\' (DUBAI NACIONAL)', compras: ['TABLA YESO LIGHT SAINTGOBAIN ½" X 4\' X 8\'', 'TABLAYESO 12.7mm X 1.22m X 2.4m'] },
  { interno: 'ANGULAR DE LAMINA 1" X 8\'', compras: ['ANGULAR 1" X 8\' (0.35)'] },
  { interno: 'PEGAMENTO', compras: ['PEGA A', 'PEGA B'] },
];

console.log('\n— 1. EL PICKER DE PRESENTACIONES (bug vivo) —');
const zV = ex('function _variantesDeCompra(');
let vd = null;
try { vd = new Function('CATALOGO_COMPRAS','_ocItemMemKey', zI + '\nreturn (' + zV + ')')(CAT, memKey); } catch(e){ console.log('   (no evaluable: '+e.message+')'); }
ok('_variantesDeCompra existe y es aislable', !!vd);
if (vd) {
  const dubai = vd('PLANCHA ULTRALIGHT ½" X 4\' X 8\' (DUBAI NACIONAL)');
  ok('la DUBAI ofrece SUS DOS presentaciones (antes: [] porque leía la fila de la USG)',
    Array.isArray(dubai) && dubai.length === 2 && dubai.indexOf('TABLAYESO 12.7mm X 1.22m X 2.4m') >= 0);
  ok('la USG sigue sin picker (tiene una sola presentación)',
    vd('PLANCHA ULTRALIGHT ½" X 4\' X 8\' (USG)').length === 0);
  /* el respaldo por clave colapsada NO se quita: los nombres de receta que vienen SIN el
     paréntesis de marca tienen que seguir pescando su fila */
  ok('un material sin paréntesis sigue encontrando su fila', vd('PEGAMENTO').length === 2);
  ok('material con una sola compra: sin picker', vd('ANGULAR DE LAMINA 1" X 8\'').length === 0);
  ok('material que no está en la tabla: lista vacía', vd('CUALQUIER OTRA COSA').length === 0);
  ok('no revienta con vacío/null', vd('').length === 0 && vd(null).length === 0);
}

console.log('\n— 2. LA MEMORIA DE LA PRESENTACIÓN ELEGIDA —');
const zR = ex('function _varianteRecordada(');
let vr = null;
try { vr = new Function('_ocItemMemKey', zI + '\nreturn (' + zR + ')')(memKey); } catch(e){ console.log('   (no evaluable: '+e.message+')'); }
ok('_varianteRecordada existe y es aislable', !!vr);
if (vr) {
  /* compras eligió una presentación para la USG; esa preferencia NO puede aplicarse a la DUBAI */
  const zIfn = new Function('return (' + zI + ')')();
  const p = { materiales: { ocVariantePorItem: { [zIfn('PLANCHA ULTRALIGHT ½" X 4\' X 8\' (USG)')]: 'TABLA ULTRALIGHT ½" X 4\' X 8\'' } } };
  ok('la preferencia guardada para la USG se respeta',
    vr(p, 'PLANCHA ULTRALIGHT ½" X 4\' X 8\' (USG)') === 'TABLA ULTRALIGHT ½" X 4\' X 8\'');
  ok('y NO se le filtra a la DUBAI (son productos distintos)',
    vr(p, 'PLANCHA ULTRALIGHT ½" X 4\' X 8\' (DUBAI NACIONAL)') === '');
  ok('sin memoria devuelve vacío y no truena',
    vr({}, 'X') === '' && vr(null, 'X') === '');
}

console.log('\n— 3. lo que NO se tocó —');
/* estos dos son el puente con el Excel del proveedor: si alguien les quita el borrado de
   paréntesis, se cae el match de postes, canales, angular y malla, Y el inventario histórico
   queda huérfano (bodegaMovs[].k está sellado con esa clave en cada movimiento guardado) */
ok('normOcName sigue borrando el paréntesis (es su trabajo)', /\\\(\.\*\?\\\)/.test(ex('function normOcName(')));
ok('_ocItemMemKey sigue terminando en normOcName', /return normOcName\(/.test(ex('function _ocItemMemKey(')));
ok('_ncDeCompra (v1094) no se re-tocó: sigue con su cascada', /_internoKey\(nombreInterno\)/.test(ex('function _ncDeCompra(')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
