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

function _todos(arr){ return (arr||[]).map(p=>p.id); }
console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
