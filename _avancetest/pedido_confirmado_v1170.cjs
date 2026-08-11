/* v1170 — "PEDIDO ENVIADO A COMPRAS" MENTÍA, Y ESA MENTIRA COSTÓ UN PEDIDO

   EL CASO (11-ago): RONY creó un pedido, la app le mostró un cartel que decía "Se envió el
   pedido EF2 – 10 a compras. Lo ves en LISTA DE PEDIDOS", y él —con razón— lo imprimió, lo
   firmó y lo mandó por WhatsApp. Ese pedido nunca llegó a la nube. Nadie se enteró hasta que
   otra persona recibió el mismo número.

   LO QUE ENCONTRÓ LA AUDITORÍA (confirmado por un verificador independiente):
   · El cartel se muestra ~1.2 s ANTES de que el SDK intente escribir: submitPedido llama
     saveState(), que solo AGENDA la subida con un setTimeout de 1200 ms, y sigue de largo.
   · No espera ningún resultado: sin await de la subida, sin mirar navigator.onLine, sin mirar
     si CloudSync está habilitado. El cartel es incondicional.
   · El objeto pedido no guarda NINGÚN campo que diga si llegó a la nube, así que después
     tampoco hay forma de saberlo ni de avisar.
   · La misma frase se repite en el catch de respaldo y en el pedido automático desde receta.
   · Y el chip de sync puede decir EN LÍNEA con cero escrituras: uploadCurrent hace return
     ANTES de escribir si la app es de solo lectura o si el candado de versión está cerrado,
     pero devuelve una promesa resuelta y el .then() marca 'synced'.

   EL MODELO A COPIAR YA ESTÁ EN LA APP: las fotos (v899). Se marcan POR COMPARTIR en el
   dispositivo, se fuerza la subida, y el mensaje final depende de que la nube haya confirmado
   de verdad. Acá se hace lo mismo con los pedidos — no hay arquitectura nueva que inventar.

   REGLA QUE QUEDA: la app no le dice a nadie que algo se envió hasta que la nube lo confirme.
   Un cartel optimista no es una comodidad: es lo que convierte una falla de red recuperable
   en un papel firmado que circula por WhatsApp y que no existe para nadie más. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— el mensaje (PURO): nunca puede afirmar lo que no pasó —');
const srcAviso = ex(code, 'function _pedidoAvisoEnvio(');
ok('existe _pedidoAvisoEnvio', !!srcAviso);
if (srcAviso) {
  const f = new Function(srcAviso + '\nreturn _pedidoAvisoEnvio;')();

  const okNube = f(true, 'EF2 – 10', 'Lo ves en <b>LISTA DE PEDIDOS</b>.');
  ok('confirmado: dice que se envió', /ENVIADO A COMPRAS/.test(okNube.title));
  ok('confirmado: nombra el pedido', okNube.bodyHTML.indexOf('EF2 – 10') >= 0);
  ok('confirmado: dice dónde verlo', /LISTA DE PEDIDOS/.test(okNube.bodyHTML));

  const sinNube = f(false, 'EF2 – 10', 'Lo ves en <b>LISTA DE PEDIDOS</b>.');
  /* LA ASERCIÓN QUE DEFINE ESTA VERSIÓN: sin confirmación, la palabra "ENVIADO" no aparece
     en ninguna parte del aviso. Ni en el título, ni en el cuerpo, ni de refilón. */
  ok('SIN confirmar: en NINGUNA parte dice que se envió',
    !/ENVIAD/i.test(sinNube.title) && !/ENVIAD/i.test(sinNube.bodyHTML.replace(/NO SE (HA )?ENVI[AÓ]\w*/gi, '')));
  ok('SIN confirmar: avisa que quedó solo en este equipo', /ESTE EQUIPO|ESTE TELÉFONO|NO SE ENVIÓ|SIN ENVIAR/i.test(sinNube.title + sinNube.bodyHTML));
  ok('SIN confirmar: dice explícitamente que NO lo imprima ni lo mande todavía',
    /IMPRIM/i.test(sinNube.bodyHTML) && /(NO|TODAV[IÍ]A)/i.test(sinNube.bodyHTML));
  ok('SIN confirmar: dice qué hacer para arreglarlo', /CONEXI[OÓ]N|INTERNET|SEÑAL|REINTENT|ABRIR LA APP/i.test(sinNube.bodyHTML));
  ok('SIN confirmar: el tono no es de éxito', sinNube.tono !== 'ok' && /rojo|red|alerta|warn/i.test(String(sinNube.tono || '')));
  ok('nombra el pedido en los dos casos', sinNube.bodyHTML.indexOf('EF2 – 10') >= 0);
  ok('tolera número vacío sin romper', (() => { try { return !!f(true, '', ''); } catch(e){ return false; } })());
}

console.log('\n— la marca local: el pedido queda señalado hasta que la nube confirme —');
ok('existe el marcador de pedidos por enviar', /_pedPendAdd\s*\(/.test(code) && /function _pedPendAdd\(/.test(code));
ok('se puede preguntar si un pedido está pendiente', /function _pedidoEstaPendiente\(/.test(code));
ok('vive en localStorage (sobrevive a cerrar la app)', /pr_pedidos_pend/.test(code));
ok('NO se sincroniza (es por dispositivo, como el de fotos v899)',
  !/pedPend[A-Za-z]*\s*:/.test(code) || !/state\.pedPend/.test(code));

console.log('\n— se limpia SOLO cuando la nube commitea de verdad —');
const nCommit = (code.match(/_pedPendClear\(\)/g) || []).length;
ok('se limpia en los DOS puntos de commit (scheduleSave y forceUploadNow)', nCommit >= 2);
ok('se limpia junto al de fotos (mismo momento exacto)',
  /_fotosPendClear[\s\S]{0,200}_pedPendClear|_pedPendClear[\s\S]{0,200}_fotosPendClear/.test(code));

console.log('\n— submitPedido espera a la nube antes de hablar —');
const sub = ex(code, 'async function submitPedido(');
ok('submitPedido existe y es async', !!sub);
ok('fuerza la subida en vez de esperar el debounce de 1.2 s', /forceUploadNow/.test(sub));
ok('ESPERA el resultado (await)', /await[\s\S]{0,80}forceUploadNow/.test(sub));
ok('marca el pedido como pendiente antes de intentar', /_pedPendAdd\(/.test(sub));
ok('el aviso sale de la función pura, no de un texto suelto', /_pedidoAvisoEnvio\(/.test(sub));
ok('ya NO existe el cartel incondicional viejo', sub.indexOf("title: 'PEDIDO ENVIADO A COMPRAS'") < 0);
ok('el catch de respaldo tampoco afirma que se envió',
  !/catch[\s\S]{0,120}PEDIDO \$\{numero\} ENVIADO A COMPRAS/.test(sub));

console.log('\n— el impreso no puede mentir tampoco —');
ok('el pedido guarda si fue confirmado por la nube', /nubeOk|_confirmadoNube/.test(code));

console.log('\n— el chip de sync no puede decir EN LÍNEA sin haber escrito —');
const upc = ex(code, 'async uploadCurrent(){');
ok('uploadCurrent avisa cuando sale sin escribir (solo lectura / candado)',
  /_salioSinEscribir|return\s*'bloqueado'|return false/.test(upc));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
