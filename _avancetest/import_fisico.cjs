/* TDD: IMPORTADOR de AVANCE FÍSICO desde reportes "AVANCE DE OBRA".
   El usuario elige la TORRE en un menú; pega los niveles en texto:
     N1=4
     N8=4; PASILLO=3
     N12=1; 1205=0; PASILLO=0
   donde el número (0..4) son los cuadritos de la Foto 1 (0=sin iniciar,
   1=1RA tabique 1 cara, 2=2DA tabique 2 caras, 3=3RA estructura+forro, 4=4TA masilla).
   Dos funciones puras:
   - _nCuadrosFisToStages(n) -> array de 6 bools (mapea cuadros -> a.stages internas)
   - _parseImportFisico(text) -> {ok, niveles:[{nivel,def,overrides}], errors} */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function ext(name){ const m=html.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}')); if(!m){ console.log('NO '+name+' FOUND'); process.exit(2);} return m[0]; }
const S=new Function(ext('_nCuadrosFisToStages')+'\nreturn _nCuadrosFisToStages;')();
const P=new Function(ext('_parseImportFisico')+'\nreturn _parseImportFisico;')();
const F=new Function(ext('_avanceAptoNivelFisico')+'\nreturn _avanceAptoNivelFisico;')();

let pass=0, fail=0;
const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
const cnt=a=>a.filter(Boolean).length;

// _nCuadrosFisToStages: cuántas stages true por cuadro
ok('cuadro0 => 0 stages', cnt(S(0))===0);
ok('cuadro1 (1RA) => 2 stages', cnt(S(1))===2);
ok('cuadro2 (2DA) => 4 stages', cnt(S(2))===4);
ok('cuadro3 (3RA) => 5 stages', cnt(S(3))===5);
ok('cuadro4 (4TA) => 6 stages', cnt(S(4))===6);
ok('stages siempre largo 6', S(0).length===6 && S(4).length===6);
ok('stages son prefijo (consecutivas)', S(3)[0]&&S(3)[1]&&S(3)[2]&&S(3)[3]&&S(3)[4]&&!S(3)[5]);
// round-trip: cuadros -> stages -> term -> cuadros
for(let n=0;n<=4;n++) ok('round-trip n='+n, F(cnt(S(n)),false).n===n);

// _parseImportFisico
let r=P('N1=4');
ok('simple N1=4 ok', r.ok===true && r.niveles.length===1 && r.niveles[0].nivel===1 && r.niveles[0].def===4);
r=P('NIVEL 8=4; PASILLO=3');
ok('NIVEL prefijo + override PASILLO', r.ok && r.niveles[0].nivel===8 && r.niveles[0].def===4 && r.niveles[0].overrides.PASILLO===3);
r=P('N12=1; 1205=0; PASILLO=0');
ok('multi override', r.ok && r.niveles[0].overrides['1205']===0 && r.niveles[0].overrides.PASILLO===0 && r.niveles[0].def===1);
r=P('#1206=0 line', undefined); // not used
r=P('N12=1; #1206=0');
ok('override quita # del apto', r.ok && r.niveles[0].overrides['1206']===0);
r=P('N1=4\n\nN2=4\nN3=4');
ok('varias lineas + vacías', r.ok && r.niveles.length===3 && r.niveles[2].nivel===3);
r=P('// comentario\nN1=4');
ok('comentario ignorado', r.ok && r.niveles.length===1);
r=P('N1=4; pasillo=3');
ok('override case-insensitive -> PASILLO', r.ok && r.niveles[0].overrides.PASILLO===3);
r=P('basura');
ok('linea invalida => ok false + error', r.ok===false && r.errors.length>0);
r=P('N1=9');
ok('def fuera de rango (9) => error', r.ok===false && r.errors.length>0);
r=P('N1=4; 101=7');
ok('override fuera de rango => error', r.ok===false && r.errors.length>0);
r=P('');
ok('vacío => ok, 0 niveles', r.ok===true && r.niveles.length===0);

// _aplicarImportFisico (muta tower)
const A=new Function(ext('_nCuadrosFisToStages')+'\n'+ext('_aplicarImportFisico')+'\nreturn _aplicarImportFisico;')();
function mkTower(){
  return {name:'TORRE 3', levels:[
    {name:'NIVEL 1',  aptos:[{name:'101',stages:[]},{name:'102',stages:[]},{name:'PASILLO',stages:[]}]},
    {name:'NIVEL 12', aptos:[{name:'#1201',stages:[]},{name:'1205',stages:[]},{name:'PASILLO',stages:[]}]}
  ]};
}
let tw=mkTower();
let res=A(tw, P('N1=4').niveles);
ok('aplica N1=4 a todos -> 6 stages c/u', cnt(tw.levels[0].aptos[0].stages)===6 && cnt(tw.levels[0].aptos[2].stages)===6);
ok('resumen aptos=3 niveles=1', res.aptos===3 && res.niveles===1);
tw=mkTower();
A(tw, P('N12=1; 1205=0; PASILLO=0').niveles);
ok('N12 def=1 -> #1201 = 2 stages', cnt(tw.levels[1].aptos[0].stages)===2);
ok('override 1205=0 -> 0 stages', cnt(tw.levels[1].aptos[1].stages)===0);
ok('override PASILLO=0 -> 0 stages', cnt(tw.levels[1].aptos[2].stages)===0);
tw=mkTower();
res=A(tw, P('N7=4').niveles);
ok('nivel inexistente -> levelsNotFound, 0 aptos', res.levelsNotFound.length===1 && res.levelsNotFound[0]===7 && res.aptos===0);
tw=mkTower();
res=A(tw, P('N1=4; 999=0').niveles);
ok('override sin match -> overridesNotMatched', res.overridesNotMatched.length===1);
ok('stagesTs se setea para stages nuevas', Array.isArray(tw.levels[0].aptos[0].stagesTs) && tw.levels[0].aptos[0].stagesTs.filter(Boolean).length===6);

// v704: mapeos pago/despacho (round-trip con sus _avanceAptoNivel*)
const PG=new Function(ext('_nCuadrosPagoToPcts')+'\nreturn _nCuadrosPagoToPcts;')();
const MT=new Function(ext('_nCuadrosMatToPcts')+'\nreturn _nCuadrosMatToPcts;')();
const NP=new Function(ext('_avanceAptoNivelPago')+'\nreturn _avanceAptoNivelPago;')();
const NM=new Function(ext('_avanceAptoNivelMaterial')+'\nreturn _avanceAptoNivelMaterial;')();
for(let n=0;n<=4;n++) ok('pago round-trip n='+n, NP(PG(n)).n===n);
ok('pago n=4 NO es cheque', NP(PG(4)).green===false);
ok('pago largo 5', PG(2).length===5);
for(let n=0;n<=4;n++) ok('despacho round-trip n='+n, NM(MT(n)).n===n);
ok('despacho n=4 NO es cheque', NM(MT(4)).green===false);
ok('despacho largo 4', MT(2).length===4);

// v704: aplicador genérico con setter (pago/despacho)
const AG=new Function(ext('_aplicarImportAvance')+'\nreturn _aplicarImportAvance;')();
tw=mkTower();
let cap={};
let rg=AG(tw, P('N1=3; 101=1').niveles, function(a,nn){ cap[a.name]=nn; });
ok('genérico aplica def a aptos', cap['102']===3 && cap['PASILLO']===3);
ok('genérico respeta override', cap['101']===1);
ok('genérico cuenta aptos/niveles', rg.aptos===3 && rg.niveles===1);
tw=mkTower();
AG(tw, P('N12=4').niveles, function(a,nn){ a.pagoManual=PG(nn); });
ok('setter pago escribe a.pagoManual', Array.isArray(tw.levels[1].aptos[0].pagoManual) && NP(tw.levels[1].aptos[0].pagoManual).n===4);
tw=mkTower();
AG(tw, P('N1=2').niveles, function(a,nn){ a.despachoManual=MT(nn); });
ok('setter despacho escribe a.despachoManual', Array.isArray(tw.levels[0].aptos[0].despachoManual) && NM(tw.levels[0].aptos[0].despachoManual).n===2);

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
