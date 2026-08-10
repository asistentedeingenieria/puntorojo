/* v1064 — INCIDENTE ESSENZA 30-jul: 54 pagos AUTORIZADOS del 16-jul reaparecieron como
   armables en la planilla nueva (se sumaban otra vez). Diagnóstico con datos de Antonio:
   todos SIN pg.planillaId. CAUSA RAÍZ: el merge de pagos es _mergeById de objeto ENTERO
   por _ts — una copia sin sello con _ts más nuevo GANA y borra el planillaId (CUARTA
   mordida del patrón: cobro v953, pedidos v972, facturas OC v1039).

   FIX: el sello es DERIVABLE — la planilla armada siempre conoce sus pagos (pl.pagosIds).
   _planillaSelloSelfHeal re-estampa todo pago sin sello que viva en los pagosIds de una
   planilla armada NO-rechazada. Idempotente (regla v854-856: si no, bucle de re-sync).
   ⚠️ Las RECHAZADAS se saltan: liberarPagosPlanillaRechazada borra el sello A PROPÓSITO
   para que esos pagos vuelvan a armarse. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zH = ex('function _planillaSelloSelfHeal(');
ok('existe', zH.length > 400);
let heal = null;
try { heal = new Function('return (' + zH + ')')(); } catch(e){ console.log('extract err', e.message); }
ok('extraíble', typeof heal === 'function');

if (heal) {
  const mk = () => ({ planilla: {
    planillasArmadas: [
      { id: 'pl-vieja', estado: 'aprobada', fechaCreacion: 100, pagosIds: ['pg-1', 'pg-2', 'pg-doble'] },
      { id: 'pl-rech', estado: 'rechazada', fechaCreacion: 200, pagosIds: ['pg-lib'] },
      { id: 'pl-nueva', estado: 'pendiente_pm', fechaCreacion: 300, pagosIds: ['pg-doble'] },
    ],
    pagos: [
      { id: 'pg-1', autorizado: true },                       // perdió el sello → se re-estampa
      { id: 'pg-2', autorizado: true, planillaId: 'pl-vieja' }, // sello intacto → no se toca
      { id: 'pg-lib', autorizado: true },                      // liberado de una RECHAZADA → NO tocar
      { id: 'pg-doble', autorizado: true },                    // en dos planillas → gana la más nueva
      { id: 'pg-suelto', autorizado: true },                   // en ninguna → no se toca
    ]
  }});
  const p = mk();
  const changed = heal(p);
  const g = id => p.planilla.pagos.find(x => x.id === id);
  ok('reporta cambio', changed === true);
  ok('el sello perdido se re-estampa (con estado y _ts)', g('pg-1').planillaId === 'pl-vieja' && g('pg-1').estadoPlanilla === 'aprobada' && g('pg-1')._ts > 0);
  ok('el sello intacto no se toca', g('pg-2').planillaId === 'pl-vieja' && !g('pg-2')._ts);
  ok('el liberado de una RECHAZADA queda libre', !g('pg-lib').planillaId);
  ok('con dos planillas gana la más nueva no-rechazada', g('pg-doble').planillaId === 'pl-nueva');
  ok('el pago de ninguna planilla no se toca', !g('pg-suelto').planillaId);
  ok('idempotente (segunda corrida no cambia nada)', heal(p) === false);
  ok('sin planilla no truena', heal({}) === false && heal(null) === false);
}

console.log('\n— enganches —');
/* en el merge multi-dispositivo (donde se PIERDE el sello) y al pintar la planilla */
ok('corre dentro de _mergePlanillaProyecto y pide re-subida', /_planillaSelloSelfHeal\(rp\)[\s\S]{0,60}changed = true/.test(ex('function _mergePlanillaProyecto(')));
ok('corre al entrar a la planilla (curación local)', /_planillaSelloSelfHeal\(/.test(ex('window.renderPlanilla = function')));
/* v1164: el rango 92[2-9] se quedó corto al llegar a 930 — sin literal, el invariante es
   AL MENOS 922 (la versión en que este cambio de sync entró). Cuarta vez que muerde. */
ok('cambio de sync ⇒ versión nueva (ritual v892)', (Number((html.match(/APP_SYNC_VERSION = (\d+)/) || [])[1]) || 0) >= 922);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
