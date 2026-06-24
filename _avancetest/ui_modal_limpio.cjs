/* v822b: limpieza del modal de fotos (pedido del user).
   - quitar el subtítulo bajo el título (TORRE·NIVEL·APTO).
   - quitar "UMBRAL ≥X% · ALCANZADA/PENDIENTE" de cada etapa (deja solo el aviso de bloqueo).
   - quitar "MÍNIMO 2 PARA COMPLETAR ETAPA" del cuadro de foto. */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
function extractFn(name){ const m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
const src=extractFn('renderPhotosModal');
ok('renderPhotosModal existe', !!src);

// subtítulo eliminado (ya no setea el texto largo; se oculta)
ok('subtítulo bajo el título eliminado', !/Cada etapa requiere 2 fotos/.test(src));
ok('subtítulo se oculta (display none)', /photosSubtitle[\s\S]{0,120}display\s*=\s*'none'/.test(src) || /photosSubtitle'\)\.style\.display='none'/.test(src));

// UMBRAL / ALCANZADA fuera de cada etapa
ok('sin "Umbral ≥" en la etapa', !/Umbral ≥/.test(src));
ok('sin "ALCANZADA" en la etapa', !/ALCANZADA/.test(src));
// el aviso de bloqueo se conserva (es útil)
ok('conserva "TERMINAR LA ETAPA ANTERIOR PRIMERO"', /TERMINAR LA ETAPA ANTERIOR PRIMERO/.test(src));

// "MÍNIMO 2 PARA COMPLETAR ETAPA" fuera del cuadro de foto
ok('sin "PARA COMPLETAR ETAPA" en el cuadro de foto', !/PARA COMPLETAR ETAPA/.test(src));

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
