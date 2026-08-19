/* v1256 (Antonio, 18-ago, SOLO VICINIA DEL CARMEN): VDC no tiene receta en la app.
   FLUJO NUEVO: los botones de etapa SIN receta quedan HABILITADOS solo en VDC → el
   supervisor elige nivel (+ apto opcional) y lo OBLIGA a escribir una observación →
   nace una SOLICITUD DE ETAPA (pedido sin materiales, la descripción es la observación)
   → la comparte a compras → compras la ARMA como pedido formal en el talonario (con
   materiales y cantidades) → al crearlo, la solicitud se marca ATENDIDA sola (ligada) y
   se va al historial → OC → finanzas. Si un día se carga la receta del nivel, ese nivel
   vuelve SOLO al flujo normal (decisión de Antonio, las 3 preguntas del 18-ago). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— 1. el gate VDC-sin-receta —');
const zG = ex('function _vdcModoObs(');
let fG = null;
try { fG = new Function('_projSiglas', 'return (' + zG + ')')(s => String(s||'').split(/\s+/).map(w => w[0]||'').join('').toUpperCase()); } catch(e){}
if (fG) {
  ok('VICINIA DEL CARMEN entra', fG({ name: 'VICINIA DEL CARMEN' }) === true);
  ok('VLA y las demás obras NO', fG({ name: 'VICINIA LAS AMÉRICAS' }) === false && fG({ name: 'TORELO' }) === false);
} else ok('_vdcModoObs evaluable', false);
const zR = ex('function renderRecetaPedir(');
ok('sin receta + VDC ⇒ botón HABILITADO que abre la solicitud por observación',
  /_vdcModoObs\(p\)/.test(zR) && /_vdcPedirEtapaObs\(/.test(zR));
ok('sin VDC el botón sigue deshabilitado (flujo intacto)', /SIN RECETA/.test(zR) && /disabled/.test(zR));
ok('si se carga la receta, manda el flujo normal (hasReceta primero)',
  (function(){ const iH = zR.indexOf('!hasReceta'); const iV = zR.indexOf('_vdcModoObs'); return iH > 0 && iV > iH; })());

console.log('— 2. la solicitud del supervisor —');
const zS = ex('window._vdcPedirEtapaObs = async function');
ok('la observación es OBLIGATORIA', /OBLIGATORIA/.test(zS));
ok('nace como pedido SIN materiales y marcada', /items: \{\}/.test(zS) && /esSolicitudEtapa: true/.test(zS));
ok('con verifTok (v1240), sellada y con subida fuerte',
  /_verifTokenNuevo\(\)/.test(zS) && /_ts: Date\.now\(\)/.test(zS) && /forceUploadNow/.test(zS) && /_pedVerifSubir/.test(zS));
ok('re-lee el state tras el modal (regla v769)', (function(){ const i = zS.indexOf('prConfirm'); return i > 0 && /activeProj\(\)/.test(zS.slice(i)); })());
ok('al crearla lo manda a COMPARTIR (abre el detalle con aviso)', /openPedidoDetalle\(/.test(zS) && /COMPARTILA/.test(zS));

console.log('— 3. compras la arma como pedido formal —');
const zCard = ex('function renderPedidoCard(');
ok('la tarjeta avisa SOLICITUD DE ETAPA y ofrece armarla', /SOLICITUD DE ETAPA/.test(zCard) && /_solEtapaArmarFormal\(/.test(zCard));
ok('la atendida muestra quién la cubre', /solEtapaAtendida/.test(zCard) && /ATENDIDA/.test(zCard));
const zA = ex('window._solEtapaArmarFormal = function');
ok('armar lleva al talonario con la seña de origen', /_solEtapaOrigenId/.test(zA) && /setPedidoTab\('nuevo'\)/.test(zA));
const zSub = ex('async function submitPedido(');
ok('el pedido formal LIGA y marca atendida a la solicitud (sellando ambos)',
  /_solEtapaOrigenId/.test(zSub) && /solEtapaAtendida = \{/.test(zSub) && /origenSolicitudEtapaId/.test(zSub));

console.log('— 4. la atendida se va sola al historial —');
ok('el corte activos/historial la incluye', /pd\.status === 'CANCELADO' \|\| pd\.solEtapaAtendida/.test(html) && /!pd\.solEtapaAtendida/.test(html));

console.log('— 5. la hoja lo dice claro —');
const zDoc = ex('function _solicitudDocHTML(');
ok('banner SOLICITUD DE ETAPA en el documento', /SOLICITUD DE ETAPA — MATERIALES POR CALCULAR EN COMPRAS/.test(zDoc));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
