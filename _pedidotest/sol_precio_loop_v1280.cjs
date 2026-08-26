/* v1280 (Antonio, 24-ago: "ya TRES veces autoricé las solicitudes de precio y me
   vuelven a aparecer; a compras no le salen autorizadas"):
   CAUSA DE FONDO: el aparato de compras estuvo CIEGO semanas (receptor-ciego,
   cerrado hoy en v1276) — nunca recibió las autorizaciones ni los precios nuevos,
   y su app re-generaba las solicitudes con ID NUEVO. La idempotencia v1252 solo
   mira PENDIENTES, así que las gemelas resucitaban. Además se creaban CAMBIOS AL
   MISMO PRECIO (Q20.25 → Q20.25, "variación por centécimas") que no deberían
   existir jamás.
   FIX — tres candados en el embudo único _crearSolicitudPrecio:
   (1) CAMBIO sin cambio real (<Q0.005) no se crea;
   (2) si el catálogo YA tiene ese precio, no hay nada que pedir;
   (3) una gemela RESUELTA (AUTORIZADA) hace <72 h con el mismo precio manda —
       no se re-pide (el aparato lento la recibe por el merge, no re-pidiendo). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m,0),d=0; i=html.indexOf('{',m); for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const src = ex('function _crearSolicitudPrecio(');
ok('el creador existe', src.length > 500);

/* armar el entorno mínimo y evaluar la función REAL */
function arma(catalogoPrecio, solicitudesPrevias){
  const state = { solicitudesPrecios: (solicitudesPrevias || []).slice() };
  const prov = { id: 'prv1', nombre: 'POSTES Y MADERAS', productos: catalogoPrecio != null ? [{ nombre: 'REGLA MADERA', unidad: 'U', precio: catalogoPrecio, _ts: 1 }] : [] };
  const f = new Function('state', '_getProveedores', 'matchKeyProducto', 'normOcName', 'uid', 'saveState', 'CloudSync', 'showToast', 'currentUser', 'window', 'console',
    src + '; return _crearSolicitudPrecio;')(
    state, () => [prov], s => String(s || '').toUpperCase().trim(), s => String(s || '').toUpperCase().trim(),
    () => 'x' + Math.random().toString(36).slice(2, 8), () => {}, { forceUploadNow: () => Promise.resolve(true) },
    () => {}, { displayName: 'TEST' }, {}, { log: () => {} });
  return { f, state };
}

/* 1. CAMBIO al MISMO precio → NO se crea */
let t = arma(20.25, []);
ok('cambio Q20.25 → Q20.25 NO se crea', t.f('CAMBIO', 'prv1', 'REGLA MADERA', 'U', 20.25, 20.25, 'VARIACIÓN') === null && t.state.solicitudesPrecios.length === 0);

/* 2. diferencia de menos de medio centavo → NO se crea */
t = arma(20.25, []);
ok('cambio con diferencia < Q0.005 NO se crea', t.f('CAMBIO', 'prv1', 'REGLA MADERA', 'U', 20.25, 20.2501, 'VARIACIÓN') === null);

/* 3. el catálogo YA tiene ese precio → NO se crea */
t = arma(60, []);
ok('si el catálogo ya está en Q60, pedir Q60 NO crea nada', t.f('CAMBIO', 'prv1', 'REGLA MADERA', 'U', 55, 60, 'AJUSTE') === null && t.state.solicitudesPrecios.length === 0);

/* 4. gemela AUTORIZADA hace 1 hora con el mismo precio → devuelve ESA, no crea otra */
const autorizada = { id: 'sp-vieja', tipo: 'CAMBIO', proveedorNombre: 'POSTES Y MADERAS', productoNombre: 'REGLA MADERA', precioNuevo: 22, estado: 'AUTORIZADA', resueltoTs: Date.now() - 3600e3, _ts: 1 };
t = arma(20.25, [autorizada]);
let r4 = t.f('CAMBIO', 'prv1', 'REGLA MADERA', 'U', 20.25, 22, 'SUBIÓ');
ok('gemela AUTORIZADA hace <72h manda — no se re-pide', r4 && r4.id === 'sp-vieja' && t.state.solicitudesPrecios.length === 1);

/* 5. la misma gemela pero de hace 5 DÍAS → SÍ se crea (es una decisión nueva) */
const vieja5d = Object.assign({}, autorizada, { resueltoTs: Date.now() - 5 * 24 * 3600e3 });
t = arma(20.25, [vieja5d]);
let r5 = t.f('CAMBIO', 'prv1', 'REGLA MADERA', 'U', 20.25, 22, 'SUBIÓ');
ok('resuelta hace 5 días NO bloquea — se crea nueva', r5 && r5.id !== 'sp-vieja' && t.state.solicitudesPrecios.length === 2);

/* 6. un cambio REAL se crea normal (regresión) */
t = arma(20.25, []);
let r6 = t.f('CAMBIO', 'prv1', 'REGLA MADERA', 'U', 20.25, 24, 'SUBIÓ LA MADERA');
ok('cambio real Q20.25 → Q24 se crea PENDIENTE', r6 && r6.estado === 'PENDIENTE' && t.state.solicitudesPrecios.length === 1);

/* 7. la idempotencia v1252 sigue: PENDIENTE igual se ACTUALIZA, no se duplica */
t = arma(20.25, [{ id: 'sp-p', tipo: 'CAMBIO', proveedorNombre: 'POSTES Y MADERAS', productoNombre: 'REGLA MADERA', precioNuevo: 23, estado: 'PENDIENTE', _ts: 1 }]);
let r7 = t.f('CAMBIO', 'prv1', 'REGLA MADERA', 'U', 20.25, 24, 'OTRA VEZ');
ok('v1252 intacta: la PENDIENTE existente se actualiza a Q24', r7 && r7.id === 'sp-p' && Number(r7.precioNuevo) === 24 && t.state.solicitudesPrecios.length === 1);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
