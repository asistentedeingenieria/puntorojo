/* v989 (pedidos de Antonio 27-jul):
   A. Buscador de proveedores en el CATÁLOGO MAESTRO.
   B. Si un material está en VARIOS proveedores del catálogo, compras SÍ puede elegir
      entre ellos (el precio cambia con el proveedor); con uno solo sigue el candado
      v978 (AUTO ↔ BODEGA).
   C. RECIBO DE RECEPCIÓN: al marcar recibido se abre el modal de recepción (cantidades
      editables = recepción PARCIAL, aprobada por Antonio), se exige la firma del que
      recibe y se guarda pd.recepcion; el recibo se imprime/comparte SIN montos y el
      TOTAL va en dos filas (materiales arriba, unidades abajo). */
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
// ── A. buscador de proveedores ──
ok('input de búsqueda de proveedores', /id="catProvBuscar"/.test(html) && /_catProvBuscar\(/.test(html));
ok('la lista filtra por el término', /_catProvTerm/.test(ex('function renderCatProvList(')));

// ── B. producto en varios proveedores ──
const zP = ex('function _provsDelProductoEn(');
ok('_provsDelProducto existe', !!zP);
let fP = null;
// v990: la función pasó a match EXACTO con normOcName (el difuso abría el candado mal)
try { fP = new Function('_getProveedores', 'normOcName', 'return (' + zP + ')'); } catch(e){}
if (fP) {
  const PRV = [
    { id:'p1', nombre:'SISTEGUA, S.A.', productos:[{ nombre:'CIENTO DE TORNILLO DE 1" PUNTA FINA', precio:8.5 }] },
    { id:'p2', nombre:'DISTRIBUIDORA FERRETERA', productos:[{ nombre:'CIENTO DE TORNILLO DE 1" PUNTA FINA', precio:4.66 }] },
    { id:'p3', nombre:'OTRO', productos:[{ nombre:'CLAVO', precio:1 }] }
  ];
  const f = fP(() => PRV, s => String(s || '').toUpperCase().trim());
  const r = f('CIENTO DE TORNILLO DE 1" PUNTA FINA');
  ok('devuelve los DOS proveedores que lo tienen, con su precio', r.length === 2 && r[0].precio === 8.5 && r[1].precio === 4.66);
  ok('el que no lo tiene queda fuera', !r.some(x => x.id === 'p3'));
  ok('producto en un solo proveedor → una opción', f('CLAVO').length === 1);
} else ok('_provsDelProducto evaluable', false);
const zPick = ex('function _abrirPickerProveedor(btn, idx)');
ok('con candado y VARIOS proveedores se ofrecen todos + BODEGA', /_provsDelProducto\(/.test(zPick) && /_multi\.length > 1/.test(zPick));
const zUpd = ex('function updateOcItemProveedor(');
ok('la defensa de frontera acepta cualquiera de esos proveedores', /_provsDelProducto\(/.test(zUpd));

// ── C. recepción + recibo ──
const zAdv = ex('async function advancePedido(');
ok('marcar RECIBIDO abre el modal de recepción (no el confirm genérico)', /_abrirRecepcion\(/.test(zAdv));
const zRec = ex('window._abrirRecepcion = async function');
// v990: la firma se pide en el CONFIRMAR (después de ver el detalle), no al abrir
ok('el flujo exige firma del que recibe', /_pedirFirmaSiFalta\(\)/.test(ex('window._recepcionConfirmar = async function')));
ok('cantidades editables (recepción parcial)', /data-recx/.test(zRec));
const zConf = ex('window._recepcionConfirmar = async function');
// v996: la entrega se arma en _entrega y se asigna a pd.recepcion (o al consolidado por OC)
ok('guarda la recepción con quién, cuándo y qué recibió', /_entrega = \{/.test(zConf) && /pd\.recepcion = /.test(zConf) && /porNombre/.test(zConf) && /\bitems\b/.test(zConf) && /fecha:/.test(zConf));
ok('marca si fue PARCIAL', /parcial/.test(zConf));
ok('sella _ts (union-merge v972) y sube', /_ts = Date\.now\(\)/.test(zConf) && /forceUploadNow/.test(zConf));
ok('el modal de recepción está en isUserBusy (regla v769)', /#_recepcionModal/.test(html));
// el documento
const zDoc = ex('function _reciboDocHTML(');
ok('_reciboDocHTML existe', !!zDoc);
ok('titula COMPROBANTE DE RECEPCIÓN y usa la sigla', /COMPROBANTE/.test(zDoc) && /_projSiglas\(/.test(zDoc));
ok('SIN montos: ni precio ni total en quetzales', !/precio/i.test(zDoc) && !/Q ?\$\{/.test(zDoc));
ok('TOTAL en dos filas (materiales arriba, unidades abajo)', /materiales<\/div>/.test(zDoc) && /unidades<\/div>/.test(zDoc) && !/materiales · /.test(zDoc));
ok('firma e identidad de quien recibió', /_miFirmaImg\(/.test(zDoc) && /RECIBIÓ EN OBRA/.test(zDoc));
ok('color-scheme only light (regla v980)', /only light/.test(zDoc));
ok('botón para ver/compartir el recibo', /window\.imprimirRecibo/.test(html) && /window\.compartirReciboImg/.test(html));
ok('el compartir reusa la escalera nativa de asistencia', /_imgCompartir\(/.test(ex('window.compartirReciboImg = async function')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
