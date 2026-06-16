/* TDD: auto-marcado de oficina. Funciones puras:
   _esUsuarioAutoMarcado(user) -> bool (tiene self.asistencia y NO es admin)
   _euclidDesc(a,b) -> distancia euclidiana entre dos descriptores
   _faceMatch1a1(detected, descriptors, umbral) -> {match, dist} (1-a-1 contra UNA persona)
   _puedeAutoEnrolarCara(user, personaId) -> bool */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function ext(name){ const m=html.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}')); if(!m){ console.log('NO '+name+' FOUND'); process.exit(2);} return m[0]; }
const R=new Function(ext('_esUsuarioAutoMarcado')+'\nreturn _esUsuarioAutoMarcado;')();
const E=new Function(ext('_euclidDesc')+'\nreturn _euclidDesc;')();
const M=new Function(ext('_euclidDesc')+'\n'+ext('_faceMatch1a1')+'\nreturn _faceMatch1a1;')();
const P=new Function(ext('_puedeAutoEnrolarCara')+'\nreturn _puedeAutoEnrolarCara;')();

let pass=0, fail=0;
const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// _esUsuarioAutoMarcado
ok('self.asistencia solo => true', R({perms:['self.asistencia']})===true);
ok('admin (*) aunque tenga self => false', R({perms:['*','self.asistencia']})===false);
ok('users.manage + self => false', R({perms:['users.manage','self.asistencia']})===false);
ok('sin self => false', R({perms:['personal.asistencia']})===false);
ok('sin perms => false', R({})===false);
ok('null => false', R(null)===false);

// _euclidDesc
ok('euclid iguales => 0', E([1,2,3],[1,2,3])===0);
ok('euclid 3-4-5', E([0,0],[3,4])===5);

// _faceMatch1a1
ok('match exacto => true', M([1,2,3],[{d:[1,2,3]}],0.5).match===true);
ok('match lejano => false', M([0,0,0],[{d:[10,10,10]}],0.5).match===false);
ok('toma array plano tambien', M([1,2,3],[[1,2,3]],0.5).match===true);
ok('elige la toma mas cercana', M([1,1,1],[{d:[9,9,9]},{d:[1,1,1]}],0.5).match===true);
ok('sin descriptores => no match', M([1,2,3],[],0.5).match===false);
ok('devuelve dist', M([0,0],[{d:[3,4]}],0.5).dist===5);

// _puedeAutoEnrolarCara
ok('admin enrola cualquiera', P({perms:['users.manage']},'pg-1')===true);
ok('personal.edit enrola cualquiera', P({perms:['personal.edit']},'pg-1')===true);
ok('self enrola SU ficha', P({perms:['self.asistencia'],colaboradorId:'pg-1'},'pg-1')===true);
ok('self NO enrola otra ficha', P({perms:['self.asistencia'],colaboradorId:'pg-1'},'pg-2')===false);
ok('sin perms => false', P({perms:[]},'pg-1')===false);

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
