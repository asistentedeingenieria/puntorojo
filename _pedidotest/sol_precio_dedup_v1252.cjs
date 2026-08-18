/* v1252 (Antonio, 17-ago: "autorizo solicitudes de precio, no se actualiza en la nube y al
   reabrir me VUELVEN A APARECER"). Forense: NO era un reset de estado — eran DUPLICADOS.
   1. El cierre de toma creaba una solicitud NUEVA en CADA intento (la pendiente no pone
      precio en el catálogo ⇒ la toma no cierra ⇒ el reintento fabrica otra gemela). El
      admin autorizaba UNA tarjeta y la gemela seguía PENDIENTE — "reaparecía".
      FIX: _crearSolicitudPrecio es IDEMPOTENTE — misma clave (producto+proveedor+tipo)
      PENDIENTE ⇒ se ACTUALIZA (precio/motivo/_ts) y se devuelve, jamás se duplica.
   2. autorizar/rechazar resuelven también a las GEMELAS (misma clave y MISMO precio) —
      las de precio DISTINTO se quedan: son decisiones aparte.
   3. La subida ignoraba el return false de uploadCurrent (candado v892, solo-lectura):
      el cambio quedaba solo local SIN AVISO. FIX: forceUploadNow (canal fuerte v940,
      encadena tras la subida en vuelo v1186) + toast rojo si no subió. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zC = ex('function _crearSolicitudPrecio(');
const zA = ex('function autorizarSolicitudPrecio(');
const zR = ex('function rechazarSolicitudPrecio(');

console.log('— 1. creación idempotente —');
ok('busca una PENDIENTE de la misma clave antes de crear', /matchKeyProducto/.test(zC) && /'PENDIENTE'/.test(zC));
let fC = null;
try {
  fC = new Function('state','_getProveedores','uid','saveState','CloudSync','_notifyByPerm','currentUser','matchKeyProducto','normOcName','showToast',
    zC + '\nreturn _crearSolicitudPrecio;');
} catch(e){}
if (fC) {
  const st = { solicitudesPrecios: [] };
  const norm = s => String(s||'').toUpperCase().trim();
  const f = fC(st, () => [], () => Math.random().toString(36).slice(2), () => {}, undefined, undefined, null, norm, norm, () => {});
  const a = f('ALTA', '', 'TORNILLO DE ½" PUNTA FINA', 'CIENTO', null, 8.5, 'ALTA DESDE INVENTARIO (cierre de toma)', 'SISTEGUA, S.A.');
  const b = f('ALTA', '', 'TORNILLO DE ½" PUNTA FINA', 'CIENTO', null, 8.5, 'ALTA DESDE INVENTARIO (cierre de toma)', 'SISTEGUA, S.A.');
  ok('el segundo intento NO duplica (misma tarjeta)', st.solicitudesPrecios.length === 1 && a.id === b.id);
  const c = f('ALTA', '', 'TORNILLO DE ½" PUNTA FINA', 'CIENTO', null, 9.0, 'reintento con otro precio', 'SISTEGUA, S.A.');
  ok('otro precio ACTUALIZA la pendiente (no una gemela)', st.solicitudesPrecios.length === 1 && Number(c.precioNuevo) === 9);
  const d = f('ALTA', '', 'CLAVO CON ROLDANA 1"', 'CIENTO', null, 5, 'otro producto', 'SISTEGUA, S.A.');
  ok('otro producto SÍ crea la suya', st.solicitudesPrecios.length === 2 && d.id !== a.id);
} else ok('_crearSolicitudPrecio evaluable', false);

console.log('— 2. autorizar/rechazar barren a las gemelas —');
ok('autorizar resuelve las gemelas de la misma clave y mismo precio',
  /matchKeyProducto/.test(zA) && /precioNuevo/.test(zA.slice(zA.indexOf('AUTORIZADA'))) && /forEach|filter/.test(zA));
ok('rechazar igual', /matchKeyProducto/.test(zR));

console.log('— 3. la subida ya no es muda —');
ok('autorizar usa el canal fuerte y avisa si no subió', /forceUploadNow/.test(zA) && /NO SUBIÓ/.test(zA));
ok('crear también', /forceUploadNow/.test(zC));
ok('rechazar también', /forceUploadNow/.test(zR));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
