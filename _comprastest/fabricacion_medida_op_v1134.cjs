/* v1134 — CIERRE DE v1133: la FABRICACIÓN A MEDIDA también es orden de producción

   v1133 hizo que los postes a medida salgan en su propia orden de producción, agrupando por
   proveedor + tipo. Pero una auditoría del circuito encontró que la regla que Antonio pidió
   ("SIEMPRE que sea a medida") quedaba a medias: la marca `aMedida` se pone SOLO cuando el
   nombre trae el sufijo "(MEDIDA ESPECIAL n m)":

       21482:  const _mts = _ocMedidaEspecialMetros(it.name);
               if (_mts != null) it.aMedida = true;

   Y los materiales de METAL A MEDIDA (pd.metalMedida) se llaman de otra forma:

       21398:  `${m.tipo} ${m.medida}${m.calibre} — FABRICACIÓN A MEDIDA (torre · nivel)`

   Sin ese sufijo nunca recibían la marca, así que —aun con v1133— seguían saliendo dentro de
   la orden de compra. Y son, literalmente, material que se manda a fabricar: el caso más claro
   de orden de producción que hay en la app.

   El item YA nace con `isMetalMedida:true` (21399), o sea el dato estaba; solo faltaba usarlo.

   LO QUE NO SE TOCA — la precedencia de BODEGA. Un material a medida que ya está en existencias
   se asigna al proveedor sintético '_bodega' y sale como DESPACHO, no como producción. Es
   correcto: no se manda a fabricar lo que ya se tiene. v1133 lo preserva porque '_bodega' sale
   temprano de la clave de agrupación, y este test lo fija para que nadie lo rompa después. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— la marca cubre las DOS formas de "a medida" —');
const zA = ex(code, 'function autoAssignOcProviders(');
ok('el poste con medida especial se sigue marcando', /_ocMedidaEspecialMetros\(it\.name\)/.test(zA));
ok('y ahora también la FABRICACIÓN A MEDIDA', /isMetalMedida/.test(zA));
ok('con una sola condición (una regla, no dos caminos)',
  /_mts != null \|\| it\.isMetalMedida/.test(zA) || /it\.isMetalMedida \|\| _mts != null/.test(zA));

console.log('\n— el item de fabricación ya traía el dato —');
const zB = ex(code, 'function buildPedidoOcItems(');
ok('nace con isMetalMedida', /isMetalMedida:true/.test(zB));
ok('y con su categoría propia', /METAL A MEDIDA/.test(zB));

console.log('\n— la precedencia de BODEGA se conserva —');
const zK = ex(code, 'function _ocGrupoKey(');
let K = null;
try { K = new Function('OC_NO_PROVIDER', zK + '\nreturn _ocGrupoKey;')('__SIN__'); } catch(e){}
if (K) {
  ok('lo que ya está en bodega NO se manda a fabricar',
    K({ proveedorId:'_bodega', aMedida:true }) === '_bodega');
  ok('el mismo material sin bodega sí va a producción',
    /OP/.test(K({ proveedorId:'sistegua', aMedida:true })));
}
ok('bodega gana en la asignación de proveedor', /_esItemBodega\(/.test(zA));

console.log('\n— el número que anuncia el modal ya no miente —');
/* antes prometía "OC N" mirando el texto de las observaciones; con la partición un mismo
   pedido puede emitir OC y OP a la vez */
const zO = ex(code, 'function openOrdenCompra(');
ok('el modal contempla que salga más de una serie', /_seriesPrevistas|VARIAS|OC \+ OP/.test(zO));
ok('ya no decide la serie por el texto de las observaciones',
  !/SOLO POSTES A MEDIDA/.test(zO));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
