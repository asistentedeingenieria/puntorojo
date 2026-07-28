/* v990 — FIXES de la revisión adversarial de v989 (8 defectos reales):
   A1 el permiso se evaluaba DESPUÉS de firmar, grabar y SUBIR la recepción.
   A2 advancePedido mutaba el `pd` capturado ANTES del await del modal (regla v769/v770).
   A3 la transición quedaba partida: el recibo subía y el estado esperaba 3 awaits de red.
   A5 al cancelar quedaban globals sucios y un fallback que grababa la recepción COMPLETA.
   B1 un pedido con SOLO extras/metal a medida no se podía marcar recibido NUNCA.
   B2 el recibo omitía extras y metal a medida — el TOTAL mentía y se firmaba incompleto.
   B3 los nombres salían crudos con el prefijo 'CAT::' y sin su spec.
   C1 el match difuso abría el candado con proveedores que NO venden el material.
   (+ C2 la elección de proveedor no persistía; C3 el precio del picker sin formato) */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));


const _v1010deps = `
let _precioIdxCache = null;
function _getProveedores(){ try { return (state && state.proveedoresGlobales) || []; } catch(e){ return []; } }
function _matFixStore(){ try { return (state && state.matFix) || []; } catch(e){ return []; } }
function _precioIndexReset(){ _precioIdxCache = null; }
function _precioIndexProv(){
  if (_precioIdxCache) return _precioIdxCache;
  const idx = {};
  (_getProveedores() || []).forEach(prv => {
    (prv.productos || []).forEach(pr => {
      if (!pr || !pr.nombre) return;
      const precio = Number(pr.precio) || 0;
      if (precio <= 0) return; // sin precio no entra (mismo criterio que _provsDelProducto v990)
      const k = normOcName(pr.nombre);
      if (!k) return;
      (idx[k] = idx[k] || []).push({ id: prv.id, nombre: prv.nombre, precio: precio, unidad: pr.unidad || '', prodNombre: pr.nombre });
    });
  });
  Object.keys(idx).forEach(k => idx[k].sort((a, b) => a.precio - b.precio)); // el más barato primero, igual que findBestProviderForItem
  _precioIdxCache = idx;
  return idx;
}
function _matAliasMap(){
  if (_matAliasMap._cache) return _matAliasMap._cache;
  const m = {};
  (_matFixStore() || []).forEach(f => { if (f && f.tipo === 'ALIAS' && f.key && f.hacia) m[f.key] = f.hacia; });
  _matAliasMap._cache = m;
  return m;
}
function _matAliasCanon(key){
  const m = _matAliasMap();
  let k = key, n = 0;
  /* Sigue la cadena A→B→C hasta el final. El tope de saltos es por si alguien declara un
     círculo (A→B y después B→A): sin él, el while se cuelga para siempre. */
  while (m[k] && m[k] !== k && n < 20) { k = m[k]; n++; }
  return k;
}
function _matEstaOculto(key){
  /* cacheado como el de alias: el colapso lo llama DOS veces por clave dentro del bucle
     caliente, y un .some() lineal sobre matFix por cada una se nota con la lista ampliada */
  if (!_matEstaOculto._cache) {
    const c = {};
    (_matFixStore() || []).forEach(f => { if (f && f.tipo === 'OCULTO' && f.key) c[f.key] = 1; });
    _matEstaOculto._cache = c;
  }
  return !!_matEstaOculto._cache[key];
}
function _matFixReset(){ _matAliasMap._cache = null; _matEstaOculto._cache = null; }
`;
const zAdv = ex('async function advancePedido(');
// A1: permiso ANTES de abrir la recepción
ok('A1: el gate de permiso corre ANTES del modal de recepción', zAdv.indexOf('SIN PERMISO PARA ESTA ACCIÓN') < zAdv.indexOf('_abrirRecepcion('));
// v996: además del dueño, recibe el ENCARGADO de esa obra (_puedeEntrega)
ok('A1: el dueño (o encargado/admin/advance/receive) puede recibir', /_esRecep/.test(zAdv) && /_isOwner0 \|\| _puedeEntrega \|\| can\('users\.manage'\) \|\| can\('pedidos\.advance'\) \|\| can\('pedidos\.receive'\)/.test(zAdv));
// A2: re-leer tras el await
ok('A2: re-lee el pedido del state vivo tras el modal', /_ctx3 = _findPedidoGlobal\(id\)/.test(zAdv) && /YA NO EXISTE/.test(zAdv));
ok('A2: pd deja de ser const (se re-asigna con el vivo)', /let pd = _ctx\.pd/.test(zAdv));
// A3: persistir el estado ANTES de las notificaciones
ok('A3: guarda y sube el estado ANTES de notificar', zAdv.indexOf('v990: persistir') > 0 && zAdv.indexOf('v990: persistir') < zAdv.indexOf('_notifyByPerm'));

// B: el detalle sale de la MISMA fuente que la OC (items + extras + metal, nombres limpios)
const zRec = ex('window._abrirRecepcion = async function');
ok('B1/B2/B3: el modal usa buildPedidoOcItems (3 fuentes, nombre limpio + spec)', /buildPedidoOcItems\(/.test(zRec));
ok('B1: sin líneas NO bloquea el pedido (devuelve sin-detalle)', /sin-detalle/.test(zRec) && /sin-detalle/.test(zAdv));
ok('B3: ya no imprime la clave cruda con ::', !/Object\.keys\(pd2\.items/.test(zRec));
const zDoc = ex('function _reciboDocHTML(');
ok('B2: el recibo ya no depende solo de pd.items', !/pd\.items/.test(zDoc));
// A5: limpieza y fallback seguro
const zCerrar = ex('window._recepcionCerrar = function');
ok('A5: al cerrar limpia TODAS las globals', /_recepcionLineas = null/.test(zCerrar) && /_recepcionPedidoId = null/.test(zCerrar));
const zConf = ex('window._recepcionConfirmar = async function');
ok('A5: sin modal/inputs ABORTA (no graba recepción completa)', /if \(!modal \|\| !lineas\.length\) return window\._recepcionCerrar\(false\)/.test(zConf));
ok('A5: la firma se pide DESPUÉS de confirmar el detalle', zConf.indexOf('_pedirFirmaSiFalta') > 0 && !/_pedirFirmaSiFalta/.test(zRec));

// C1: match EXACTO para abrir el candado
const zProv = ex('function _provsDelProductoEn(');
let fP = null;
try { fP = new Function('_getProveedores', 'normOcName', 'return (' + zProv + ')'); } catch(e){}
if (fP) {
  const norm = s => String(s || '').toUpperCase().replace(/\[[^\]]*\]/g, '').replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  const PRV = [
    { id:'a', nombre:'A', productos:[{ nombre:'PLYWOOD OKOUME 4X8X1/2', precio:295 }] },
    { id:'b', nombre:'B', productos:[{ nombre:'PLYWOOD', precio:640 }] },
    { id:'c', nombre:'C', productos:[{ nombre:'PLYWOOD', precio:600 }] }
  ];
  const f = fP(() => PRV, norm);
  const r = f('PLYWOOD [4\' X 8\' X 3/4"]');
  ok('C1: solo los que venden EXACTAMENTE ese material', r.length === 2 && r.every(x => x.id !== 'a'));
  ok('C1: un nombre que solo es SUBCADENA no abre el candado', f('CLAVO CON ESCUADRA 1"').length === 0);
} else ok('_provsDelProducto evaluable', false);
// C2/C3
ok('C2: la elección de proveedor se respeta en el próximo pedido', /v990: memoria explícita/.test(html));
ok('C3: el precio del picker usa fmtQ', /fmtQ\(x\.precio\)/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
