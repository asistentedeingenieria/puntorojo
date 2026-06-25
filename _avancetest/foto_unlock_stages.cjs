/* v828: la cámara de una etapa se LIBERA cuando la etapa anterior está completa por FOTOS
   o por CUADRITOS (a.stages). Antes solo contaban las fotos (>=2). El user marcó el avance
   de TORELO por import (stages, sin fotos), así la etapa 3 (REFUERZOS) quedaba bloqueada.
   El cambio va en los 3 lugares que gatean: renderPhotosModal + las 2 funciones de cámara. */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── lógica pura: replica la regla nueva y verifica el comportamiento ──
function lista(photos, stages, i){ const ph=photos[i]; const ec=(Array.isArray(ph)?ph.filter(Boolean).length:0)>=2; return ec || !!(Array.isArray(stages)&&stages[i]); }
function prevDone(photos, stages, idx){ if(idx===0||idx===1) return true; if(idx===2) return lista(photos,stages,0)&&lista(photos,stages,1); return lista(photos,stages,idx-1); }
const stTorelo=[true,true,false,false,false,false];
ok('etapa 1 y 2 siempre libres', prevDone({},[],0)===true && prevDone({},[],1)===true);
ok('TORELO (stages 1,2 hechos, sin fotos): etapa 3 LIBERADA', prevDone({}, stTorelo, 2)===true);
ok('TORELO: etapa 4 sigue BLOQUEADA (stage 3 no hecho)', prevDone({}, stTorelo, 3)===false);
ok('sin stages ni fotos: etapa 3 bloqueada (igual que antes)', prevDone({}, [false,false,false,false,false,false], 2)===false);
ok('con fotos en 1 y 2: etapa 3 liberada (camino normal)', prevDone({0:['a','b'],1:['a','b']}, [], 2)===true);
ok('etapa 5 liberada si la 4 está hecha por stage', prevDone({}, [true,true,true,true,false,false], 4)===true);

// ── estructural: los 3 gates usan stages como alternativa ──
// 1) renderPhotosModal
ok('modal: helper _etapaLista (fotos O stages)', /_etapaLista = \(i\) => _etapaCompleta\(i\) \|\| !!\(Array\.isArray\(a\.stages\) && a\.stages\[i\]\)/.test(html));
ok('modal: etapa 3 usa _etapaLista(0) && _etapaLista(1)', /prevDone = _etapaLista\(0\) && _etapaLista\(1\)/.test(html));
ok('modal: cadena usa _etapaLista(idx - 1)', /prevDone = _etapaLista\(idx - 1\)/.test(html));
// 2) y 3) las funciones de cámara (con _a y con a)
ok('cámara(_a): _ecS con _a.stages', /_ecS = \(i\) => _ec\(i\) \|\| !!\(Array\.isArray\(_a\.stages\) && _a\.stages\[i\]\)/.test(html));
ok('cámara(a): _ecS con a.stages', /_ecS = \(i\) => _ec\(i\) \|\| !!\(Array\.isArray\(a\.stages\) && a\.stages\[i\]\)/.test(html));
ok('las 2 cámaras: etapa 3 usa _ecS(0) && _ecS(1)', (html.match(/_prevDone = _ecS\(0\) && _ecS\(1\)/g)||[]).length===2);
ok('las 2 cámaras: cadena usa _ecS(etapaIdx - 1)', (html.match(/_prevDone = _ecS\(etapaIdx - 1\)/g)||[]).length===2);
// ya no debe gatear SOLO por fotos en esos puntos
ok('modal ya no usa _etapaCompleta en prevDone', !/prevDone = _etapaCompleta\(idx - 1\)/.test(html));

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
