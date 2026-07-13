/* v900 BLINDAJE DE CUADRITOS DE ETAPA (reporte 08-jul: "la foto ya se guarda pero la marca
   roja de la etapa NO"). a.stages era LWW puro: otro teléfono subiendo su copia (p.ej. al
   confirmar una foto v899) pisaba la marca recién hecha. Fix:
   (1) _mergeEtapasApto: unión por etapa — gana el cambio con stagesTs MÁS NUEVO; sin sellos
       (legacy) la MARCA no se pierde (bias a true); colgado en el walker de _mergeFotosProyecto.
   (2) TODOS los desmarcados sellan stagesTs (antes solo el marcado sellaba — un desmarcado
       jamás le habría ganado el merge a una marca vieja).
   (3) toggleStage fuerza subida inmediata al marcar (los desmarcados ya lo hacían). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const src = extractFn('_mergeEtapasApto');
ok('_mergeEtapasApto existe', !!src);
if (src) {
  const f = new Function(src + '\nreturn _mergeEtapasApto;')();

  // 1) marca local MÁS NUEVA que el remoto sin marca → se rescata (con su sello)
  const la1 = { stages:[true,true,false,false,false,false], stagesTs:[50,100] };
  const ra1 = { stages:[true,false,false,false,false,false], stagesTs:[50] };
  ok('rescata la marca local más nueva', f(la1, ra1)===true && ra1.stages[1]===true && ra1.stagesTs[1]===100);
  ok('idempotente (regla v856)', f(la1, ra1)===false);

  // 2) DESMARCADO remoto más nuevo (gerente) → la marca local vieja NO revive
  const la2 = { stages:[true,true,false,false,false,false], stagesTs:[50,100] };
  const ra2 = { stages:[true,false,false,false,false,false], stagesTs:[50,200] };
  ok('el desmarcado del gerente (sello más nuevo) gana', f(la2, ra2)===false && ra2.stages[1]===false);

  // 3) legacy sin sellos: la MARCA no se pierde (bias a true)
  const la3 = { stages:[true,false,false,false,false,false] };
  const ra3 = { stages:[false,false,false,false,false,false] };
  ok('sin sellos: la marca sobrevive', f(la3, ra3)===true && ra3.stages[0]===true);

  // 4) iguales → false; remoto sin stages → se construye
  ok('iguales no toca nada', f({stages:[true,false,false,false,false,false],stagesTs:[1]}, {stages:[true,false,false,false,false,false],stagesTs:[1]})===false);
  const ra5 = { };
  ok('remoto sin stages: se construye el array', f({stages:[false,false,true,false,false,false],stagesTs:[null,null,77]}, ra5)===true && ra5.stages[2]===true && ra5.stages.length===6);
}

// ── cableado ──
ok('colgado en el walker de fotos (mismo recorrido por apto)', /_mergeEtapasApto === 'function' && _mergeEtapasApto\(laApto, raApto\)/.test(html));
ok('los 4 desmarcados sellan stagesTs', (html.match(/\{ if \(a\.stages\[i\]\) a\.stagesTs\[i\] = _nowD; a\.stages\[i\] = false; \}/g)||[]).length >= 4);
ok('toggleStage fuerza subida al marcar', /function toggleStage\([\s\S]{0,2400}forceUploadNow/.test(html)); // v903: ventana ampliada (el bloqueo del marcado manual del encargado alargó la función)
// v902: la constante SUBE con cada cambio de sync (diseño) — validar >= 900, no el literal
const _asv900 = (html.match(/const APP_SYNC_VERSION = (\d+);/)||[])[1];
ok('APP_SYNC_VERSION >= 900', Number(_asv900) >= 900);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
