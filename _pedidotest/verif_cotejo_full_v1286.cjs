/* v1286 (Antonio, 26-ago: "la están modificando de otras cosas como el título — necesito
   verificaciones que SÍ O SÍ me hagan saber si NO se modificó"): dos huecos reales.
   (1) La copia sellada no llevaba FORMA DE PAGO ni ENTREGAR A (dirección/contactos) ni el
   detalle de RENTA — justo lo que un tramposo alteraría sin tocar el total. Ahora el
   payload OC va pv:3 con esos campos y verificar.html los pinta: el escaneo enseña TODO
   lo que dice el papel. Copias viejas (pv<3) se re-sellan solas al imprimir/compartir
   (mecanismo v1244: el gate vive en el subidor). El payload de PEDIDO no gana campos y
   queda en pv:2.
   (2) La hoja usaba font-family:Arial — en Android no existe y cae a Roboto, así que la
   MISMA hoja legítima salía con letra distinta según el aparato (la falsa alarma de hoy).
   _hojaFontTag() embebe la fuente de la app (base64 de _pdfBarlow, ya cacheada) en las 3
   hojas, y las 3 capturas html2canvas esperan fonts.ready — misma letra en todos lados:
   una letra distinta vuelve a ser señal de verdad. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const verif = fs.readFileSync(path.join(__dirname, '..', 'verificar.html'), 'utf8');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* ── 1. payload OC completo, pv:3 ── */
const zPay = ex(html, 'function _ocVerifPayload(');
ok('payload OC va pv:3', /pv: 3/.test(zPay));
ok('lleva FORMA DE PAGO y crédito', /formaPago/.test(zPay) && /credito/.test(zPay));
ok('lleva ENTREGAR A', /entregarA/.test(zPay));
ok('lleva el detalle de RENTA', /rentaDias/.test(zPay) && /rentaInicio/.test(zPay) && /rentaFin/.test(zPay));
ok('el payload de PEDIDO queda en pv:2 (no gana campos)', /pv: 2/.test(ex(html, 'function _pedVerifPayload(')));

/* ── 2. el subidor re-sella copias viejas ── */
const zSub = ex(html, 'window._ocVerifSubir = async function');
ok('gate del subidor OC: re-sube si verifV < 3', /verifV\) \|\| 0\) >= 3\) return/.test(zSub.replace(/\n/g, ' ')));
ok('al confirmar marca verifV = 3', /verifV = 3/.test(zSub));

/* ── 3. verificar.html pinta el cotejo completo ── */
const iNube = verif.indexOf('_renderNube');
const zNube = verif.slice(iNube, iNube + 9000);
ok('pinta FORMA DE PAGO (condicional, copias viejas no rompen)', /d\.formaPago/.test(zNube) && /FORMA DE PAGO/.test(zNube));
ok('pinta ENTREGAR A', /d\.entregarA \?/.test(zNube) && /ENTREGAR A/.test(zNube));
ok('pinta la RENTA (días + del/al)', /rentaDias/.test(zNube) && /DÍAS/.test(zNube));
ok('la leyenda ahora nombra PAGO Y ENTREGA y sigue NEUTRA', /PAGO Y ENTREGA/.test(zNube) && /LO QUE VALE ES LO QUE VES AQUÍ/.test(zNube) && !/ALTERADO/.test(zNube));

/* ── 4. la hoja lleva SU letra (misma en compu, Android e impresión) ── */
const zFont = ex(html, 'function _hojaFontTag(');
ok('_hojaFontTag existe', zFont.length > 50);
let tag;
try { if (zFont.length > 50) tag = new Function('window', zFont + '\nreturn _hojaFontTag;'); } catch(e){ ok('evaluable solo', false); }
if (tag) {
  /* v1291/v1292: la fuente de las hojas vive en el loader neutral _hojaFont (hoy Oswald) */
  ok('con la fuente cacheada embebe @font-face con el base64', (function(){ const t = tag({ _hojaFont: { ready: function(){ return 'QUJDRA'; } } })(); return /@font-face/.test(t) && /QUJDRA/.test(t) && /font\/ttf;base64/.test(t); })());
  ok('sin fuente devuelve vacío (la hoja sigue saliendo con Arial)', tag({})() === '');
}
ok('las 3 hojas la inyectan (OC + solicitud + recibo)', (html.match(/_hojaFontTag\(\)/g) || []).length >= 4);

/* ── 5. las capturas esperan la fuente antes de fotografiar ── */
ok('las 3 capturas html2canvas esperan fonts.ready', (html.match(/fonts\.ready/g) || []).length >= 3);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
