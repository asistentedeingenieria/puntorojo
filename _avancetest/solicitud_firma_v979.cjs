/* v979 (pedidos de Antonio 26-jul, WhatsApp de la solicitud):
   1. FIRMA DEL SOLICITANTE SIEMPRE: al enviar un pedido (manual o de receta), si el
      usuario no tiene firma registrada se le pide subirla ANTES (hoja en blanco +
      lapicero negro + buena foto); sin firma NO sale el pedido. En la solicitud
      impresa la firma se pinta como en las OCs (imagen sobre la línea).
   2. COMPARTIR: la descripción es "SOLICITUD DE PEDIDO - <SIGLAS> - <NÚMERO> - FECHA
      DE ENTREGA DESEADA <fecha>" (sigla del proyecto, no el nombre completo; sin .png
      visible — va como title/text del share) y la imagen lleva MARGEN blanco. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. firma obligatoria en las DOS fronteras de crear pedido ──
const zSub = ex('async function submitPedido(');
ok('submitPedido exige firma registrada', /_pedirFirmaSiFalta\(\)/.test(zSub) && /REGISTRÁ TU FIRMA/.test(zSub));
const zPed = ex('async function pedirEtapaCompleta(');
ok('pedirEtapaCompleta (pedido de receta) también', /_pedirFirmaSiFalta\(\)/.test(zPed) && /REGISTRÁ TU FIRMA/.test(zPed));
// el modal de firma explica el método (hoja en blanco + lapicero negro)
ok('el modal de firma explica cómo (hoja en blanco, lapicero negro)', /hoja en blanco/i.test(html) && /lapicero negro/i.test(html));

// ── 2. la solicitud impresa pinta la FIRMA del solicitante (como las OCs) ──
const iSol = html.indexOf('FORMATO DE SOLICITUD');
const zSol = html.slice(iSol - 8000, iSol + 10000);
/* v1238 (Antonio): "La firma NO la quiero en el pedido" — salió de la hoja; la confirmación
   del QR (verificar.html) muestra FIRMA DEL SOLICITANTE en trazo caligráfico. */
ok('v1238: la solicitud ya NO incrusta la firma del solicitante', !/_miFirmaImg\(pd\.solicitanteUsername\)/.test(zSol));

// ── 3. compartir DESDE LA APP (v980: como asistencia — compu/Android/iPhone/tablet) ──
ok('descripción SOLICITUD DE PEDIDO - SIGLAS - Nº - FECHA DE ENTREGA DESEADA', /'SOLICITUD DE PEDIDO - ' \+ _projSiglas\(/.test(html) && /FECHA DE ENTREGA DESEADA/.test(html));
ok('escalera de compartir de asistencia: nativo Capacitor → Web Share → descarga', /Filesystem\.writeFile/.test(ex('async function _imgCompartir(')) && /navigator\.share\(\{ files: \[file\], title: titulo \|\| filename, text: titulo \|\| '' \}\)/.test(ex('async function _imgCompartir(')));
ok('la imagen lleva margen blanco alrededor', /drawImage\(canvas, M, M\)/.test(ex('window.compartirSolicitudImg = async function')));
ok('captura en iframe oculto con el MISMO builder del doc', /_solicitudDocHTML\(pd, p, true\)/.test(html) && /_solicitudDocHTML\(_ctx\.pd, activeProj\(\), false\)/.test(html));
ok('botón COMPARTIR IMAGEN en el detalle del pedido (app)', /compartirSolicitudImg\(\)"/.test(html));
// ── 4. v980: Android dejaba el doc en modo oscuro ilegible y VOLVER no hacía nada ──
/* v1053: el only light vive en _docHeadMeta (compartido por las 3 hojas) y el VOLVER en
   _docVolverOnclick — la red final navega al origen SIN depender de window.closed */
ok('los DOS docs fuerzan luz (color-scheme only light)', /color-scheme" content="only light"/.test(ex('function _docHeadMeta(')) && (html.match(/\$\{_docHeadMeta\(\)\}/g) || []).length >= 3 && (html.match(/color-scheme:only light/g) || []).length >= 2);
ok('VOLVER con red final: navegar al origen si la ventana no cierra', /location\.replace\('" \+ location\.origin \+ "'\)/.test(ex('function _docVolverOnclick(')) && (html.match(/\$\{_docVolverOnclick\(\)\}/g) || []).length >= 3);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
