/* TDD v728 + v821: bloquear desmarcar etapa física.
   v821: el encargado YA NO puede desmarcar ni mandar solicitud — la selección queda fija;
   solo gerente/admin desmarca (con confirmación).
   _avanceToggleAccion(wasActive, esGerente, tienePhotos) decide qué hace el clic:
     - etapa activa + gerente      -> 'unmark'         (desmarca directo, con confirm)
     - etapa activa + NO gerente   -> 'locked'         (v821: no desmarca, no solicita)
     - etapa inactiva + gerente    -> 'mark'           (NO exige fotos: corrige)
     - etapa inactiva + sin fotos  -> 'block-photos'   (encargado normal sin fotos)
     - etapa inactiva + con fotos  -> 'mark' */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function ext(name){ const m=html.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}')); if(!m){ console.log('NO '+name+' FOUND'); process.exit(2);} return m[0]; }
const A=new Function(ext('_avanceToggleAccion')+'\nreturn _avanceToggleAccion;')();

let pass=0, fail=0;
const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

ok('activa + gerente => unmark',        A(true,  true,  true )==='unmark');
ok('activa + gerente sin fotos => unmark', A(true, true, false)==='unmark');
ok('v821 activa + NO gerente => locked (no desmarca, no solicita)', A(true,  false, true )==='locked');
ok('v821 activa + NO gerente sin fotos => locked', A(true, false, false)==='locked');
ok('inactiva + gerente => mark',        A(false, true,  false)==='mark'); // gerente no exige fotos
ok('inactiva + gerente con fotos => mark', A(false, true, true)==='mark');
ok('inactiva + NO gerente con fotos => mark', A(false, false, true )==='mark');
ok('inactiva + NO gerente sin fotos => block', A(false, false, false)==='block-photos');

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
