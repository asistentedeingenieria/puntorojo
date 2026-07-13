/* v904 (pedido 13-jul, segunda parte):
   (1) CASCADA HACIA ABAJO: cualquier foto subida en la etapa N marca automáticamente las
       etapas ANTERIORES sin marcar (evidencia de etapa superior ⇒ las de abajo ya se
       hicieron — se acabaron los huecos tipo apto 1102: 1,2,4 marcadas y 3 no).
       _autoMarcarEtapaPorFotos ahora devuelve { actual, inferiores }.
   (2) CANDADO SECUENCIAL POR PROYECTO (proyectos nuevos tipo VLA): p.etapasEnOrden=true →
       etapas 1-2 libres, 3+ bloqueadas hasta completar las anteriores (el candado v291
       vuelve, pero POR PROYECTO); los 5 proyectos existentes siguen libres (v863).
       Los proyectos NUEVOS nacen con etapasEnOrden:true. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. cascada hacia abajo ──
const src = extractFn('_autoMarcarEtapaPorFotos');
ok('_autoMarcarEtapaPorFotos existe', !!src);
if (src) {
  const f = new Function(src + '\nreturn _autoMarcarEtapaPorFotos;')();

  // UNA fota en etapa 4 (idx 3) con 1-3 sin marcar → marca las 3 anteriores, la actual pide su 2ª
  const a1 = { photos: { '3': ['u1'] }, stages: [false,false,false,false,false,false] };
  const r1 = f(a1, 3);
  ok('1 foto en superior → anteriores marcadas', r1.inferiores===3 && a1.stages[0] && a1.stages[1] && a1.stages[2]);
  ok('la actual queda pidiendo su 2ª foto', r1.actual==='falta1' && a1.stages[3]===false);
  ok('sella stagesTs de las anteriores (merge v900)', typeof (a1.stagesTs||[])[0]==='number' && typeof (a1.stagesTs||[])[2]==='number');

  // 2 fotos en etapa 3 (idx 2) con la 1 ya marcada → marca la 2 (inferior) y la 3 (actual)
  const a2 = { photos: { '2': ['u1','u2'] }, stages: [true,false,false,false,false,false], stagesTs: [50] };
  const r2 = f(a2, 2);
  ok('2 fotos: marca actual + inferiores faltantes', r2.actual==='marcada' && r2.inferiores===1 && a2.stages[1] && a2.stages[2]);
  ok('la ya marcada no se re-sella', a2.stagesTs[0]===50);

  // sin fotos → no toca nada
  const a3 = { photos: {}, stages: [false,false,false,false,false,false] };
  const r3 = f(a3, 4);
  ok('sin fotos: cero efecto', r3.actual==='sin' && r3.inferiores===0 && !a3.stages.some(Boolean));

  // no marca etapas POSTERIORES
  const a4 = { photos: { '1': ['u1','u2'] }, stages: [true,false,false,false,false,false] };
  const r4 = f(a4, 1);
  ok('nunca marca hacia arriba', r4.actual==='marcada' && a4.stages[2]===false && a4.stages[5]===false);
}

// ── 2. candado secuencial por proyecto ──
const srcOrden = extractFn('_proyectoEtapasEnOrden');
ok('_proyectoEtapasEnOrden existe', !!srcOrden);
if (srcOrden) {
  const g = new Function(srcOrden + '\nreturn _proyectoEtapasEnOrden;')();
  ok('solo con el flag explícito', g({etapasEnOrden:true})===true && g({})===false && g(null)===false && g({etapasEnOrden:'si'})===false);
}
ok('el desbloqueo v863 respeta el candado del proyecto', /_fotosEtapasLibres\(\) && !_proyectoEtapasEnOrden\(p\)/.test(html));
ok('los 3 candados de fotos respetan el orden (render + 2 cámaras)', (html.match(/_fotosEtapasLibres\(\) && !_proyectoEtapasEnOrden\(/g)||[]).length >= 3);
ok('los proyectos nuevos nacen EN ORDEN', /towers: \[\],\s*\n\s*etapasEnOrden: true/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
