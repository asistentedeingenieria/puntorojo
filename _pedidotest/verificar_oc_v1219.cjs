/* v1219 (Antonio, 16-ago: vio a compras editando una OC en Paint — "¿cómo verificamos que
   las ÓRDENES DE COMPRA que se suben al chat del proveedor sean legítimas y NO estén
   editadas?").

   Una imagen siempre se puede editar; LA NUBE no. Tres piezas:
   1. SELLO DE INTEGRIDAD impreso en cada OC — derivado del número+proveedor+fecha+
      renglones+total: si cambia UN centavo, el sello cambia completo.
   2. QR local (librería qrcodejs ya cargada, sin servicios externos) con los datos
      legítimos — cualquier teléfono lo escanea sin login y compara contra la imagen.
   3. VERIFICAR OC en COMPRAS (finanzas/admin): muestra lo que dice Firestore — la
      fuente de verdad — para cruzar contra la imagen recibida. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— 1. el sello: determinista y sensible a TODO —');
const zH = ex(code, 'function _selloHash32(');
const zS = ex(code, 'function _ocSelloIntegridad(');
ok('existen', !!zH && !!zS);
try {
  const fH = new Function('return (' + zH + ')')();
  const fS = new Function('_numLimpio', '_selloHash32', 'return (' + zS + ')')(s => String(s||''), fH);
  const OC = () => ({ numero:'OC4 - 000016', proveedorNombre:'SISTEGUA, S.A.', fecha:'2026-08-15', total:3321.16,
    items:[{ name:'CANAL LISTON', qty:100, precio:11.85 }, { name:'REBORDE', qty:10, precio:32 }] });
  const s1 = fS(OC());
  ok('formato XXXX-XXXX-XXXX', /^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(s1));
  ok('determinista (el mismo doc da el mismo sello en cualquier aparato)', fS(OC()) === s1);
  const t = OC(); t.total = 3321.17;
  ok('UN centavo en el total cambia el sello', fS(t) !== s1);
  const q = OC(); q.items[0].qty = 101;
  ok('una cantidad cambia el sello', fS(q) !== s1);
  const pr = OC(); pr.items[1].precio = 33;
  ok('un precio cambia el sello', fS(pr) !== s1);
  const n = OC(); n.numero = 'OC4 - 000017';
  ok('el número cambia el sello', fS(n) !== s1);
  /* v1220 (Antonio: "que no esté compras poniendo la firma de finanzas... que se corrobore
     que eso se hizo desde el usuario de finanzas"): el sello CUBRE LA AUTORIZACIÓN. Una OC
     pendiente con la firma pegada en Paint ya no puede dar el sello de la autorizada. */
  const a1 = OC(); a1.autorizadoPorUsername = 'erlin'; a1.autorizadoTs = 1755400000000;
  ok('v1220: AUTORIZAR cambia el sello (la firma pegada en Paint no puede fingirlo)', fS(a1) !== s1);
  const a2 = OC(); a2.autorizadoPorUsername = 'otra'; a2.autorizadoTs = 1755400000000;
  ok('v1220: la CUENTA que autoriza es parte del sello', fS(a2) !== fS(a1));
  const a3 = OC(); a3.autorizadoPorUsername = 'erlin'; a3.autorizadoTs = 1755400000001;
  ok('v1220: la HORA de autorización es parte del sello', fS(a3) !== fS(a1));
} catch(e){ ok('evalúa aislado', false); console.log('  ' + e.message); }

console.log('\n— 2. el QR: un ENLACE a la página de verificación (v1225) —');
/* v1225 (Antonio: "cuando lo escaneo NO me sale nada"): un QR de TEXTO PLANO el teléfono
   lo manda a Google como búsqueda. El QR ahora lleva un ENLACE a verificar.html — el
   teléfono abre el navegador y ve los datos formateados, sin login. Los datos viajan en
   el #fragmento (no llegan a ningún servidor). */
const zQ = ex(code, 'function _ocQrTexto(');
ok('el QR es un enlace a puntorojo.app/verificar.html con los datos en el fragmento',
  /https:\/\/puntorojo\.app\/verificar\.html#/.test(zQ) && /_ocSelloIntegridad\(oc\)/.test(zQ) && /autorizadoPorUsername/.test(zQ));
try {
  const fH2 = new Function('return (' + ex(code, 'function _selloHash32(') + ')')();
  const fS2 = new Function('_numLimpio', '_selloHash32', 'return (' + ex(code, 'function _ocSelloIntegridad(') + ')')(s => String(s||''), fH2);
  const fQ2 = new Function('_numLimpio', '_ocSelloIntegridad', 'return (' + zQ + ')')(s => String(s||''), fS2);
  const url = fQ2({ numero:'OC4 - 000023', proveedorNombre:'PANEL PERFECTO, S.A.', fecha:'2026-08-17', total:8120,
    autorizadoPor:'ERLIN TRIGUEROS', autorizadoPorUsername:'erlin', autorizadoTs:1755500000000 });
  const psv = new URLSearchParams(url.split('#')[1] || '');
  ok('los datos viajan completos y decodificables', psv.get('n') === 'OC4 - 000023' && psv.get('p') === 'PANEL PERFECTO, S.A.'
    && psv.get('t') === '8120.00' && psv.get('u') === 'erlin' && /^[0-9A-F]{4}-/.test(psv.get('s') || ''));
  const url2 = fQ2({ numero:'OC4 - 000024', proveedorNombre:'X', fecha:'2026-08-17', total:5 });
  ok('sin autorizar, los params de autorización simplemente NO van (neutro)', (new URLSearchParams(url2.split('#')[1])).get('a') === null);
} catch(e){ ok('la URL evalúa', false); console.log('  ' + e.message); }
const vhtml = (() => { try { return fs.readFileSync(path.join(__dirname, '..', 'verificar.html'), 'utf8'); } catch(e){ return ''; } })();
ok('verificar.html existe y lee el fragmento', /URLSearchParams/.test(vhtml) && /location\.hash/.test(vhtml));
ok('verificar.html ESCAPA todo lo que pinta (el fragmento lo escribe quien llega)', /replace\(\/\[&<>"'\]\/g/.test(vhtml) && /textContent|createTextNode|_esc\(/.test(vhtml));
ok('verificar.html es neutra (sin frases de sospecha)', vhtml && !/FUE ALTERADO|DESCONF/i.test(vhtml));
const zD = ex(code, 'function _ocQrDataUrl(');
ok('el QR se genera LOCAL con qrcodejs (nada viaja a servicios externos)',
  /new QRCode\(/.test(zD) && /toDataURL/.test(zD) && !/qrserver|googleapis/.test(zD));
/* v1222 (Antonio: "no veo el código QR"): el sello salía pero el QR no — la librería venía
   de un CDN externo con defer y al armar el documento aún no estaba (los acuses ya tenían
   guardas de undefined por esta MISMA razón). La librería ahora viaja DENTRO de la app:
   funciona sin internet de terceros, en el impreso y en la imagen compartida. */
ok('v1222: qrcodejs viaja DENTRO de la app (ya no del CDN)',
  /var QRCode;!function\(\)/.test(html) && !/cdnjs\.cloudflare\.com\/ajax\/libs\/qrcodejs/.test(html));
/* v1224: el bug UTF-8 de qrcodejs — el buffer `b` se declaraba UNA vez fuera del bucle y
   tras el primer carácter no-ASCII (el · del texto) cada letra siguiente arrastraba bytes
   basura ⇒ "code length overflow" ⇒ QR NO DISPONIBLE. Reproducido en navegador real:
   "HOLA MUNDO" OK, el texto con · reventaba. El parche mueve b=[] ADENTRO del bucle. */
ok('v1224: el parche UTF-8 está aplicado (b=[] nace en cada vuelta del bucle)',
  /for\(var d=0,e=this\.data\.length;e>d;d\+\+\)\{var b=\[\],f=this\.data\.charCodeAt\(d\)/.test(html)
  && !/for\(var b=\[\],d=0,e=this\.data\.length/.test(html));
ok('v1222: si aún así no hay QR, el documento LO DICE (nada de silencio)',
  /QR NO DISPONIBLE/.test(html));

console.log('\n— 3. el documento: SOLO el QR, discreto, encima de las firmas (v1223) —');
/* v1223 (Antonio): "no quiero que las personas crean que estoy desconfiando de ellas".
   Nada de sello impreso ni advertencias en el documento — solo el QR, abajo-izquierda,
   encima de las firmas. El escaneo muestra datos NEUTROS (sin "fue alterado"); la
   lectura de auditoría vive únicamente en VERIFICAR OC (admin + Sibila). */
const _doc = html.slice(html.indexOf('function printOrdenCompra('), html.indexOf('window.compartirOcImg'));
ok('el QR está en el doc', /_ocQrDataUrl\(_ocQrTexto\(oc\)\)/.test(_doc));
/* v1226 (Antonio): el QR aparece SOLO cuando finanzas YA firmó — es la MARCA de
   autorización. Un borrador o pendiente no lleva QR: compras no puede producir un
   documento con QR por su cuenta, y cada QR es único (nace de los datos + cuenta + hora
   exacta de ESA autorización — el de otra orden muestra otros datos al escanear). */
ok('v1226: el QR está condicionado a oc.autorizadoPor (sin firma de finanzas, sin QR)',
  /\$\{oc\.autorizadoPor \? [\s\S]{0,80}_ocQrDataUrl\(_ocQrTexto\(oc\)\)/.test(_doc));
/* v1227 (Antonio eligió mezclar D+E+H): esquinas de escaneo ROJAS en las 4 puntas,
   "PUNTO ROJO" en letras espaciadas debajo del QR, y el número de la orden en vertical
   al costado (identifica la orden aunque la imagen se recorte). */
const _qrBlk = (_doc.match(/\$\{oc\.autorizadoPor \? \(function\(\)[\s\S]{0,2600}?\)\(\) : ''\}/) || [''])[0];
ok('v1227: las CUATRO esquinas de escaneo rojas', (_qrBlk.match(/2\.5px solid #C8141C/g) || []).length === 8);
ok('v1227: la firma de marca PUNTO ROJO debajo del QR', /letter-spacing:2\.5px[^>]*>PUNTO ROJO</.test(_qrBlk));
ok('v1227: el número de la orden en vertical al costado', /writing-mode:vertical-rl/.test(_qrBlk) && /_numLimpio\(oc\.numero/.test(_qrBlk));
ok('el QR va ANTES de las firmas (encima, no al pie)',
  _doc.indexOf('_ocQrDataUrl(_ocQrTexto(oc))') >= 0 && _doc.indexOf('_ocQrDataUrl(_ocQrTexto(oc))') < _doc.indexOf('<div class="oc-firmas">'));
ok('SIN sello impreso ni textos de advertencia en el documento',
  !/SELLO DE INTEGRIDAD · \$\{/.test(_doc) && !/FUE ALTERADO/.test(_doc) && !/EL QR MUESTRA/.test(_doc));
ok('el ESCANEO tampoco acusa (la frase "fue alterado" salió del QR)', !/FUE ALTERADO/.test(zQ));

console.log('\n— 4. el verificador: la nube es la fuente de verdad —');
/* v1221 (Antonio): VERIFICAR OC solo para ÉL (admin) y SIBILA (csibila, gerente
   financiero) — ni compras ni quien autoriza lo ven (el verificador vigila justamente a
   quienes tocan las OC; no puede estar en manos de los vigilados). */
const zG = ex(code, 'function _puedeVerificarOc(');
ok('el candado es una lista cerrada: admin + csibila', !!zG && /users\.manage/.test(zG) && /csibila/.test(zG));
try {
  const mkG = (esAdmin, username, email) => new Function('can', 'getCurrentUser', 'return (' + zG + ')')(
    perm => esAdmin && perm === 'users.manage', () => ({ username: username, email: email }));
  ok('el admin puede', mkG(true, 'antonio', '')() === true);
  ok('SIBILA puede (por usuario)', mkG(false, 'csibila', '')() === true);
  ok('SIBILA puede (por correo)', mkG(false, '', 'CSIBILA@PUNTOROJOSA.COM')() === true);
  ok('compras NO puede', mkG(false, 'susana', 'susana@puntorojosa.com')() === false);
  ok('quien AUTORIZA tampoco (Erlin no está en la lista)', mkG(false, 'erlin', 'erlin@puntorojosa.com')() === false);
} catch(e){ ok('el candado evalúa', false); console.log('  ' + e.message); }
const zU = ex(code, 'window._verificarOcUI = function(');
ok('existe y usa el candado nuevo (ya no compras.autorizar)', !!zU && /_puedeVerificarOc\(\)/.test(zU) && !/compras\.autorizar/.test(zU));
ok('el botón también usa el candado nuevo', /_puedeVerificarOc\(\)[\s\S]{0,200}VERIFICAR OC<\/button>/.test(html));
const zB = ex(code, 'window._verificarOcBuscar = function(');
ok('busca en LOS TRES contenedores (obras + bodega + varios)',
  /state\.projects/.test(zB) && /bodegaMat/.test(zB) && /variosMat/.test(zB));
ok('normaliza el número buscado (espacios/guiones fuera)', /replace\(/.test(zB) && /toUpperCase\(\)/.test(zB));
ok('muestra quién la generó y quién la autorizó', /generadoPor/.test(zB) && /autorizadoPor/.test(zB));
ok('v1220: muestra LA CUENTA (@usuario) que autorizó — no solo el nombre en letras',
  /autorizadoPorUsername/.test(zB) && /generadoPorUsername/.test(zB));
ok('v1220: explica el candado (solo cuenta revisora; quien genera no autoriza)',
  /quien la genera no puede autorizarla|QUIEN LA GENERA NO PUEDE AUTORIZARLA/i.test(zB));
ok('todo lo pintado va escapado (regla XSS v849)', /_esc\(|esc\(/.test(zB));

console.log('\n— 5. el botón en COMPRAS —');
ok('la barra de órdenes ofrece VERIFICAR OC', /VERIFICAR OC<\/button>/.test(html) && /_verificarOcUI\(\)/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
