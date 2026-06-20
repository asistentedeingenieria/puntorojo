/* v774: re-activar LIBERAR ETAPA (gerente libera por apto+etapa; el subgerente no ve el bloqueo).
   El bug previo ("liberó pero el supervisor no podía pagar") era el sync LWW del doc de proyecto:
   a.libEtapas (en towers[].levels[].aptos[]) lo pisaba un upload viejo del supervisor. Fix =
   union-merge por celda con ts mas nueva + tombstone (libEtapasTomb) para des-liberar.
   _etapaLiberada = neto (release vs tomb). Funciones puras testeadas aqui. */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function ext(name){ const m=html.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}')); return m?m[0]:''; }
let pass=0,fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const srcMap = ext('_mergeLibMap');
const srcLib = ext('_etapaLiberada');
ok('_mergeLibMap existe', !!srcMap);
ok('_etapaLiberada existe', !!srcLib);
if(srcMap && srcLib){
  const _mergeLibMap = new Function(srcMap+'\nreturn _mergeLibMap;')();
  const _etapaLiberada = new Function(srcLib+'\nreturn _etapaLiberada;')();

  ok('libEtapas: gana ts mayor', _mergeLibMap({0:{ts:100,by:'g'}},{0:{ts:200,by:'g'}},false).map[0].ts===200);
  ok('libEtapas: union de celdas distintas', Object.keys(_mergeLibMap({0:{ts:1}},{1:{ts:2}},false).map).length===2);
  ok('libEtapas: local que remoto no tiene se preserva (changed)', _mergeLibMap({2:{ts:5}},{},false).changed===true);
  ok('tomb: gana ts mayor (numerico)', _mergeLibMap({0:50},{0:80},true).map[0]===80);

  ok('liberada sin tomb', _etapaLiberada({libEtapas:{0:{ts:100}}},0)===true);
  ok('NO liberada si tomb mas nuevo', _etapaLiberada({libEtapas:{0:{ts:100}},libEtapasTomb:{0:200}},0)===false);
  ok('liberada si re-liberada despues del tomb', _etapaLiberada({libEtapas:{0:{ts:300}},libEtapasTomb:{0:200}},0)===true);
  ok('NO liberada si no hay libEtapas', _etapaLiberada({},0)===false);
  ok('NO liberada apto null', _etapaLiberada(null,0)===false);
}

// estructural: control re-activado + mensaje + uso del helper + merge en applyRemote
ok('control re-activado (_PAGO_LIBRE_TODO=false)', /_PAGO_LIBRE_TODO\s*=\s*false/.test(html));
ok('mensaje ETAPA NO DISPONIBLE DE PAGO', html.indexOf('ETAPA NO DISPONIBLE DE PAGO')>=0);
ok('applyRemote usa _mergeLibEtapasIntoMerged', html.indexOf('_mergeLibEtapasIntoMerged(merged')>=0);
ok('gate usa _etapaLiberada', /_lib493\s*=\s*_etapaLiberada\(/.test(html));

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
