/* v1146 — EL MODAL DE SOLICITUDES DE PRECIO SE ABRÍA ENTERRADO BAJO EL CATÁLOGO

   Antonio (5-ago, con captura del catálogo abierto desde COMPRAS · TODA LA EMPRESA):
   "Cuando le doy en solicitudes de precio para ver no me deja y NO me sale nada."

   CAUSA RAÍZ (no era el permiso ni el render): desde v1062 el catálogo, abierto desde la
   pestaña de COMPRAS, lleva z-index INLINE 99000 para quedar encima del panel (98000).
   _abrirSolicitudesPrecio solo hacía classList.add('show') — y el CSS base de .modal-bg es
   z-index 100. El modal SÍ se abría: 98.900 capas por debajo del catálogo.

   El agujero ya había mordido EN ESTE MISMO CATÁLOGO: openAddProveedorFromCatalog llama
   _bringModalFront (mira todos los .modal-bg.show visibles, toma el z máximo y pone max+10)
   precisamente porque su modal quedaba enterrado. LIMPIAR CATÁLOGO no lo sufre porque crea
   su propio elemento con z propio. Solicitudes era el único que abría el .modal-bg estático
   a pelo.

   FIX: _abrirSolicitudesPrecio llama _bringModalFront tras el add('show') — mismo patrón
   que el modal de proveedor. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— el fix: solicitudes sube al frente —');
const zA = ex(code, 'function _abrirSolicitudesPrecio(');
ok('existe _abrirSolicitudesPrecio', !!zA);
ok('abre el modal', /classList\.add\('show'\)/.test(zA));
ok('y lo TRAE AL FRENTE (el catálogo vive a 99000 desde v1062)', /_bringModalFront\(/.test(zA));
ok('el frente se toma DESPUÉS de mostrar (el helper solo mira .modal-bg.show)',
  zA.indexOf("classList.add('show')") < zA.indexOf('_bringModalFront'));
ok('el gate de permiso sigue', /precios\.autorizar/.test(zA) && /users\.manage/.test(zA));

console.log('\n— _bringModalFront hace lo que promete (simulado) —');
const zB = ex(code, 'function _bringModalFront(');
ok('existe el helper', !!zB);
let bring = null;
try {
  bring = new Function('document', 'getComputedStyle', 'return (' + zB + ')');
} catch(e){}
ok('el helper evalúa', typeof bring === 'function');
if (bring) {
  /* el catálogo abierto desde COMPRAS: un .modal-bg.show a z 99000 */
  const catalogo = { style: { zIndex: '99000' } };
  const solicitudes = { style: { zIndex: '' } };
  const doc = { querySelectorAll: () => [catalogo, solicitudes].map(x => x) };
  const gcs = el => ({ zIndex: el.style.zIndex || '100' });
  const fn = bring(doc, gcs);
  fn(solicitudes);
  ok('con el catálogo a 99000, solicitudes queda ENCIMA (99010)', solicitudes.style.zIndex === '99010');
  const solo = { style: { zIndex: '' } };
  const fn2 = bring({ querySelectorAll: () => [] }, gcs);
  fn2(solo);
  ok('sin nada abierto queda apenas sobre la base (110)', solo.style.zIndex === '110');
}

console.log('\n— el contexto que causó esto no cambia —');
const zO = ex(code, 'function openCatalogoProveedores(');
ok('el catálogo desde COMPRAS sigue a 99000 (encima del panel, v1062)',
  /_bodegaPanelModal/.test(zO) && /99000/.test(zO));
ok('el modal de proveedor sigue con su arreglo (el precedente del patrón)',
  /_bringModalFront\(/.test(ex(code, 'function openAddProveedorFromCatalog(')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
