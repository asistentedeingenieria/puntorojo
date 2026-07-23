/* v958 (pedido de Antonio 22-jul): permisos GRANULARES de solo lectura para LIQUIDACIÓN
   PROVEEDORES — el admin marca por usuario QUÉ sub-pestañas puede VER (sin editar nada;
   los DESCARGAR PDF funcionan). 4 permisos nuevos: planilla.verEtapas / verRetenciones /
   verAvance / verResumen. El rol aplica SOLO si el acceso viene exclusivamente de esos
   permisos: cualquier permiso de edición, view.planilla explícito o el SOLO LECTURA
   global (view.*) conservan la vista completa. Patrón v822 (anti-recursión con
   window.currentPlanillaTab). La pestaña principal se abre sola por la regla implícita
   de can(): tener planilla.ver* pasa view.planilla. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFrom(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. los 4 permisos en el catálogo de USUARIOS ──
ok('permiso verEtapas', /key:'planilla\.verEtapas'/.test(html));
ok('permiso verRetenciones', /key:'planilla\.verRetenciones'/.test(html));
ok('permiso verAvance', /key:'planilla\.verAvance'/.test(html));
ok('permiso verResumen', /key:'planilla\.verResumen'/.test(html));

// ── 2. el predicado PURO de tabs permitidas ──
const src = extractFrom('window._v958TabsPermitidas = function');
ok('_v958TabsPermitidas existe', !!src);
let fn = null;
try { fn = new Function('return (function' + src.slice(src.indexOf('(')) + ')')(); } catch(e){}
ok('_v958TabsPermitidas evaluable', typeof fn === 'function');
if (typeof fn === 'function') {
  ok('solo verAvance => solo la pestaña reporte', JSON.stringify(fn(['planilla.verAvance'])) === JSON.stringify(['reporte']));
  ok('dos permisos => dos pestañas en orden', JSON.stringify(fn(['planilla.verResumen','planilla.verEtapas'])) === JSON.stringify(['etapas','resumenpersona']));
  ok('con permiso de edición => vista completa (null)', fn(['planilla.verAvance','planilla.generate']) === null);
  ok('con view.planilla explícito => vista completa', fn(['planilla.verAvance','view.planilla']) === null);
  ok('SOLO LECTURA global (view.*) => vista completa v866', fn(['planilla.verAvance','view.*']) === null);
  ok('admin => vista completa', fn(['planilla.verAvance','*']) === null);
  ok('sin ver-perms => null', fn(['view.cobro']) === null);
}

// ── 3. el filtro se aplica en injectPlanillaTabs con anti-recursión v822 ──
const zInj = extractFrom('function injectPlanillaTabs()');
ok('injectPlanillaTabs llama al filtro v958', /_v958AplicarFiltroVerTabs/.test(zInj));
const zFil = extractFrom('window._v958AplicarFiltroVerTabs = function');
ok('el filtro decide con window.currentPlanillaTab (anti-recursión v822)', /window\.currentPlanillaTab/.test(zFil));
ok('el filtro salta a la primera pestaña permitida', /setPlanillaTab\(permitidas\[0\]\)/.test(zFil));

// ── 4. la regla implícita de can() deja pasar view.planilla con solo planilla.ver* ──
const canSrc = extractFrom('function can(perm)');
let canFn = null;
try { canFn = new Function('getCurrentUser', '_permEsSoloVer', 'return (' + canSrc + ')')(
  () => ({ perms: ['planilla.verAvance'] }),
  () => false
); } catch(e){}
ok('can() evaluable', typeof canFn === 'function');
if (typeof canFn === 'function') {
  ok('usuario con solo planilla.verAvance ENTRA a la pestaña principal', canFn('view.planilla') === true);
  ok('...pero NO puede generar pagos', canFn('planilla.generate') === false);
  ok('...ni gestionar usuarios', canFn('users.manage') === false);
}

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
