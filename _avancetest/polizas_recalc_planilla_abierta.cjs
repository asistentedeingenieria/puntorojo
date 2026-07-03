/* v890: las liquidaciones NO autorizadas se auto-actualizan cuando cambia el catálogo de pólizas.
   Caso real: a Víctor se le dio de baja una póliza DESPUÉS de armar la planilla y el descuento
   siguió diciendo "PÓLIZAS · 4 ACTIVAS" (Q179.80) en vez de 3 (Q134.85).
   Causa raíz: (a) aprobarSolicitudPoliza no llamaba resyncDescuentosAbiertas (los mutadores
   directos sí); (b) sin auto-curación: si esa única corrida diferida falla o la pisa el sync,
   la planilla queda stale para siempre (el gate v412 del render no recalcula).
   Fix: _polRecalcPlanillaPolizas (SOLO pólizas — no toca anticipos, respeta los quitados con ✕,
   idempotente regla v856) + _polSelfHealPolizas en el render de planillas + hook en la solicitud. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const src = extractFn('_polRecalcPlanillaPolizas');
ok('_polRecalcPlanillaPolizas existe', !!src);
const f = src ? new Function(src + '\nreturn _polRecalcPlanillaPolizas;')() : null;

const V = 'VICTOR ERNESTO SALAZAR RAMOS';
function mk(over){
  over = over || {};
  const st = {
    polizasGlobales: over.polizas || [
      { id:'pa', estatus:'ACTIVA', aCargoDeNombre:V, aseguradoNombre:'ANDERSON' },
      { id:'pb', estatus:'ACTIVA', aCargoDeNombre:V, aseguradoNombre:'VICTOR E' },
      { id:'pc', estatus:'EN PROCESO', aCargoDeNombre:V, aseguradoNombre:'VICTOR R' },
      { id:'pd', estatus:'CANCELADA', aCargoDeNombre:V, aseguradoNombre:'MARCOS' },
    ],
    polizasConfig: over.cfg,
    anticiposGlobales: over.anticipos || [ { id:'ant1', colaboradorNombre:V, montoTotal:1000, cantidadCuotas:5, desc:'LIJADORA' } ],
  };
  const pl = Object.assign({
    id:'plV', estado:'pendiente_pm', autoDescuentos:true, pagosIds:['pg1'],
    descuentosPlanilla: over.descuentos !== undefined ? over.descuentos : [
      { id:'d1', subtipo:'POLIZA', desc:'PÓLIZAS · 4 ACTIVAS', monto:179.80, colaboradorNombre:V, polizaIds:['pa','pb','pc','pd'], polizasCount:4, autoAplicado:true, bloqueado:true },
    ],
  }, over.pl || {});
  const pr = { id:'prj1', planilla: { pagos: over.pagos || [ { id:'pg1', colaborador:V, colaboradorId:'c1' } ], planillasArmadas:[pl] } };
  return { st, pl, pr };
}

if (f) {
  // 1) caso Víctor: 4 → 3 activas (una CANCELADA) actualiza monto/conteo/ids/desc
  let s = mk();
  let changed = f(s.pl, s.pr, s.st, {});
  const d1 = s.pl.descuentosPlanilla.find(d=>d.subtipo==='POLIZA');
  ok('cambio detectado (4→3)', changed === true);
  ok('monto recalculado 3×44.95', d1 && d1.monto === 134.85);
  ok('conteo y texto actualizados', d1 && d1.polizasCount === 3 && d1.desc === 'PÓLIZAS · 3 ACTIVAS');
  ok('la cancelada salió de polizaIds', d1 && d1.polizaIds.join(',') === 'pa,pb,pc');
  // 2) idempotente: segunda corrida no cambia nada (regla v856)
  ok('idempotente (2a corrida sin cambios)', f(s.pl, s.pr, s.st, {}) === false);
  // 3) no toca anticipos: no re-agrega el que se quitó con ✕
  ok('NO re-agrega anticipos quitados', !s.pl.descuentosPlanilla.some(d=>d.anticipoId || d.subtipo==='PRESTAMO_PERSONAL'));

  // 4) 0 activas → quita el descuento POLIZA, deja el resto intacto
  s = mk({ polizas:[ { id:'pd', estatus:'CANCELADA', aCargoDeNombre:V } ],
    descuentos:[
      { id:'d1', subtipo:'POLIZA', desc:'PÓLIZAS · 4 ACTIVAS', monto:179.80, colaboradorNombre:V, polizaIds:['pd'], polizasCount:4, autoAplicado:true },
      { id:'d2', subtipo:'PRESTAMO_PERSONAL', desc:'LIJADORA', monto:326.76, colaboradorNombre:V, anticipoId:'ant1', autoAplicado:true },
    ] });
  changed = f(s.pl, s.pr, s.st, {});
  ok('0 activas → POLIZA removido', changed === true && !s.pl.descuentosPlanilla.some(d=>d.subtipo==='POLIZA'));
  ok('el ANTICIPO existente queda intacto', s.pl.descuentosPlanilla.some(d=>d.anticipoId==='ant1'));

  // 5) póliza nueva sin descuento previo → lo agrega (1 activa = formato PÓLIZA SEGURO)
  s = mk({ polizas:[ { id:'px', estatus:'ACTIVA', aCargoDeNombre:V, aseguradoNombre:'ASEG X' } ], descuentos:[] });
  changed = f(s.pl, s.pr, s.st, {});
  const dNew = s.pl.descuentosPlanilla.find(d=>d.subtipo==='POLIZA');
  ok('póliza nueva → descuento agregado', changed === true && !!dNew && dNew.monto === 44.95);
  ok('formato 1 póliza + campos de auto', dNew && dNew.desc === 'PÓLIZA SEGURO · ASEG X' && dNew.autoAplicado === true && dNew.bloqueado === true);

  // 6) montoDefault custom
  s = mk({ cfg:{ montoDefault: 50 } });
  f(s.pl, s.pr, s.st, {});
  ok('respeta polizasConfig.montoDefault', s.pl.descuentosPlanilla.find(d=>d.subtipo==='POLIZA').monto === 150);

  // 7) dueña de otra planilla → el descuento se quita acá (dedup v465)
  s = mk();
  const normV = V; // clave normalizada = el mismo nombre en mayúsculas sin tildes
  changed = f(s.pl, s.pr, s.st, { [normV]: 'OTRA-PLANILLA' });
  ok('no dueña → POLIZA removido', changed === true && !s.pl.descuentosPlanilla.some(d=>d.subtipo==='POLIZA'));

  // 8) planilla sin autoDescuentos → no se toca (eso lo maneja el fallback v412)
  s = mk({ pl:{ autoDescuentos:false } });
  ok('autoDescuentos!==true → intacta', f(s.pl, s.pr, s.st, {}) === false && s.pl.descuentosPlanilla[0].monto === 179.80);

  // 9) persona con descuento pero SIN pago en la planilla → se quita
  s = mk({ pagos:[ { id:'pgX', colaborador:'OTRA PERSONA DISTINTA' } ] });
  s.pl.pagosIds = ['pgX'];
  changed = f(s.pl, s.pr, s.st, {});
  ok('sin pago en la planilla → POLIZA removido', changed === true && !s.pl.descuentosPlanilla.some(d=>d.subtipo==='POLIZA'));

  // 10) pago PREAPP no genera descuento
  s = mk({ pagos:[ { id:'pg1', colaborador:'PRE-APP' } ], descuentos:[] });
  ok('PREAPP no agrega', f(s.pl, s.pr, s.st, {}) === false && s.pl.descuentosPlanilla.length === 0);

  // 11) GUARD (revisión adversarial): catálogo de pólizas VACÍO/anómalo → NO tocar nada
  //     (espejo del guard _catalogoTieneData de _v411; sin esto un state a medias
  //      borraría todos los descuentos POLIZA y subiría el borrado — clase v856)
  s = mk({ polizas: [] });
  ok('catálogo vacío → intacta (no borra)', f(s.pl, s.pr, s.st, {}) === false && s.pl.descuentosPlanilla.length === 1);
  s = mk(); delete s.st.polizasGlobales;
  ok('catálogo ausente → intacta (no borra)', f(s.pl, s.pr, s.st, {}) === false && s.pl.descuentosPlanilla.length === 1);

  // 12) GUARD: pagosIds poblado pero ningún pago encontrado (pr equivocado / state a medias) → NO tocar
  s = mk({ pagos: [] });
  ok('pagos no encontrados → intacta (no borra)', f(s.pl, s.pr, s.st, {}) === false && s.pl.descuentosPlanilla.length === 1);

  // 13) duplicados POLIZA de la misma persona → colapsa a 1 y cura el que queda
  s = mk({ descuentos:[
    { id:'dA', subtipo:'POLIZA', desc:'PÓLIZAS · 4 ACTIVAS', monto:179.80, colaboradorNombre:V, polizaIds:['pa','pb','pc','pd'], polizasCount:4, autoAplicado:true },
    { id:'dB', subtipo:'POLIZA', desc:'PÓLIZAS · 4 ACTIVAS', monto:179.80, colaboradorNombre:V, polizaIds:['pa','pb','pc','pd'], polizasCount:4, autoAplicado:true },
  ] });
  changed = f(s.pl, s.pr, s.st, {});
  const polRows = s.pl.descuentosPlanilla.filter(d=>d.subtipo==='POLIZA');
  ok('duplicado colapsado a 1 y curado', changed === true && polRows.length === 1 && polRows[0].monto === 134.85);
}

// ── blindaje de _v411 contra entradas null del catálogo (hallazgo de la revisión) ──
ok('_v411 filtra pólizas null (no revienta)', /polizasGlobales\|\|\[\]\)\.filter\(po => \{\r?\n\s*if \(!po \|\| \(po\.estatus !== 'ACTIVA' && po\.estatus !== 'EN PROCESO'\)\) return false;/.test(html));

// ── self-heal + integración (estructural) ──
const sh = html.indexOf('window._polSelfHealPolizas = function(');
ok('_polSelfHealPolizas existe', sh >= 0);
const shBody = sh >= 0 ? html.slice(sh, html.indexOf('};', html.indexOf('return dirty;', sh)) + 2) : '';
ok('self-heal solo toca estados abiertos', shBody.indexOf('pendiente_pm') >= 0 && shBody.indexOf('aprobada_inicial') >= 0 && shBody.indexOf('pendiente_pm_final') >= 0);
ok('self-heal guarda y sube solo si hubo cambios', shBody.indexOf('if (dirty > 0)') >= 0 && shBody.indexOf('forceUploadNow') >= 0);
ok('el render de planillas llama el self-heal', /catch\(e\)\{ console\.warn\('\[v412 mobile\] bloque auto-apply on render error:', e\); \}\s*\n\s*\/\/ v890[^\n]*\n\s*try \{ if \(window\._polSelfHealPolizas\) window\._polSelfHealPolizas\(\); \} catch\(e\)\{/.test(html));
ok('aprobarSolicitudPoliza ahora resincroniza', /_marcarProcesadaPol\(sol, 'APROBADA', null\);\s*\n\s*try \{ if \(window\.resyncDescuentosAbiertas\) window\.resyncDescuentosAbiertas\(\); \} catch/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
