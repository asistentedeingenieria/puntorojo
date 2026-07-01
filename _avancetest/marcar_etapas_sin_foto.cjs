/* v865: DESBLOQUEO TEMPORAL del marcado de etapas SIN foto (el proyecto ya va avanzado).
   Antes: solo el gerente (planilla.authorize||users.manage) marcaba sin las 2 fotos; el encargado
   recibía 'block-photos' ("FALTAN LAS 2 FOTOS REQUERIDAS"). Ahora _marcarEtapasSinFoto() (default ON)
   hace que toggleStage trate el marcado como si tuviera fotos para TODOS. Reversible:
   window._PR_MARCAR_SIN_FOTO = false (per-dispositivo) o revertir la línea marcada "v865".
   NO toca permisos (sigue exigiendo can('avance.edit')) ni el candado de DESMARCAR (gerente-only). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── el interruptor ──
const src = extractFn('_marcarEtapasSinFoto');
ok('_marcarEtapasSinFoto existe', !!src);
if (src) {
  const fn = new Function(src + '\nreturn _marcarEtapasSinFoto;')();
  ok('por defecto está LIBRE (true)', fn() === true);
  const off = new Function('var window={_PR_MARCAR_SIN_FOTO:false};' + src + '\nreturn _marcarEtapasSinFoto;')();
  ok('window._PR_MARCAR_SIN_FOTO=false → bloqueado (false)', off() === false);
  const on = new Function('var window={_PR_MARCAR_SIN_FOTO:true};' + src + '\nreturn _marcarEtapasSinFoto;')();
  ok('flag true → libre', on() === true);
}

// ── regresión: _avanceToggleAccion NO cambia su lógica pura ──
const accSrc = extractFn('_avanceToggleAccion');
ok('_avanceToggleAccion existe', !!accSrc);
if (accSrc) {
  const acc = new Function(accSrc + '\nreturn _avanceToggleAccion;')();
  ok('sin fotos y no-gerente → block-photos', acc(false, false, false) === 'block-photos');
  ok('con fotos (o desbloqueo) y no-gerente → mark', acc(false, false, true) === 'mark');
  ok('gerente sin fotos → mark (siempre pudo)', acc(false, true, false) === 'mark');
  ok('ya marcada + no-gerente → locked', acc(true, false, true) === 'locked');
  ok('ya marcada + gerente → unmark', acc(true, true, true) === 'unmark');
}

// ── wiring: toggleStage inyecta el desbloqueo en el arg tienePhotos ──
ok('toggleStage OR-ea _marcarEtapasSinFoto() en tienePhotos',
   html.indexOf('(sinFoto.length === 0) || _marcarEtapasSinFoto()') >= 0);
// ── scope: sigue exigiendo permiso y el candado de desmarcar sigue vivo ──
ok('toggleStage sigue exigiendo avance.edit', /function toggleStage[\s\S]{0,120}can\('avance\.edit'\)/.test(html));
ok('el toast de block-photos sigue existiendo (no se borró la regla)', html.indexOf('FALTAN LAS 2 FOTOS REQUERIDAS') >= 0);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
