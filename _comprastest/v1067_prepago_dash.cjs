/* v1067 — DOS DECISIONES DE ANTONIO SOBRE EL PRE-PAGO (30-jul, AskUserQuestion):
   A) El dinero prepagado SIN despachar aparece como fila BODEGA CENTRAL en el dashboard
      de GASTOS (antes era invisible: pagaste Q325,000 y GASTOS solo mostraba lo ya
      despachado). La fila baja sola con cada despacho — derivada, sin doble conteo (la
      OC madre con destino '' nunca cuenta; lo despachado entra por su despacho).
   B) El documento del DESPACHO PRE-PAGO lleva la fecha del DÍA del despacho (heredaba la
      de la OC madre). El trasiego también estampa su fecha. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— A. lo prepagado sin despachar, visible en GASTOS —');
const zP = ex('function _prepagoSinDespachar(');
ok('existe el derivador', zP.length > 400);
let fn = null;
try {
  const src = 'var _ocItemMemKey = function(s){ return String(s||"").toUpperCase(); };\n'
    + ex('function _ocEsPrepagoMadre(') + '\n' + ex('function _dppSaldoDeMadre(') + '\n' + zP;
  const mk = new Function('state', '_bodegaMatStore', src + '\nreturn _prepagoSinDespachar;');
  const madre = { id: 'm1', status: 'AUTORIZADA', formaPago: 'COMPRA ANTICIPADA',
    items: [{ name: 'TABLA', qty: 5000, precio: 65 }] };
  const dpp = { id: 'd1', refOcMadre: 'm1', status: 'AUTORIZADA', esDespacho: true, esPrepago: true,
    items: [{ name: 'TABLA', qty: 16 }] };
  const cont = { ordenes: [madre, dpp] };
  fn = mk({ projects: [], variosMat: { ordenes: [] } }, () => cont);
} catch(e){ console.log('extract err', e.message); }
ok('extraíble', typeof fn === 'function');
if (fn) {
  const r = fn();
  ok('saldo × precio congelado (4984 × 65)', r.total === 323960);
  ok('cuenta las madres', r.madres === 1);
}
const zD = ex('function _comprasGastosDashDatos(');
ok('el dashboard suma la fila BODEGA CENTRAL', /_prepagoSinDespachar\(\)/.test(zD) && /BODEGA CENTRAL/.test(zD));
ok('y entra al total de empresa (cuadra con lo pagado)', /totC \+= _pp\.total/.test(zD));

console.log('\n— B. la fecha del documento —');
const zC = ex('window._dppCrearDesdeMadre = async function');
ok('el despacho lleva la fecha del DÍA (no la de la madre)', /fecha: \(typeof _dateALatam/.test(zC));
/* v1068 (Antonio, 30-jul): "la fecha de entrega va a depender de la fecha que el supervisor
   lo pida... manejémoslo como con las órdenes de compra" — el modal manual ganó un campo
   OPCIONAL; vacío sigue sin heredar nada de la madre. */
ok('y sin fecha de entrega heredada (vacío u opcional del form, nunca la de la madre)', /fechaEntrega: form\.entrega \? _fechaInputALatam\(form\.entrega\) : ''/.test(zC));
ok('el trasiego también estampa su fecha', /fecha: \(typeof _dateALatam/.test(ex('window._trasRegistrar = async function')));

console.log('\n— C. las tarjetas SÍ se pintan al entrar a BODEGA CENTRAL —');
/* Antonio: "no veo nada de trasiegos ni de bodega pre-pago" — los rellenados estaban en
   la rama de GASTOS por un mal anclaje del edit */
const zTab = ex('function _comprasSetTab(');
ok('rama bodega pinta pre-pago y trasiegos', /t === 'bodega'[\s\S]{0,600}_bodegaPrepagoHTML\(\)[\s\S]{0,300}_trasiegosHTML\(\)/.test(zTab));
ok('y la rama de gastos ya no los pinta', !/t === 'gastos'[\s\S]{0,600}_bodegaPrepagoHTML/.test(zTab));

console.log('\n— D. TODOS los historiales nacen cerrados en cada entrada —');
/* Antonio: "todos los historiales deben estar predeterminadamente cerrados — cuando me
   meto están abiertos": el estado vivía en localStorage y quedaba pegado para siempre */
ok('el flag vive en memoria, no en localStorage', /function _histVisible\(k\)\{ return window\._histFlags\[k\] === true; \}/.test(html));
ok('ningún historial lee localStorage ya', !/localStorage\.getItem\(_hKey\)/.test(html) && !/localStorage\.getItem\(histKey\)/.test(html)
  && !/localStorage\.getItem\('bodega_movs_visible'\)/.test(html) && !/localStorage\.getItem\('varios_historial_visible'\)/.test(html)
  && !/localStorage\.getItem\(_hKeyOc\)/.test(html) && !/localStorage\.getItem\(_hKeyBod\)/.test(html));
ok('ningún toggle escribe localStorage ya', !/localStorage\.setItem\('bodega_movs_visible'/.test(html) && !/localStorage\.setItem\(k, localStorage/.test(html)
  && !/localStorage\.setItem\(key, cur/.test(html) && !/localStorage\.setItem\(key, '1'\)/.test(html));
ok('los 8 historiales usan el flag de memoria', (html.match(/_histVisible\(/g) || []).length >= 9 && (html.match(/_histToggle\(/g) || []).length >= 7);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
