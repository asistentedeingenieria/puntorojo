/* v1236 (Antonio, 17-ago): los PEDIDOS de material cambian de cara —
   1. SIN el logo de PUNTO ROJO (en ningún pedido).
   2. En vez de la firma visible: el QR estilo OC (esquinas rojas + PUNTO ROJO + número
      vertical), del LADO IZQUIERDO. Al escanear: cuándo se realizó y a qué hora,
      proyecto, nivel, solicitante y entrega deseada — misma clave y misma verificar.html.
   3. Las firmas quedan CHIQUITAS hasta abajo del documento.
   4. Formato carta en cualquier aparato — YA cubierto por la cabecera compartida v1232. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zDoc = ex(html, 'function _solicitudDocHTML(');
console.log('— 1. sin logo —');
ok('el logo salió de la solicitud', !!zDoc && !/_LOGO_PR/.test(zDoc));

console.log('\n— 2. el QR estilo OC, lado izquierdo, en vez de la firma grande —');
const zQ = ex(code, 'function _pedQrTexto(');
ok('_pedQrTexto existe: enlace a verificar.html tipo pedido, con fecha y hora del pedido',
  /verificar\.html#/.test(zQ) && /'d', 'p'/.test(zQ) && /_qrFechaHora\(pd\.ts\)/.test(zQ));
ok('cifrado con la MISMA clave del admin (x/k/t)', /window\._qrClave/.test(zQ) && /_qrCifrar\(_payload/.test(zQ));
ok('el doc dibuja el QR con las 4 esquinas y la firma de marca',
  (zDoc.match(/2\.5px solid #C8141C/g) || []).length === 8 && /_pedQrTexto\(pd, p\)/.test(zDoc) && />PUNTO ROJO</.test(zDoc));
ok('con el número del pedido en vertical', /writing-mode:vertical-rl/.test(zDoc));
ok('la firma GRANDE del centro ya no está (queda chiquita al pie)',
  !/height:64px;display:flex;align-items:flex-end;justify-content:center/.test(zDoc)
  && /SOLICITANTE · \$\{pd\.solicitante\}|SOLICITANTE · ' \+/.test(zDoc));
ok('el QR va ANTES de la firma del pie (izquierda, arriba del cierre)',
  zDoc.indexOf('_pedQrTexto(pd, p)') > 0 && zDoc.indexOf('_pedQrTexto(pd, p)') < zDoc.indexOf('GUATEMALA'));

console.log('\n— 3. verificar.html entiende pedidos —');
const vh = (() => { try { return fs.readFileSync(path.join(__dirname, '..', 'verificar.html'), 'utf8'); } catch(e){ return ''; } })();
ok('título dinámico PEDIDO DE MATERIALES', /PEDIDO DE MATERIALES/.test(vh));
ok('filas de pedido: solicitante, nivel y entrega', /SOLICITANTE/.test(vh) && /NIVEL/.test(vh) && /ENTREGA DESEADA/.test(vh));
ok('el TOTAL solo se pinta cuando viene (los pedidos no llevan dinero)', /ps\.get\('t'\) \?/.test(vh));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
