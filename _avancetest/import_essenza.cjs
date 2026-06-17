/* Verificación del import de AVANCE FÍSICO de ESSENZA Torre 3 y Torre 4 (jun 2026).
   - Confirma que el importador aplica overrides numéricos a aptos nombrados
     "Apartamento NNN" (antes NO pegaban por el prefijo).
   - Corre el TEXTO REAL que se le entrega al usuario y verifica el `n` (0-4)
     resultante de CADA apto contra el mapeo dictado. */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function ext(name){ const m=html.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}')); if(!m){ console.log('NO '+name+' FOUND'); process.exit(2);} return m[0]; }

const S=new Function(ext('_nCuadrosFisToStages')+'\nreturn _nCuadrosFisToStages;')();
const P=new Function(ext('_parseImportFisico')+'\nreturn _parseImportFisico;')();
const F=new Function(ext('_avanceAptoNivelFisico')+'\nreturn _avanceAptoNivelFisico;')();
// _aplicarImportFisico usa _nCuadrosFisToStages + Date.now → se lo pasamos.
const APPLY=new Function('_nCuadrosFisToStages', ext('_aplicarImportFisico')+'\nreturn _aplicarImportFisico;')(S);

let pass=0, fail=0;
const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// Réplica EXACTA de mkEssenzaTorre(tNum, extra) del index.html.
function mkTorre(tNum, extra){
  const mkApto=(name)=>({name, stages:[], stagesTs:[]});
  const levels=[];
  levels.push({name:'NIVEL 1', aptos:['Apartamento 101','Apartamento 102','Apartamento 103','Apartamento 104','Apartamento 105', extra, 'Pasillo'].map(mkApto)});
  for(let n=2;n<=12;n++){ const a=[]; for(let i=1;i<=8;i++) a.push('Apartamento '+n+'0'+i); a.push('Pasillo'); levels.push({name:'NIVEL '+n, aptos:a.map(mkApto)}); }
  levels.push({name:'NIVEL 13', aptos:[mkApto('Azotea')]});
  return {name:'TORRE '+tNum, levels};
}

// n resultante (0-4) de un apto ya aplicado.
function nDe(a){ const term=(a.stages||[]).filter(Boolean).length; return F(term,false).n; }

function correr(tName, extra, texto, expFn){
  const tower=mkTorre(tName, extra);
  const parsed=P(texto);
  ok(tName+': texto parsea ok', parsed.ok===true);
  const res=APPLY(tower, parsed.niveles);
  ok(tName+': sin overrides sin coincidir', res.overridesNotMatched.length===0 || (console.log('  overridesNotMatched:', res.overridesNotMatched),false));
  let mism=0;
  tower.levels.forEach(lvl=>{
    const nivel=parseInt(String(lvl.name).replace(/\D/g,''),10);
    if(nivel===13) return; // azotea no se carga
    lvl.aptos.forEach(a=>{
      const got=nDe(a);
      const exp=expFn(nivel, a.name);
      if(exp===undefined) return;
      if(got!==exp){ mism++; if(mism<=20) console.log('  MISMATCH '+tName+' N'+nivel+' "'+a.name+'": esperado '+exp+' got '+got); }
    });
  });
  ok(tName+': todos los aptos con el n esperado', mism===0);
}

// ───────── TORRE 3 ─────────
const TXT_T3 = [
  'N1=0; 101=4; 102=4; 103=4; 104=4; 105=4; PASILLO=4',
  'N2=4','N3=4','N4=4','N5=4','N6=4','N7=4','N8=4','N9=4','N10=4',
  'N11=1; PASILLO=0',
  'N12=1; 1205=0; PASILLO=0'
].join('\n');
function expT3(nivel, name){
  const num=parseInt(String(name).replace(/\D/g,''),10);
  const esApto=/^Apartamento/i.test(name), esPasillo=/^Pasillo/i.test(name);
  if(nivel===1){ if(esPasillo) return 4; if(esApto) return 4; return 0; } // 101-105=4, pasillo=4, salón=0
  if(nivel>=2 && nivel<=10) return 4; // todo 4 (incl pasillo)
  if(nivel===11){ if(esPasillo) return 0; return 1; }
  if(nivel===12){ if(esPasillo) return 0; if(num===1205) return 0; return 1; }
  return undefined;
}
correr('T3','Salón de jóvenes', TXT_T3, expT3);

// ───────── TORRE 4 ─────────
const TXT_T4 = [
  'N1=0; 101=4; 102=4; 103=4; 104=4; 105=4; PASILLO=4',
  'N2=4','N3=4','N4=4','N5=4','N6=4','N7=4','N8=4',
  'N9=4; 904=3; 905=3; 906=3; 907=3; 908=3',
  'N10=1; PASILLO=0',
  'N11=1; PASILLO=0',
  'N12=1; 1206=0; PASILLO=0'
].join('\n');
function expT4(nivel, name){
  const num=parseInt(String(name).replace(/\D/g,''),10);
  const esApto=/^Apartamento/i.test(name), esPasillo=/^Pasillo/i.test(name);
  if(nivel===1){ if(esPasillo) return 4; if(esApto) return 4; return 0; } // cine=0
  if(nivel>=2 && nivel<=8) return 4;
  if(nivel===9){ if(esPasillo) return 4; if(num>=904 && num<=908) return 3; return 4; }
  if(nivel===10 || nivel===11){ if(esPasillo) return 0; return 1; }
  if(nivel===12){ if(esPasillo) return 0; if(num===1206) return 0; return 1; }
  return undefined;
}
correr('T4','Cine', TXT_T4, expT4);

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
