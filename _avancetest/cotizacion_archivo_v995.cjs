/* v995 (reporte de Antonio 27-jul: "por alguna razón ya NO puedo ver las cotizaciones"):
   la tarjeta solo pinta el link "ver" si sol.cotArchivoUrl tiene valor. Varias solicitudes
   quedaron con ese campo VACÍO.

   CAUSA: en _antCotizarGuardar la subida del archivo a Firebase Storage vivía dentro de un
   try/catch que se tragaba el error (console.warn y seguir). Cuando Storage falló —la cuota
   diaria del plan gratuito, el mismo incidente que frenó las fotos de avance— la cotización
   se guardaba con cotArchivoUrl:'' y compras veía "COTIZACIÓN ENVIADA" en verde: nadie se
   enteraba de que el archivo no había subido.

   FIX: (1) si se adjuntó archivo y la subida falla, NO se envía la cotización: error rojo y
        el modal queda abierto para reintentar;
        (2) la tarjeta marca en ámbar las cotizaciones SIN ARCHIVO;
        (3) se puede ADJUNTAR la cotización después, para recuperar las que ya quedaron así. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. la subida ya no falla en silencio ──
const zCot = ex('window.subirCotizacionAnticipo = async function');
ok('la función existe', !!zCot);
ok('el fallo de subida ABORTA el envío (no guarda sin archivo)', /_subioOk|NO SE PUDO SUBIR LA COTIZACIÓN/.test(zCot));
// el aborto va DENTRO del bloque del archivo: si no subió, no se llega a guardar la solicitud
const _iFile = zCot.indexOf('if(file){'), _iSave = zCot.indexOf('sol.cotProveedor=prov');
const _iAbort = zCot.indexOf('return; // el modal queda abierto');
ok('el aborto ocurre ANTES de guardar la cotización', _iFile > 0 && _iAbort > _iFile && _iAbort < _iSave);
ok('el aviso es rojo y visible', /showT\('NO SE PUDO SUBIR LA COTIZACIÓN[^']*', *'red'\)/.test(zCot));

// ── 2. la tarjeta avisa cuándo no hay archivo ──
ok('la tarjeta marca SIN ARCHIVO', /SIN ARCHIVO/.test(html));

// ── 3. se puede adjuntar después ──
ok('existe el adjuntar tardío', /window\._antAdjuntarCotizacion = async function/.test(html));
const zAdj = ex('window._antAdjuntarCotizacionGuardar = async function');
ok('solo compras o gerencia adjunta', /anticipos\.cotizar/.test(zAdj) && /_antEsGerente\(\)/.test(zAdj));
// regla v769/v770: el objeto se re-lee del state VIVO DESPUÉS del await de red
const _iUp = zAdj.indexOf('getDownloadURL'), _iFind = zAdj.indexOf('_antSolics().find');
ok('re-lee la solicitud DESPUÉS del await de subida (regla v769/v770)', _iUp > 0 && _iFind > _iUp);
ok('sella _ts (union-merge de solicitudes)', /_ts *= *Date\.now\(\)/.test(zAdj));
ok('acá SÍ aborta si la subida falla', /NO SE PUDO SUBIR/.test(zAdj));
ok('el botón sale cuando la cotización no tiene archivo', /ADJUNTAR COTIZACIÓN/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
