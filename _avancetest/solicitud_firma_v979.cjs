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
ok('la solicitud incrusta la firma del solicitante', /_miFirmaImg\(pd\.solicitanteUsername\)/.test(zSol));

// ── 3. compartir: descripción con SIGLAS + fecha, y margen en la imagen ──
ok('descripción SOLICITUD DE PEDIDO - SIGLAS - Nº - FECHA DE ENTREGA DESEADA', /SOLICITUD DE PEDIDO - \$\{_projSiglas\(/.test(zSol) && /FECHA DE ENTREGA DESEADA/.test(zSol));
ok('el share manda la descripción como title y text (sin .png visible)', /navigator\.share\(\{ files: \[file\], title: desc, text: desc \}\)/.test(zSol));
ok('la imagen lleva margen blanco alrededor', /drawImage\(canvas, M, M\)/.test(zSol));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
