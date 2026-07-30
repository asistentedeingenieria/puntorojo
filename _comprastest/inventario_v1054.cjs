/* v1054 — INVENTARIO: rediseño + el candado del catálogo + reporte PDF para gerencia.
   Antonio (fotos Android + mensajes 29-jul):
   - "todo más estético, centrado, botones más pequeños en el cel (CERRAR TOMA)"
   - el formulario MATERIAL/UNIDAD/CANTIDAD/AGREGAR "con los cuadros del mismo tamaño"
   - producto que NO está en el listado: opción VISIBLE y fácil (no el avisito amarillo)
   - REGLA: si se contó algo fuera del CATÁLOGO DE PRECIOS, al CERRAR la toma se OBLIGA a
     agregarlo al catálogo antes del resumen — el inventario se valoriza con el catálogo.
   - Reporte PDF: DESCARGAR y COMPARTIR con nombre INVENTARIO - SIGLAS - FECHA. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. quién está FUERA del catálogo (el mismo criterio de la valorización) —');
const zSin = ex('function _invMaterialesSinPrecio(');
/* la llamada va DENTRO del try: si la función aún no existe, esto REPRUEBA en vez de tumbar */
const sinPrecio = (toma, precios) => {
  try {
    return new Function('_getProveedores', 'precioDeProductoReceta',
      'return (' + zSin + ')')(() => [], (provs, nom) => precios[nom] === undefined ? null : { precio: precios[nom], rendimiento: 1 })(toma);
  } catch(e){ return null; }
};
ok('evaluable', Array.isArray(sinPrecio({ lineas: [] }, {})));
if (Array.isArray(sinPrecio({ lineas: [] }, {}))) {
  const toma = { lineas: [ { material:'TABLAYESO', unidad:'U' }, { material:'AGUA DE COCO', unidad:'UND' }, { material:'AGUA DE COCO', unidad:'UND' }, { material:'CINTA X', unidad:'ROLLO' } ] };
  const r = sinPrecio(toma, { 'TABLAYESO': 55, 'CINTA X': 0 });
  ok('el que tiene precio NO cuenta', !r.some(x => x.material === 'TABLAYESO'));
  ok('el que NO está en el catálogo cuenta', r.some(x => x.material === 'AGUA DE COCO'));
  /* coherente con el bloque B8: existir con precio 0 = sin precio */
  ok('precio 0 también cuenta (agujero B8)', r.some(x => x.material === 'CINTA X'));
  ok('sin duplicados', r.filter(x => x.material === 'AGUA DE COCO').length === 1);
}

console.log('\n— 2. el CIERRE se bloquea hasta resolver el catálogo —');
const zCerrar = ex('async function cerrarTomaInventario(');
ok('el cierre consulta a los faltantes', /_invMaterialesSinPrecio\(/.test(zCerrar));
ok('el alta reusa el circuito v998 (solicitud + autorización)', /_crearSolicitudPrecio\('ALTA'/.test(ex('async function _invAltaCatalogo(')));
ok('quien puede autorizar hace el alta DIRECTA ahí mismo', /autorizarSolicitudPrecio\(/.test(ex('async function _invAltaCatalogo(')));
ok('si quedan faltantes, la toma NO se cierra', /QUEDA ABIERTA/.test(zCerrar));
/* regla v769/v940: hay awaits nuevos en medio — re-leer la toma del state vivo */
ok('re-lee la toma tras los awaits', (zCerrar.match(/_invActiveToma\(\)/g) || []).length >= 2);

console.log('\n— 3. el reporte PDF para gerencia —');
const zNom = ex('function _invReporteNombre(');
const nombre = (p, t) => {
  try {
    return new Function('_projSiglas', 'return (' + zNom + ')')(
      new Function('return (' + ex('function _projSiglas(') + ')')())(p, t);
  } catch(e){ return null; }
};
ok('el nombre es INVENTARIO - SIGLAS - FECHA', nombre({ name:'ESSENZA FASE 2' }, { fechaCierre:'2026-07-29T17:42:00.000Z' }) === 'INVENTARIO - EF2 - 29-07-2026.pdf');
ok('una sola palabra usa el nombre entero', nombre({ name:'TORELO' }, { fechaCierre:'2026-07-29T17:42:00.000Z' }) === 'INVENTARIO - TORELO - 29-07-2026.pdf');
/* maqueta v3 (decisión de Antonio, con foto de referencia): MATRIZ POR TORRE — materiales en
   filas × NIVELES en columnas (los aptos de cada nivel se SUMAN), TOTAL y VALOR por material,
   fila TOTAL NIVEL, números centrados, solo la abreviatura. */
const zMx = ex('function _invReporteMatriz(');
const matriz = (p, toma) => { try { return new Function('return (' + zMx + ')')()(p, toma); } catch(e){ return null; } };
const pM = { towers: [ { name:'TORRE 3', levels: [ { name:'N01', aptos:[{id:'a1'},{id:'a2'}] }, { name:'N02', aptos:[{id:'a3'}] } ] } ] };
const tomaM = { lineas: [
  { material:'tablayeso', unidad:'U', cantidad:5, locKey:'a1' },
  { material:'TABLAYESO', unidad:'U', cantidad:3, locKey:'a2' },
  { material:'TABLAYESO', unidad:'U', cantidad:2, locKey:'a3' },
  { material:'MASKING', unidad:'ROLLO', cantidad:7, locKey:'BODEGA' },
] };
const rM = matriz(pM, tomaM);
ok('los aptos del nivel se SUMAN en su columna', rM && rM.torres['TORRE 3'].mats['TABLAYESO'].porNivel['N01'] === 8);
ok('cada nivel su columna', rM && rM.torres['TORRE 3'].mats['TABLAYESO'].porNivel['N02'] === 2);
ok('con su TOTAL por material', rM && rM.torres['TORRE 3'].mats['TABLAYESO'].total === 10);
ok('BODEGA es su propia sección', rM && rM.bodega.mats['MASKING'].cantidad === 7);
const zDoc = ex('function _invReporteDoc(');
ok('el documento se arma con jsPDF + autotable', /window\.jspdf/.test(zDoc) && /autoTable/.test(zDoc));
/* v1075 (decisión de Antonio): fuera la fila TOTAL NIVEL — la bodega no tiene niveles y el
   documento mezclaba dos criterios. Queda UN solo TOTAL GENERAL, y el total de cada tabla
   sigue mostrándose en su encabezado. */
ok('sin fila TOTAL NIVEL, con TOTAL GENERAL', !/TOTAL NIVEL/.test(zDoc) && /TOTAL GENERAL/.test(zDoc));
ok('números centrados', /halign: ?'center'/.test(zDoc));
ok('solo la abreviatura del proyecto', /_projSiglas\(/.test(zDoc));
ok('con muchos niveles se va a apaisado', /landscape/.test(zDoc));
ok('DESCARGAR usa el router de entrega (visor en la app nativa)', /_pdfDescargar\(/.test(ex('window._invReporteDescargar = ')));
ok('COMPARTIR usa la escalera nativa→web', /_pdfCompartir\(/.test(ex('window._invReporteCompartir = ')));
const zHist = ex('function _invHistDetalle(');
ok('los botones viven en el detalle de la toma cerrada', /_invReporteDescargar\(/.test(zHist) && /_invReporteCompartir\(/.test(zHist));
ok('solo para quien ve montos (mismo gate del resumen)', zHist.indexOf('_invReporteDescargar') > zHist.indexOf('verQ'));

console.log('\n— 4. el rediseño —');
const zRoot = ex('function renderInventarios(');
ok('las sub-pestañas usan los botones del panel (v1052)', /mat-tabs ped-tabs-bar/.test(zRoot));
const zCap = ex('function _invCapture(');
ok('UNIDAD/CANTIDAD/AGREGAR: cuadros del MISMO tamaño', /grid-template-columns:1fr 1fr 1fr/.test(zCap));
ok('la opción de producto nuevo es VISIBLE (botón, no avisito)', /_invAgregarComoNuevo/.test(zCap) && !/Escribilo tal cual y tocá AGREGAR/.test(html));
ok('existe el agregador', /window\._invAgregarComoNuevo = /.test(html));
ok('y avisa que el precio se pedirá al cerrar', /SE PEDIRÁ|PEDIRÁ SU PRECIO/.test(ex('window._invAgregarComoNuevo = ')));
const zHead = ex('function _invRenderActual(');
ok('la tarjeta de la toma tiene clase (rediseñable por CSS)', /inv-head/.test(zHead));
ok('CSS móvil: centrado y botones chicos', /@media[^{]*\{[^@]*\.inv-head\{[^}]*text-align:center/.test(html) || /\.inv-head[^{]*\{[^}]*text-align:center/.test(html.slice(html.indexOf('@media (max-width:640px)'))));

console.log('\n— 5. v1055: hora de inicio + firma automática de quien cierra —');
/* Antonio: "en la caja de información quiero la hora en que se inició la toma. Y a la
   persona que lo cierra quiero que le firmes automáticamente." La firma vive como dataURL
   JPEG en state.firmasUsuarios (v934) — se incrusta directo en el jsPDF, sin red. */
const zFH = ex('function _invFmtFechaHora(');
let fh = null;
try { fh = new Function('return (' + zFH + ')')(); } catch(e){}
ok('el formateador fecha · hora existe', typeof fh === 'function' && /·/.test(fh('2026-07-29T17:42:00')));
ok('con hora de dos dígitos', /\d{2}:\d{2}/.test(fh ? fh('2026-07-29T08:05:00') : ''));
const zCer = ex('async function cerrarTomaInventario(');
ok('el cierre estampa quién cerró', /cerradoPorNombre/.test(zCer));
ok('y su firma (dataURL del core, v934)', /cerradoFirma/.test(zCer) && /_miFirmaImg\(\)/.test(zCer));
const zDoc2 = ex('function _invReporteDoc(');
/* v1056 (Antonio, con el PDF real): el INICIO va PRIMERO, con nombres completos */
ok('la caja trae INICIO DE LA TOMA DE INVENTARIO con hora', /INICIO DE LA TOMA DE INVENTARIO/.test(zDoc2) && /_invFmtFechaHora\(toma\.fechaInicio\)/.test(zDoc2));
ok('y FINALIZACIÓN DE LA TOMA DE INVENTARIO con hora', /FINALIZACIÓN DE LA TOMA DE INVENTARIO/.test(zDoc2) && /_invFmtFechaHora\(toma\.fechaCierre\)/.test(zDoc2));
ok('el INICIO va antes que la finalización', zDoc2.indexOf('INICIO DE LA TOMA DE INVENTARIO') < zDoc2.indexOf('FINALIZACIÓN DE LA TOMA DE INVENTARIO'));
ok('la firma se incrusta en el pie', /addImage\(/.test(zDoc2) && /cerradoFirma/.test(zDoc2));
ok('con el nombre y CERRÓ LA TOMA abajo a la izquierda', /doc\.text\('CERRÓ LA TOMA'/.test(zDoc2) && /cerradoPorNombre \|\| toma\.byNombre/.test(zDoc2));
/* la información del pie va EN FILA PARA ABAJO (cada dato su línea) */
ok('MATERIALES, UNIDADES y la nota, apilados', /doc\.text\('MATERIALES: '/.test(zDoc2) && /doc\.text\('UNIDADES: '/.test(zDoc2) && /doc\.text\('Valorizado/.test(zDoc2));
/* el fondo café clarito de las filas alternas se cambia y el TOTAL se destaca */
ok('zebra elegante (gris suave, no café)', /alternateRowStyles/.test(zDoc2));
/* v1075: esa fila ya no existe — lo que se conserva es el total de cada tabla en su encabezado */
ok('cada tabla lleva su total en el encabezado', /content: money\(subB\)/.test(zDoc2) && /content: money\(subT\)/.test(zDoc2));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
