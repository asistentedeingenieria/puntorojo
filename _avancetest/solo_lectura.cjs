/* v866: usuario SOLO LECTURA — VE TODO, NO MODIFICA NADA. Token de permiso 'view.*'.
   - can(): true para vistas/KPIs y para los perms que solo HACEN VISIBLE una pestaña sensible
     (pólizas/gerencia/OC/anticipos), false para toda ACCIÓN.
   - Candado de escritura (garantía dura): saveState y CloudSync.uploadCurrent/uploadAsistencia
     no hacen NADA para un usuario solo-lectura → aunque un botón se colara, no persiste nada.
   - Preset de un clic "SOLO LECTURA" en GESTIONAR USUARIOS (mutuamente excluyente con ADMINISTRADOR). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── construir un harness de can()/isReadOnly con getCurrentUser inyectado ──
const arrMatch = html.match(/var _PERMS_SOLO_VER = \[[^\]]*\];/);
ok('_PERMS_SOLO_VER declarado', !!arrMatch);
const permVerSrc = extractFn('_permEsSoloVer');
const canSrc = extractFn('can');
const roSrc = extractFn('isReadOnly');
ok('_permEsSoloVer existe', !!permVerSrc);
ok('isReadOnly existe', !!roSrc);

if (arrMatch && permVerSrc && canSrc && roSrc) {
  const base = arrMatch[0] + '\n' + permVerSrc + '\n' + canSrc + '\n' + roSrc;
  const make = (user) => new Function('__U', 'function getCurrentUser(){return __U;}\n' + base + '\nreturn {can:can,isReadOnly:isReadOnly};')(user);

  // pura: _permEsSoloVer
  const pv = new Function(arrMatch[0] + '\n' + permVerSrc + '\nreturn _permEsSoloVer;')();
  ok('permEsSoloVer: view.dashboard → true', pv('view.dashboard')===true);
  ok('permEsSoloVer: kpis.avance → true', pv('kpis.avance')===true);
  ok('permEsSoloVer: polizas.edit (visibilidad) → true', pv('polizas.edit')===true);
  ok('permEsSoloVer: personal.gerencia (visibilidad) → true', pv('personal.gerencia')===true);
  ok('permEsSoloVer: compras.autorizar (visibilidad OC) → true', pv('compras.autorizar')===true);
  ok('permEsSoloVer: anticipos.verEstado → true', pv('anticipos.verEstado')===true);
  ok('permEsSoloVer: avance.edit → false', pv('avance.edit')===false);
  ok('permEsSoloVer: personal.add → false', pv('personal.add')===false);
  ok('permEsSoloVer: users.manage → false', pv('users.manage')===false);
  ok('permEsSoloVer: planilla.generate → false', pv('planilla.generate')===false);
  ok('permEsSoloVer: data.import → false', pv('data.import')===false);

  // solo-lectura
  const ro = make({ perms:['view.*'] });
  ok('RO: isReadOnly true', ro.isReadOnly()===true);
  ok('RO: ve dashboard', ro.can('view.dashboard')===true);
  ok('RO: ve KPIs', ro.can('kpis.planilla')===true);
  ok('RO: ve gerencia', ro.can('personal.gerencia')===true);
  ok('RO: ve pólizas', ro.can('polizas.edit')===true);
  ok('RO: ve planillas', ro.can('view.planilla')===true);
  ok('RO: NO marca avance', ro.can('avance.edit')===false);
  ok('RO: NO agrega personal', ro.can('personal.add')===false);
  ok('RO: NO gestiona usuarios', ro.can('users.manage')===false);
  ok('RO: NO genera planilla', ro.can('planilla.generate')===false);

  // admin intacto
  const ad = make({ perms:['*'] });
  ok('admin: isReadOnly false', ad.isReadOnly()===false);
  ok('admin: puede todo', ad.can('avance.edit')===true && ad.can('users.manage')===true);

  // usuario normal intacto
  const nm = make({ perms:['view.avance','avance.edit'] });
  ok('normal: isReadOnly false', nm.isReadOnly()===false);
  ok('normal: ve y edita su módulo', nm.can('view.avance')===true && nm.can('avance.edit')===true);
  ok('normal: NO ve gerencia', nm.can('personal.gerencia')===false);

  // sin usuario
  const nil = make(null);
  ok('sin usuario: can false', nil.can('view.dashboard')===false);
  ok('sin usuario: isReadOnly false', nil.isReadOnly()===false);
}

// ── candado de escritura (estructural) ──
ok('saveState bloquea escritura en solo-lectura', /function saveState\(\)\{\s*if\s*\(\s*isReadOnly\(\)\s*\)/.test(html));
ok('uploadCurrent bloquea en solo-lectura', /async uploadCurrent\(\)\{\s*if\s*\([^)]*isReadOnly\(\)/.test(html));
ok('uploadAsistencia bloquea en solo-lectura', /async uploadAsistencia\(\)\{\s*if\s*\([^)]*isReadOnly\(\)/.test(html));

// ── preset en el modal de usuarios (estructural) ──
ok('checkbox SOLO LECTURA en el modal', html.indexOf('id="euSoloLectura"') >= 0);
ok('toggle mutuamente excluyente', html.indexOf('function toggleEuSoloLectura(') >= 0);
ok('saveUser arma perms [view.*]', html.indexOf("isSoloLectura ? ['view.*']") >= 0);
ok('openEditUser pre-marca SOLO LECTURA', /euSoloLectura'\)\s*;?\s*if\s*\(_roEl\)/.test(html) || html.indexOf('_roEl.checked') >= 0);

// ── fuga de Storage tapada: gerencia (única alcanzable vía personal.gerencia, visible en RO) ──
ok('uploadGerenciaDPI bloquea en solo-lectura', /uploadGerenciaDPI[\s\S]{0,140}isReadOnly\(\)/.test(html));
ok('_saveGerencia bloquea en solo-lectura', /function _saveGerencia\(id\)\{[\s\S]{0,160}isReadOnly\(\)/.test(html));
ok('_eliminarGerencia bloquea en solo-lectura', /function _eliminarGerencia\(id\)\{[\s\S]{0,160}isReadOnly\(\)/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
