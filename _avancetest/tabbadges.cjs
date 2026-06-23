/* v798 (#3): badges de pendientes en pestañas. Número = solicitudes/aprobaciones que
   ESTE usuario debe atender (estado derivado por estado+permiso; se limpia solo al llegar a 0).
   Reusa el patrón del badge de SOLICITUDES (v777). Pinta inline (pill) para no recortarse. */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
function extract(name){ const m=html.indexOf('function '+name+'('); if(m<0){ const w=html.indexOf(name+' = function('); if(w<0) return null; let i=html.indexOf('{',w),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){d--; if(d===0) return 'function '+name+html.slice(html.indexOf('(',w),i+1);}} return null;} let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){d--; if(d===0) return html.slice(m,i+1);}} return null; }

// estructura
ok('tabBadgeHTML existe', html.indexOf('window.tabBadgeHTML')>=0);
ok('CSS .tab-badge', /\.tab-badge\s*\{/.test(html));
ok('_cntAnticipoPend', html.indexOf('window._cntAnticipoPend')>=0);
ok('_cntPagoEtapaPend', html.indexOf('window._cntPagoEtapaPend')>=0);
ok('_cntAdmin358Pend', html.indexOf('window._cntAdmin358Pend')>=0);
ok('_cntPlanillaPend', html.indexOf('window._cntPlanillaPend')>=0);
ok('updateTabBadges', html.indexOf('window.updateTabBadges')>=0);
// spans en el markup
ok('span badge PLANILLAS (top)', html.indexOf('id="tabBadge-planilla"')>=0);
ok('span badge ANTICIPOS (sub)', html.indexOf('id="tabBadge-anticipos"')>=0);
ok('span badge PAGOS POR ETAPA (sub)', html.indexOf('id="tabBadge-etapas"')>=0);
ok('span badge ÓRDENES DE COMPRA (sub)', html.indexOf('id="tabBadge-ordenes"')>=0);
ok('_cntOCsPend gateado por compras.autorizar + status', /_cntOCsPend[\s\S]{0,260}compras\.autorizar[\s\S]{0,400}AUTORIZADA/.test(html));
// contadores suman las fuentes correctas
ok('planilla suma anticipo+pagoetapa+admin358', /_cntPlanillaPend\s*=\s*function\(\)\{[\s\S]{0,200}_cntAnticipoPend\(\)[\s\S]{0,80}_cntPagoEtapaPend\(\)[\s\S]{0,80}_cntAdmin358Pend\(\)/.test(html));
ok('anticipo usa _antSolicPendientesParaMi', /_cntAnticipoPend[\s\S]{0,200}_antSolicPendientesParaMi/.test(html));
ok('pago etapa gateado por gerente + suma desmarcar', /_cntPagoEtapaPend[\s\S]{0,400}_solPagoEtapaPendientes[\s\S]{0,200}desmarcarSolicitudes/.test(html));
ok('admin358 gateado por users.manage + estado PENDIENTE', /_cntAdmin358Pend[\s\S]{0,200}users\.manage[\s\S]{0,160}PENDIENTE/.test(html));
// se refresca en cada render (hook applyPermissions)
ok('updateTabBadges se llama en el pase de permisos', /updateTabBadges\(\)/.test(html) && /data-perm[\s\S]{0,2000}updateTabBadges\(\)/.test(html));

// funcional: tabBadgeHTML (pura)
const body=extract('tabBadgeHTML') || (html.match(/window\.tabBadgeHTML\s*=\s*function\(n\)\{[\s\S]*?\};/)||[null])[0];
ok('tabBadgeHTML extraída', !!body);
if(body){
  const src = body.replace('window.tabBadgeHTML =','var tabBadgeHTML =');
  const fn=new Function(src+'\n return tabBadgeHTML;')();
  ok('n<=0 -> vacío', fn(0)==='' && fn(-2)==='');
  ok('n=5 -> contiene 5 y la clase', fn(5).indexOf('5')>=0 && fn(5).indexOf('tab-badge')>=0);
  ok('n=150 -> 99+', fn(150).indexOf('99+')>=0);
}

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
