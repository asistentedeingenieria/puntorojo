/* v822: (1) mostrar las cuotas en la tarjeta de solicitud de anticipo.
   (2) permiso anticipos.verEstado = SOLO ver el estado de los pedidos (sin pedir/cotizar/
   autorizar/entregar/cancelar). Reusa la maquinaria descuentos-only (_v404b) para mostrar
   únicamente la sub-pestaña ANTICIPOS y, dentro, solo SOLICITUDES en modo lectura. */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
function extractFn(name){ const m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
function extractAssigned(name){ const m=html.indexOf('window.'+name+' = '); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }

const srcRender = extractFn('_antSolicRender');
ok('_antSolicRender existe', !!srcRender);

// ── (1) cuotas en la tarjeta ──
ok('v822 calcula cuotas de la tarjeta (sol.cuotas o regla v416)', /Number\(s\.cuotas\)>0/.test(srcRender) && /_v416CuotasPorMonto/.test(srcRender));
ok('v822 muestra "N cuota(s)" con plural/singular', /' cuota'\+\(_cu===1\?'':'s'\)/.test(srcRender));

// ── (2) permiso anticipos.verEstado ──
ok('v822 permiso anticipos.verEstado en PERMS', /'anticipos\.verEstado'/.test(html));
ok('v822 label del permiso (solo lectura)', /anticipos\.verEstado'[\s\S]{0,80}solo lectura/i.test(html));

const srcSV = extractAssigned('_antSoloVer');
ok('v822 _antSoloVer definido', !!srcSV);
if(srcSV){
  // _antSoloVer usa `can` por CLOSURE (no como parámetro) -> lo inyectamos como param del wrapper.
  const run = (can) => new Function('can','var window={};\n'+srcSV+'\nreturn window._antSoloVer();')(can);
  const mk = (...perms)=>{ const s=new Set(perms); return p=>s.has(p); };
  ok('solo verEstado -> true', run(mk('anticipos.verEstado'))===true);
  ok('verEstado + users.manage -> false', run(mk('anticipos.verEstado','users.manage'))===false);
  ok('verEstado + anticipos.cotizar -> false', run(mk('anticipos.verEstado','anticipos.cotizar'))===false);
  ok('verEstado + anticipos.solicitar -> false', run(mk('anticipos.verEstado','anticipos.solicitar'))===false);
  ok('verEstado + planilla.authorize -> false', run(mk('anticipos.verEstado','planilla.authorize'))===false);
  ok('sin verEstado -> false', run(mk('view.planilla'))===false);
}

// acceso: setView('planilla') deja entrar a verEstado aunque no tenga view.planilla
ok('v822 setView planilla permite anticipos.verEstado', /!can\('view\.planilla'\) && !can\('anticipos\.verEstado'\)/.test(html));
// la pestaña PLANILLAS se muestra para verEstado (override en applyPermissions)
ok('v822 nav-tab PLANILLAS visible para verEstado', /querySelector\('\.tab\[data-view="planilla"\]'\)[\s\S]{0,200}_antSoloVer/.test(html));
// el filtro de pestañas (solo ANTICIPOS) también aplica a verEstado
ok('v822 filtro de sub-pestañas aplica a verEstado', /_v404bEsDescuentosOnly\(\) && !\(typeof window\._antSoloVer/.test(html));
// FIX anti-recursión: el filtro decide con currentPlanillaTab (no con el .active del DOM, que va con retraso)
const srcFiltro = extractAssigned('_v404bAplicarFiltroDescuentosTabs');
ok('v822 el filtro usa currentPlanillaTab (evita recursión infinita al forzar anticipos)', /activeTab = window\.currentPlanillaTab \|\|/.test(srcFiltro) && /VISIBLES\.has\(activeTab\)/.test(srcFiltro));
// dentro de ANTICIPOS, verEstado se fuerza a SOLICITUDES
const srcRPA = extractAssigned('renderPlanillaAnticipos');
ok('v822 renderPlanillaAnticipos fuerza antsolic para verEstado', /_antSoloVer\(\)\)\s*window\._antView='antsolic'/.test(srcRPA));
// la tira interna oculta RESUMEN para verEstado (solo SOLICITUDES)
ok('v822 _antSolicRender oculta RESUMEN para verEstado', /const _soloVer =/.test(srcRender) && /if\(!_soloVer\) html \+= '<button onclick="window\._antView=\\'resumen/.test(srcRender));

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
