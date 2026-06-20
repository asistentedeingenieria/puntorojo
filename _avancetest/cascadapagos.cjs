/* v773: rediseño del modal "Generar pagos nuevos" — selección en cascada Torre -> Nivel ->
   Apartamento (listas chicas en vez del listón plano de cientos de aptos). La logica de
   armado de listas es _v328Cascada(towers), pura y testeable. */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const m = html.match(/\n  function _v328Cascada\(towers\)\{[\s\S]*?\n  \}/);
ok('_v328Cascada existe', !!m);
if(m){
  const _v328Cascada = new Function(m[0] + '\nreturn _v328Cascada;')();
  const towers = [
    { id:'t1', name:'TORRE 3', levels:[
      { id:'l1', name:'NIVEL 9',  aptos:[{id:'a1',name:'908'},{id:'a2',name:'PASILLO'}] },
      { id:'l2', name:'NIVEL 10', aptos:[{id:'a3',name:'1001'}] }
    ]},
    { id:'t2', name:'TORRE 4', levels:[ { id:'l3', name:'NIVEL 2', aptos:[{id:'a4',name:'201'}] } ]}
  ];
  const r = _v328Cascada(towers);
  ok('2 torres', r.torres.length===2);
  ok('torre 1 id+nombre', r.torres[0].id==='t1' && r.torres[0].name==='TORRE 3');
  ok('niveles de t1 = 2', (r.nivelesByTorre['t1']||[]).length===2);
  ok('niveles de t2 = 1', (r.nivelesByTorre['t2']||[]).length===1);
  ok('aptos de l1 = 2', (r.aptosByNivel['l1']||[]).length===2);
  ok('apto name l1[0]', r.aptosByNivel['l1'][0].name==='908' && r.aptosByNivel['l1'][0].id==='a1');
  ok('aptos de l2 = 1', (r.aptosByNivel['l2']||[]).length===1);
  const e = _v328Cascada(null);
  ok('null towers -> vacio', e.torres.length===0 && Object.keys(e.nivelesByTorre).length===0);
  const bad = _v328Cascada([{id:'t9',name:'T9',levels:[{name:'sin id'},{id:'lx',aptos:[{name:'sin id'},{id:'ax',name:'OK'}]}]}]);
  ok('ignora nivel sin id', (bad.nivelesByTorre['t9']||[]).length===1);
  ok('ignora apto sin id', (bad.aptosByNivel['lx']||[]).length===1 && bad.aptosByNivel['lx'][0].name==='OK');
}

// estructural: el modal usa los 3 selects en cascada + NETO TOTAL en mayusculas
// (anclar en la DEFINICION de la funcion, no en el onclick del boton que aparece antes)
const idx = html.indexOf('window._v328GenerarPagoNuevoYAgregar = async function');
const region = idx>=0 ? html.slice(idx, idx+20000) : '';
ok('modal: select data-field torre', region.indexOf('data-field="torre"')>=0);
ok('modal: select data-field nivel', region.indexOf('data-field="nivel"')>=0);
ok('modal: usa _v328Cascada', region.indexOf('_v328Cascada(')>=0);
ok('modal: NETO TOTAL en mayusculas', region.indexOf('NETO TOTAL')>=0);

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
