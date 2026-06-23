/* v789: SOLICITAR ANTICIPO — el "¿para quién?" es un combobox escribible (buscar)
   en vez de un <select> gigante. Lista corta (cap) + filtro por texto. */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function ext2(name){ const m=html.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n  \\}')); return m?m[0]:''; }
let pass=0,fail=0;const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const src=ext2('_antColabFilter');
ok('_antColabFilter existe', !!src);
if(src){
  const f=new Function(src+'\nreturn _antColabFilter;')();
  const L=['ANA LOPEZ','JUAN PEREZ','PEDRO PEREZ','MARIA GOMEZ'];
  ok('vacio -> todos', f(L,'').length===4);
  ok('filtra por substring (PEREZ)', JSON.stringify(f(L,'perez'))===JSON.stringify(['JUAN PEREZ','PEDRO PEREZ']));
  ok('case-insensitive', f(L,'maria').length===1);
  ok('sin match -> vacio', f(L,'zzz').length===0);
  const big=Array.from({length:100},(_,i)=>'PERSONA '+i);
  ok('cap a 40 (lista corta)', f(big,'PERSONA').length===40);
}
// estructural: combobox escribible, no <select>
ok('antSolColab ya NO es <select>', /<select id="antSolColab"/.test(html)===false);
ok('antSolColab es input oculto del combobox', /<input type="hidden" id="antSolColab"/.test(html));
ok('input de busqueda del combobox', html.indexOf('id="antColabInput"')>=0 && html.indexOf('class="pr-combo"')>=0);
ok('handlers del combobox', html.indexOf('window._antColabFiltrar')>=0 && html.indexOf('window._antColabPick')>=0);
ok('_antColabNombres (lista) existe', html.indexOf('function _antColabNombres')>=0);

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
