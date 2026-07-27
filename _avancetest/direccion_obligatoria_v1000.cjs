/* v1000 (pedido de Antonio 27-jul): "si la obra es nueva o proyecto pequeño y NO tiene
   dirección, es obligado poner la dirección y quién recibe para poder generar la OC".

   Hoy, cuando la obra del pedido no tiene una dirección guardada, el modal propone
   "OBRA — TIFFANY" y rellena el texto con "OBRA TIFFANY" — el nombre, no una dirección.
   Con eso se generaba la OC igual y al proveedor le llegaba una orden sin dónde entregar
   ni a quién buscar.

   FIX: _ocEntregaFalta(texto) dice qué le falta a la entrega (PURA); generarOrdenCompra
   bloquea mientras falte, y el modal avisa antes de llegar ahí.
   Criterio: sin texto, sin NÚMERO (una dirección sin número no le sirve al piloto) o
   demasiado corta ⇒ falta dirección. Sin nombre de contacto ⇒ falta quién recibe. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zF = ex('function _ocEntregaFalta(');
ok('existe _ocEntregaFalta', !!zF);
let f = null;
try { f = new Function('return (' + zF + ')')(); } catch(e){}
if (f) {
  // lo que hoy se genera solo para una obra nueva: el NOMBRE, sin dirección ni contacto
  ok('"OBRA TIFFANY" no alcanza', f('OBRA TIFFANY').length > 0);
  ok('vacío tampoco', f('').length > 0 && f(null).length > 0);
  ok('una dirección sin número no sirve', f('POR EL PARQUE, A LA PAR DE LA TIENDA').some(x => /DIRECCIÓN/.test(x)));
  ok('un texto muy corto tampoco', f('ZONA 1').some(x => /DIRECCIÓN/.test(x)));
  // con dirección pero sin quién recibe
  const soloDir = f('19 AVENIDA B, 0-03 VISTA HERMOSA 2, ZONA 15');
  ok('con dirección pero sin contacto, falta quién recibe', soloDir.length === 1 && /RECIBE/.test(soloDir[0]));
  // completo: dirección + contacto (nombre y/o teléfono)
  ok('dirección + contacto pasa', f('19 AVENIDA B, 0-03 VISTA HERMOSA 2, ZONA 15 - CONTACTO: SUSANA MONROY 4707-9414').length === 0);
  ok('acepta el contacto en otra línea', f('4TA CALLE 5-20 ZONA 3, MIXCO\nRECIBE: JULIO CHARVAC 5555-1234').length === 0);
  ok('acepta un teléfono como contacto', f('KM 15.5 CARRETERA A EL SALVADOR, CASA 12\nTEL 4707-9414').length === 0);
  ok('devuelve SIEMPRE un array (no rompe el llamador)', Array.isArray(f('x')) && Array.isArray(f('')));
}

// ── se bloquea la generación ──
const zG = ex('async function generarOrdenCompra(');
ok('generarOrdenCompra valida la entrega', /_ocEntregaFalta\(/.test(zG));
ok('y NO deja generar mientras falte', /return showToast\(/.test(zG) && /FALTA[^']*ENTREGA|COMPLETÁ LA ENTREGA/.test(zG));
const _iVal = zG.indexOf('_ocEntregaFalta('), _iCrea = zG.indexOf('const numero = `${pd.numero}');
ok('la validación corre ANTES de crear la orden', _iVal > 0 && _iCrea > 0 && _iVal < _iCrea);

// ── el modal avisa antes ──
ok('el modal marca la entrega incompleta', /_ocAvisoEntrega|ocEntregaAviso/.test(html));

/* v1000 — otros dos reportes del mismo mensaje de Antonio:
   · en BODEGA CENTRAL la OC pendiente salía DOS veces (botón en la fila del pedido + la
     bandeja nueva). La autorización queda en UN solo lugar: la bandeja.
   · en el catálogo de precios, quien PROPONE no podía escribir el número: el precio iba por
     oninput, así que la solicitud se abría en la primera tecla y el re-render revertía el
     campo. Ahora va por change (o Enter). */
const _iFila = html.indexOf('me salen dos por cada orden');
ok('la fila del pedido ya no lleva botón de autorizar', _iFila > 0 && !/AUTORIZAR ${_nOc}/.test(html));
ok('en su lugar informa que está pendiente de finanzas', /PENDIENTE FINANZAS/.test(html));
ok('la bandeja sigue teniendo el único botón de firma', /AUTORIZAR Y FIRMAR/.test(html));
const _iPrecio = html.indexOf('class="precio"');
const _zPrecio = _iPrecio > 0 ? html.slice(_iPrecio - 60, _iPrecio + 400) : '';
ok('el precio del catálogo se guarda al SALIR del campo, no en cada tecla',
   _zPrecio.includes("onchange=\"updateCatProvProducto") && !_zPrecio.includes("oninput=\"updateCatProvProducto"));
ok('Enter también confirma', /event.key==='Enter'/.test(_zPrecio));
ok('al admin no se le muestran los botones de PROPONER',
   html.includes('data-proponer-cat') && html.includes("_editaDirecto ? 'none' : ''"));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
