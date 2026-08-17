/* v1240 (Antonio, 17-ago): "que NO SE PUEDA MANIPULAR LAS ORDENES DE COMPRA NI DESPACHOS
   NI NADA QUE FINANZAS DEBA DE AUTORIZAR" + "quiero la firma DE VERDAD que cada quien
   registro, NO ESA FIRMA FALSA" (sobre la caligrafica v1238).

   COPIA SELLADA EN LA NUBE: al autorizar una orden (y al crear un pedido) la app sube el
   documento COMPLETO — renglones, total y las firmas registradas reales — CIFRADO con la
   clave del admin a ocVerif/<token>; el QR lleva v=<token> y verificar.html lo lee por
   REST y pinta el documento entero EN VIVO. La imagen compartida queda de cortesia: nada
   externo a la app puede tocar la nube.

   Trampa v1039 cerrada de entrada: verifTok se escribe UNA vez en objetos union-merged
   ⇒ escudo "quien lo tiene, gana" en los 6 merges (ordenes+pedidos × proyecto/bodega/varios)
   ⇒ toca applyRemote ⇒ APP_SYNC_VERSION 941. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const vh = fs.readFileSync(path.join(__dirname, '..', 'verificar.html'), 'utf8');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— 1. el token —');
const zTok = ex(html, 'function _verifTokenNuevo(');
ok('existe _verifTokenNuevo', zTok.length > 50);
ok('usa crypto.getRandomValues con fallback', /crypto\.getRandomValues/.test(zTok) && /catch/.test(zTok));
let fTok = null;
try { fTok = new Function('crypto', 'return (' + zTok + ')')( { getRandomValues: a => { for (let i=0;i<a.length;i++) a[i] = (i*37+11) % 256; return a; } } ); } catch(e){}
if (fTok) {
  const t = fTok();
  ok('token largo e impredecible (>= 26 chars, hex)', typeof t === 'string' && t.length >= 26 && /^[0-9a-f]+$/.test(t));
} else ok('_verifTokenNuevo evaluable', false);

console.log('— 2. la copia sellada de la ORDEN —');
const zPay = ex(html, 'function _ocVerifPayload(');
ok('el payload lleva los RENGLONES (n/q/pu) y el total', /items/.test(zPay) && /qty/.test(zPay) && /precio/.test(zPay) && /total/.test(zPay));
ok('lleva las firmas REGISTRADAS reales (generador y autorizador)', /_miFirmaImg\(oc\.generadoPorUsername\)/.test(zPay) && /_firmaUsernameAutoriza/.test(zPay));
ok('lleva el sello de integridad', /_ocSelloIntegridad\(oc\)/.test(zPay));
const zSub = ex(html, 'window._ocVerifSubir = async function');
ok('sube a ocVerif/<token> CIFRADO (x/k/t) y marca verifOk sellando _ts', /collection\('ocVerif'\)/.test(zSub) && /_qrCifrar/.test(zSub) && /verifOk = true/.test(zSub) && /_ts = Date\.now\(\)/.test(zSub));
ok('sin clave del admin NO sube (el QR sigue como hoy)', /_qrClave/.test(zSub));
/* v1244: el gate ahora también mira la VERSIÓN de la copia (pv:2 = firma tinta) — con
   verifOk puesto Y copia al día no re-sube; una copia vieja sí se re-sella. */
ok('idempotente: con verifOk y copia al día no re-sube', /verifOk && \(Number\(oc\.verifV\) \|\| 0\) >= 2\) return/.test(zSub));

console.log('— 3. autorizar siembra el token —');
const zAut = ex(html, 'async function autorizarOrden(');
ok('al autorizar nace oc.verifTok (antes del sello _ts del mismo acto)', /verifTok = _verifTokenNuevo\(\)/.test(zAut));
ok('y dispara la subida de la copia sellada', /_ocVerifSubir\(oc\)/.test(zAut));

console.log('— 4. respaldo perezoso (OCs viejas y subidas fallidas) —');
const zPrint = ex(html, 'function printOrdenCompra(');
ok('imprimir/compartir una autorizada sin token se lo asigna y reintenta la subida',
  /verifTok/.test(zPrint) && /_ocVerifSubir/.test(zPrint));

console.log('— 5. el QR lleva v=<token> —');
const zQr = ex(html, 'function _ocQrTexto(');
ok('_ocQrTexto agrega v cuando hay token', /ps\.set\('v', oc\.verifTok\)/.test(zQr));
const zQrP = ex(html, 'function _pedQrTexto(');
ok('_pedQrTexto agrega v cuando hay token', /ps\.set\('v', pd\.verifTok\)/.test(zQrP));
ok('el QR se generó más denso: render 192px (misma caja de 76px impresa)', /width: 192, height: 192/.test(html));

console.log('— 6. pedidos: token al nacer + firma real del solicitante —');
const zSubPed = ex(html, 'async function submitPedido(');
ok('el pedido nace con verifTok', /verifTok: _verifTokenNuevo\(\)/.test(zSubPed));
ok('y sube su copia sellada', /_pedVerifSubir\(/.test(zSubPed));
const zPedPay = ex(html, 'function _pedVerifPayload(');
ok('payload del pedido: d=p, renglones, herramientas y la FIRMA REGISTRADA del solicitante',
  /'p'/.test(zPedPay) && /herramientas/.test(zPedPay) && /_miFirmaImg\(pd\.solicitanteUsername\)/.test(zPedPay));

console.log('— 7. el escudo v1039 del token —');
const zSh = ex(html, 'function _verifTokShield(');
ok('existe el escudo quien-lo-tiene-gana', /verifTok\) return/.test(zSh) && /verifOk/.test(zSh));
const nSh = (html.match(/_verifTokShield\(/g) || []).length;
ok('cubre los 6 merges (3 de ordenes + 3 de pedidos) + la definición', nSh >= 7);
ok('APP_SYNC_VERSION subió a 941 (el escudo toca applyRemote)', /const APP_SYNC_VERSION = 941;/.test(html));

console.log('— 8. verificar.html lee la nube EN VIVO —');
ok('fetch REST a Firestore del proyecto punto-rojo-3fcf1', /firestore\.googleapis\.com\/v1\/projects\/punto-rojo-3fcf1/.test(vh) && /ocVerif\//.test(vh));
ok('valida el tag antes de confiar en lo descifrado', (function(){ const i = vh.indexOf('_renderNube'); return i > 0 && /777/.test(vh.slice(vh.indexOf('firestore.googleapis.com') - 1200, vh.indexOf('firestore.googleapis.com') + 1200)); })());
ok('pinta los RENGLONES del documento', /_renderNube/.test(vh) && /DESCRIPCI/.test(vh));
ok('avisa que el documento viene EN VIVO de la nube', /EN VIVO/.test(vh));
ok('la firma REAL registrada reemplaza a la caligráfica (que queda de respaldo)', /firmaCal/.test(vh) && /data:image\//.test(vh));
ok('un fallo de red NO rompe el resumen del QR (fire-and-forget)', /\.catch\(function\(\)\{\}\)/.test(vh) || /\.catch\(\(\)=>\{\}\)/.test(vh));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
