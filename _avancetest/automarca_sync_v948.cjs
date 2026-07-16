/* v948 (reporte de Antonio 16-jul): VLA · T4 · N11 · apto 1104 tenía las etapas 4 y 5
   con "COMPLETA · 2 FOTOS" y el cuadrito SIN marcar (gris). Causa raíz: la regla v903
   (_autoMarcarEtapaPorFotos) solo corre en los 3 flujos de SUBIDA local; las fotos que
   llegan por SYNC (merge v897) jamás se re-evaluaban, y el encargado no puede marcar
   manual (bloqueo v903) => etapa huérfana para siempre.
   Fix: _reevalAutoMarcaApto(a) — re-evaluación PURA e idempotente cableada dentro de
   _mergeFotosProyecto (corre en cada applyRemote): marca lo que las fotos justifican
   (2 propias, o >=1 en etapa superior = cascada v904), SALVO que exista un sello
   stagesTs más nuevo que la evidencia (desmarcado manual del gerente se respeta). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. la función existe y es evaluable ──
const src = extractFn('_reevalAutoMarcaApto');
ok('_reevalAutoMarcaApto existe', !!src);
let fn = null;
try { fn = new Function('return (' + src + ')')(); } catch(e){}
ok('_reevalAutoMarcaApto evaluable', typeof fn === 'function');

if (typeof fn === 'function') {
  // ── 2. el caso 1104: etapas 4 y 5 con 2 fotos, sin sello => se marcan solas ──
  const apto = () => ({
    stages: [true,true,true,false,false,false],
    stagesTs: [10,20,30],
    photos: { '3': ['u1','u2'], '4': ['u3','u4'] },
    photoTs: { '3': [1000,1100], '4': [1200,1300] }
  });
  let a = apto();
  const n = fn(a);
  ok('marca las 2 etapas huérfanas', n === 2 && a.stages[3] === true && a.stages[4] === true);
  ok('sella stagesTs al marcar', Number(a.stagesTs[3]) > 0 && Number(a.stagesTs[4]) > 0);
  ok('no marca la etapa 6 sin fotos', a.stages[5] === false);
  ok('idempotente: segunda pasada no cambia nada', fn(a) === 0);

  // ── 3. respeta el desmarcado manual del gerente (sello más nuevo que las fotos) ──
  a = apto();
  a.stagesTs[3] = 5000; // gerente desmarcó DESPUÉS de las fotos (fotos ts <= 1300)
  const n2 = fn(a);
  ok('respeta desmarcado posterior a las fotos', a.stages[3] === false && n2 === 1);
  a = apto();
  a.stagesTs[3] = 5000;
  a.photoTs['3'] = [6000, 6100]; // fotos NUEVAS despues del desmarcado
  fn(a);
  ok('fotos más nuevas que el desmarcado vuelven a marcar', a.stages[3] === true);

  // ── 4. cascada v904: >=1 foto en etapa superior marca las de abajo ──
  a = { stages: [false,false,false,false,false,false], photos: { '4': ['u1'] }, photoTs: { '4': [2000] } };
  const n3 = fn(a);
  ok('cascada: foto en etapa 5 marca las etapas 1-4', n3 === 4 && a.stages[0] && a.stages[1] && a.stages[2] && a.stages[3]);
  ok('cascada: la etapa 5 misma NO se marca con 1 sola foto', a.stages[4] === false);

  // ── 5. fotos legacy sin photoTs igual curan; un sello cualquiera las vence ──
  a = { stages: [false,false,false,false,false,false], photos: { '0': ['u1','u2'] } };
  fn(a);
  ok('fotos sin timestamp curan etapas nunca selladas', a.stages[0] === true);
  a = { stages: [false,false,false,false,false,false], stagesTs: [999], photos: { '0': ['u1','u2'] } };
  fn(a);
  ok('fotos sin timestamp NO vencen un sello existente', a.stages[0] === false);

  // ── 6. robustez ──
  ok('apto sin fotos no truena', fn({ stages:[false,false,false,false,false,false] }) === 0);
  ok('apto null no truena', fn(null) === 0);
}

// ── 7. cableado: _mergeFotosProyecto re-evalúa cada apto tras unir fotos y cuadritos ──
const mergeSrc = extractFn('_mergeFotosProyecto');
ok('_mergeFotosProyecto llama _reevalAutoMarcaApto sobre el apto unido', /_reevalAutoMarcaApto\(raApto\)/.test(mergeSrc));
const iMerge = mergeSrc.indexOf('_mergeEtapasApto');
ok('la re-evaluación corre DESPUÉS del merge de cuadritos', iMerge > -1 && mergeSrc.indexOf('_reevalAutoMarcaApto', iMerge) > iMerge);
ok('la re-evaluación cuenta como cambio (propaga por needsResync)', /chg = true/.test(mergeSrc.slice(mergeSrc.indexOf('_reevalAutoMarcaApto'))));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
