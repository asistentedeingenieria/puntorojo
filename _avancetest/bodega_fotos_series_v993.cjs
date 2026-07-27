/* v993 (pedidos de Antonio 27-jul):
   1. SERIES SEPARADAS: OC, DESP (despacho de bodega) y OP (producción) llevan cada una
      su propio correlativo — antes compartían la serie (salía OC 00002 y DESP 00003).
   2. FOTOS: el SW cachea las de Firebase Storage (antes caían en el corte de
      googleapis.com y se re-descargaban en cada apertura) + loading="lazy".
   3. CARGAR EXISTENCIAS: si el material lo venden varios proveedores se elige de cuál es,
      y el movimiento guarda proveedor y precio para valorizar el inventario con su costo.
   4. Autorizado = VERDE, pendiente = NARANJA. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. series ──
const zS = ex('function _ocSerieDe(');
let fS = null;
try { fS = new Function('return (' + zS + ')')(); } catch(e){}
if (fS) {
  ok('despacho → DESP', fS({ esDespacho:true }) === 'DESP');
  ok('producción → OP', fS({ esProduccion:true }) === 'OP');
  ok('compra → OC', fS({}) === 'OC');
  ok('respeta la serie ya guardada', fS({ serie:'DESP' }) === 'DESP');
} else ok('_ocSerieDe evaluable', false);
const zGen = html.slice(html.indexOf('providerIds.forEach((provId, idx)'), html.indexOf('providerIds.forEach((provId, idx)') + 2500);
ok('el folio se toma de la serie que corresponde', /_primerNumeroLibre\(_usadosSerie\[serie\] \|\| \[\]\)/.test(zGen));
ok('cada OC guarda su serie', /serie, \/\/ v993/.test(html));
ok('el número usa la serie', zGen.includes('${pd.numero} - ${serie} ${folio}')); // v994: sin ceros
ok('el número previsto del modal también', /_seriePrev/.test(html) && /_ocSerieDe\(o\) === _seriePrev/.test(html));

// ── 2. fotos ──
ok('el SW cachea las fotos de Storage', /firebasestorage\.googleapis\.com/.test(sw) && /FOTOS_CACHE/.test(sw));
ok('el cache de fotos va ANTES del corte de googleapis', sw.indexOf('firebasestorage.googleapis.com') < sw.indexOf("url.hostname.endsWith('googleapis.com')"));
ok('el cache de fotos NO se borra al actualizar', /k !== FOTOS_CACHE/.test(sw));
ok('las fotos de avance cargan en diferido', /<img src="\$\{src\}" loading="lazy" decoding="async"/.test(html));

// ── 3. proveedor al cargar existencias ──
ok('selector de proveedor por material (solo si hay varios)', /data-cprov=/.test(html) && /_pvs\.length < 2/.test(html));
ok('la entrada lleva proveedor y precio', /proveedorId: _pid, proveedorNombre/.test(html));
ok('el movimiento guarda proveedor y precio', /proveedorNombre: f\.proveedorNombre/.test(ex('window._bodegaMovsDeCarga = function')));

// ── 4. colores ──
const _iA = html.indexOf('#F0FDF4;color:#15803D');
ok('AUTORIZADA en verde', _iA > 0 && html.slice(_iA, _iA + 400).includes('AUTORIZADA') && /color:#15803D;font-weight:700/.test(html));
const _iP = html.indexOf('#FFFBEB;color:#B45309');
ok('PENDIENTE en naranja', _iP > 0 && html.slice(_iP, _iP + 400).includes('PENDIENTE FINANZAS') && /color:#B45309;font-weight:700/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
