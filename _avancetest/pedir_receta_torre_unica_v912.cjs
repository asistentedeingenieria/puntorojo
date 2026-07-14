/* v912 (causa raíz del "panel en blanco" de PEDIR DE RECETA en VLA):
   _resetAllCollapsibles (punto 7) colapsa TODAS las torres al cambiar de sub-pestaña
   ("política unificada" de la app). En un proyecto de TORRE ÚNICA (VLA) eso deja la
   grilla reducida a una sola barra colapsada (561 chars — verificado contra el
   diagnóstico de Antonio) → parece un panel vacío.
   Fix: con UNA sola torre la grilla se renderiza SIEMPRE expandida (el colapso por
   torre solo aplica cuando hay 2+ torres, donde sí ayuda a navegar). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

function mkEnv(collapsedIds){
  return 'var __out={html:\'\'};'
    + 'var document={getElementById:function(id){ if(id===\'recetaPedirContent\') return { set innerHTML(v){ __out.html=v; }, get innerHTML(){ return __out.html; } }; return null; },querySelectorAll:function(){return [];}};'
    + 'var localStorage={getItem:function(){ return JSON.stringify(' + JSON.stringify(collapsedIds) + '); },setItem:function(){}};'
    + 'function escapeAttr(s){ return String(s); }'
    + 'function showToast(){}'
    + 'var console={error:function(){}};';
}
const nivel = (id, n) => ({ id, name:'NIVEL 0'+n, aptos:[{id:'a-'+n+'01',name:'APARTAMENTO '+n+'01'}] });
const recetaNiv = ids => { const o={}; ids.forEach(id => { o[id]={0:[{m:'Canal',nc:'CANAL X',u:'u',aptos:{},tn:10}],1:[],2:[],3:[]}; }); return o; };

const deps = extractFn('_recetaV2EtapaNivel') + '\n' + extractFn('_recetaEtapaResuelta') + '\n' + extractFn('_recetaEtapaItemKeys') + '\n';
const src = extractFn('renderRecetaPedir');
ok('renderRecetaPedir extraída', !!src && deps.length > 50);

// ── 1. torre ÚNICA colapsada en localStorage → igual se expande ──
if (src) {
  const p1 = { id:'p-vla', name:'VLA', towers:[{ id:'t1', name:'TORRE ÚNICA', levels:[nivel('l-2',2), nivel('l-3',3)] }],
    materiales:{ recetaV2:{ formato:'estandar', etapas:['1RA','2DA','3RA','4TA'], niveles:recetaNiv(['l-2','l-3']) }, pedidos:[], etapasPedidas:{} } };
  const run = (p, collapsed) => {
    const f = new Function(mkEnv(collapsed) + 'function activeProj(){ return ' + JSON.stringify(p) + '; }\n' + deps + src + '\nrenderRecetaPedir();\nreturn __out.html;');
    return f();
  };
  const out1 = run(p1, ['t1']);
  ok('torre única: los botones PEDIR ET. se ven aunque el localStorage la tenga colapsada', /PEDIR ET\. 1/.test(out1) && /NIVEL 02/.test(out1));

  // ── 2. con 2+ torres el colapso se respeta ──
  const p2 = { id:'p-2t', name:'DOS', towers:[
      { id:'t1', name:'TORRE 1', levels:[nivel('l-2',2)] },
      { id:'t2', name:'TORRE 2', levels:[nivel('l-9',9)] }
    ],
    materiales:{ recetaV2:{ formato:'estandar', etapas:['1RA','2DA','3RA','4TA'], niveles:recetaNiv(['l-2','l-9']) }, pedidos:[], etapasPedidas:{} } };
  const out2 = run(p2, ['t1','t2']);
  ok('2 torres colapsadas: solo salen los headers (comportamiento actual intacto)', !/PEDIR ET\. 1/.test(out2) && /TORRE 1/.test(out2) && /TORRE 2/.test(out2));
  const out3 = run(p2, ['t1']);
  ok('2 torres, una colapsada: la otra muestra sus botones', /PEDIR ET\. 1/.test(out3) && /NIVEL 09/.test(out3) && !/NIVEL 02/.test(out3));
}

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
