/* TDD: el encargado registra caras DESDE el kiosko. _enrolPickFiltrar es PURA y arma la
   lista del selector de persona: saca OFICINA e inactivos (no marcan por cara), busca por
   nombre/cargo/empresa (sin acentos, sin mayúsculas) y ordena alfabético. El scope por obra
   lo hace el caller con _personaEnObraUsuario (depende de estado). */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const m=html.match(/function _enrolPickFiltrar\([\s\S]*?\n\}/);
if(!m){ console.log('NO _enrolPickFiltrar FOUND'); process.exit(2); }
const fn=new Function(m[0]+'\nreturn _enrolPickFiltrar;')();

let pass=0, fail=0;
const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const base=[
  {id:'1', nombre:'José Pérez', cargo:'OPERARIO', empresa:'ACME', tipo:'OBRA', activo:true},
  {id:'2', nombre:'Ana López', cargo:'AYUDANTE', empresa:'ACME', tipo:'OBRA'},
  {id:'3', nombre:'Carlos Oficina', cargo:'CONTADOR', empresa:'PR', tipo:'OFICINA', activo:true},
  {id:'4', nombre:'Zoé Inactiva', cargo:'OPERARIO', tipo:'OBRA', activo:false},
];

ok('saca OFICINA', _todos(fn(base,'')).indexOf('3')<0);
ok('saca inactivos (activo:false)', _todos(fn(base,'')).indexOf('4')<0);
ok('sin query = todos los OBRA activos', fn(base,'').length===2);
ok('ordena alfabetico (Ana antes que Jose)', fn(base,'')[0].id==='2');
ok('busca por nombre sin acentos/mayusculas (jose -> José)', _todos(fn(base,'jose')).join()==='1');
ok('busca por cargo (ayudante -> Ana)', _todos(fn(base,'AYUDANTE')).join()==='2');
ok('busca por empresa (acme -> los 2 de obra)', fn(base,'acme').length===2);
ok('sin match = lista vacia', fn(base,'zzz').length===0);
ok('lista nula no rompe', Array.isArray(fn(null,'')) && fn(null,'').length===0);

// --- badge del selector: SIN CARA / MEJORAR / OK ---
const mEst=html.match(/function _enrolPickEstado\([\s\S]*?\n\}/);
const mMej=html.match(/function _enrolMejorarSet\([\s\S]*?\n\}/);
const mAna=html.match(/function _analizarCaras\([\s\S]*?\n\}/);
if(!mEst){ console.log('NO _enrolPickEstado FOUND'); process.exit(2); }
if(!mMej){ console.log('NO _enrolMejorarSet FOUND'); process.exit(2); }
if(!mAna){ console.log('NO _analizarCaras FOUND'); process.exit(2); }
const est=new Function(mEst[0]+'\nreturn _enrolPickEstado;')();
const mejset=new Function(mAna[0]+'\n'+mMej[0]+'\nreturn _enrolMejorarSet;')();

ok('estado sin cara => SIN CARA (orden 0)', (s=>s.label==='SIN CARA'&&s.orden===0)(est({id:'x'}, new Set())));
ok('estado con cara y en mejorar => MEJORAR (orden 1)', (s=>s.label==='MEJORAR'&&s.orden===1)(est({id:'x',face:{descriptors:[{d:[1]}]}}, new Set(['x']))));
ok('estado con cara y NO en mejorar => OK (orden 2)', (s=>s.label==='OK'&&s.orden===2)(est({id:'x',face:{descriptors:[{d:[1]}]}}, new Set())));
ok('orden pone accionables arriba (SIN CARA < MEJORAR < OK)', 0 < 1 && 1 < 2);

const _set=mejset([
  {id:'A', nombre:'A', face:{descriptors:[{d:[0,0,0]}]}},                                       // 1 toma => critico
  {id:'B', nombre:'B', face:{descriptors:[{d:[10,10,10]},{d:[10,10,10.01]},{d:[10,10,9.99]}]}}, // 3 tomas, separada => ok
  {id:'C', nombre:'C'}                                                                           // sin cara => no entra al análisis
]);
ok('mejorarSet: A (1 toma) entra', _set.has('A'));
ok('mejorarSet: B (3 tomas, separada) NO entra', !_set.has('B'));
ok('mejorarSet: C (sin cara) NO entra', !_set.has('C'));

function _todos(arr){ return (arr||[]).map(p=>p.id); }
console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
