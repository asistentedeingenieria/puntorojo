/* v1266 (Antonio, 20-ago, dos reportes sobre PROYECTOS VARIOS):
   1. "Subí este pedido y NO le sale a la de compras": el panel de VARIOS estaba en la
      lista de isUserBusy — mientras compras lo tuviera abierto, TODO applyRemote se
      posponía y nada le entraba (el panel de COMPRAS salió de esa lista en v961; el de
      varios quedó adentro). Sale de la lista (sus acciones ya re-leen el state vivo,
      patrón _ctx.cont v1002-08) y applyRemote lo REPINTA al llegar datos (linaje
      v1058/v1068/v1248), sin input enfocado.
   2. "ESSENSA vs ESSENZA — no lo agarra en el mismo proyecto y el correlativo se parte":
      la agrupación y el contador van por NOMBRE. Canon fonético (_obraVariosCanon:
      sin tildes, sin H, Z≈S, B≈V, LL≈Y) contra las obras EXISTENTES al crear un pedido
      MANUAL; si suena igual con otra escritura, prConfirm "¿ES LA MISMA OBRA?" y al
      unificar usa el nombre existente (grupo + correlativo siguen). Nunca silencioso.
      Regla v769: activeProj() se lee DESPUÉS del await del confirm. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— 1. el panel de VARIOS ya no congela el sync —');
const zB = ex('isUserBusy(){');
ok('salió de la lista de ocupado (el SELECTOR ya no lo incluye; el comentario lo documenta)',
  !/querySelector\('[^']*_variosPanelModal/.test(zB));
const iA = html.indexOf('applyRemote(remoteData, opts = {})');
const zA = html.slice(iA, html.indexOf('flushPendingRender()', iA));
ok('applyRemote repinta el panel de VARIOS abierto (sin input enfocado)',
  /_variosPanelModal/.test(zA) && /_abrirPanelVarios/.test(zA));

console.log('— 2. el canon fonético —');
const zC = ex('function _obraVariosCanon(');
let f = null;
try { f = new Function('return (' + zC + ')')(); } catch(e){}
if (f) {
  ok('ESSENSA suena igual que ESSENZA', f('ESSENSA FASE 1') === f('ESSENZA FASE 1'));
  ok('con tildes y espacios de más también', f('  éssenza  fase 1 ') === f('ESSENSA FASE 1'));
  ok('B≈V y sin H', f('VILLA HERMOSA') === f('BILLA ERMOSA'));
  ok('obras distintas NO se confunden', f('ESSENZA FASE 1') !== f('ESSENZA FASE 2'));
} else ok('_obraVariosCanon evaluable', false);

console.log('— 3. el confirm al crear pedido MANUAL —');
const zS = ex('async function submitPedido(');
ok('busca una obra existente que suene igual', /_obraVariosParecida/.test(zS) && /ES LA MISMA OBRA/.test(zS));
ok('unificar usa el nombre EXISTENTE (grupo y correlativo siguen)', /proyectoManualFinal = _igual/.test(zS.replace(/\s+/g, ' ')));
ok('activeProj() se lee DESPUÉS del await del confirm (regla v769)',
  (function(){ const a = zS.indexOf('_obraVariosParecida'); const b = zS.indexOf('const p = activeProj()'); return a > 0 && b > a; })());

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
