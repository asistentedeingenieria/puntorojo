/* Verificación del import de ESSENZA Torre 3 y Torre 4 (jun 2026).
   - FÍSICO (avance de obra) y PAGOS (avance de pagos por apartamento).
   - Corre el TEXTO REAL que se le entrega al usuario contra las funciones
     reales del importador y verifica el resultado (n 0-4 / cheque verde) de
     CADA apto contra el mapeo dictado.
   - También cubre el override numérico con prefijo "Apartamento" (v726) y el
     valor 5 = 100% pagado → cheque verde en PAGOS (v727). */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function ext(name){ const m=html.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}')); if(!m){ console.log('NO '+name+' FOUND'); process.exit(2);} return m[0]; }

const FIS=new Function(ext('_nCuadrosFisToStages')+'\nreturn _nCuadrosFisToStages;')();
const PAG=new Function(ext('_nCuadrosPagoToPcts')+'\nreturn _nCuadrosPagoToPcts;')();
const P=new Function(ext('_parseImportFisico')+'\nreturn _parseImportFisico;')();
const NFIS=new Function(ext('_avanceAptoNivelFisico')+'\nreturn _avanceAptoNivelFisico;')();
const NPAG=new Function(ext('_avanceAptoNivelPago')+'\nreturn _avanceAptoNivelPago;')();
const APPLY_FIS=new Function('_nCuadrosFisToStages', ext('_aplicarImportFisico')+'\nreturn _aplicarImportFisico;')(FIS);
const APPLY_AV=new Function(ext('_aplicarImportAvance')+'\nreturn _aplicarImportAvance;')();

let pass=0, fail=0;
const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// Réplica EXACTA de mkEssenzaTorre(tNum, extra).
function mkTorre(tNum, extra){
  const mkApto=(name)=>({name, stages:[], stagesTs:[]});
  const levels=[];
  levels.push({name:'NIVEL 1', aptos:['Apartamento 101','Apartamento 102','Apartamento 103','Apartamento 104','Apartamento 105', extra, 'Pasillo'].map(mkApto)});
  for(let n=2;n<=12;n++){ const a=[]; for(let i=1;i<=8;i++) a.push('Apartamento '+n+'0'+i); a.push('Pasillo'); levels.push({name:'NIVEL '+n, aptos:a.map(mkApto)}); }
  levels.push({name:'NIVEL 13', aptos:[mkApto('Azotea')]});
  return {name:'TORRE '+tNum, levels};
}
const num=(s)=>{ const d=String(s).replace(/\D/g,''); return d?parseInt(d,10):null; };
const esPasillo=(s)=>/^Pasillo/i.test(s), esApto=(s)=>/^Apartamento/i.test(s);

// ───────── FÍSICO ─────────
function correrFisico(tName, extra, texto, expFn){
  const tower=mkTorre(tName, extra);
  const parsed=P(texto);
  ok(tName+' FIS: parsea ok', parsed.ok===true);
  const res=APPLY_FIS(tower, parsed.niveles);
  ok(tName+' FIS: overrides todos coinciden', res.overridesNotMatched.length===0 || (console.log('  notMatched:',res.overridesNotMatched),false));
  let mism=0;
  tower.levels.forEach(lvl=>{ const nivel=num(lvl.name); if(nivel===13) return;
    lvl.aptos.forEach(a=>{ const term=(a.stages||[]).filter(Boolean).length; const got=NFIS(term,false).n; const exp=expFn(nivel,a.name);
      if(exp===undefined) return; if(got!==exp){ mism++; if(mism<=25) console.log('  MISMATCH FIS '+tName+' N'+nivel+' "'+a.name+'": esp '+exp+' got '+got); } }); });
  ok(tName+' FIS: todos los aptos con el n esperado', mism===0);
}

const FIS_T3=['N1=0; 101=4; 102=4; 103=4; 104=4; 105=4; PASILLO=4','N2=4','N3=4','N4=4','N5=4','N6=4','N7=4','N8=4; PASILLO=3','N9=3','N10=3','N11=1; PASILLO=0','N12=1; 1205=0; PASILLO=0'].join('\n');
function expFisT3(nivel,name){ const n=num(name);
  if(nivel===1){ if(esPasillo(name)) return 4; if(esApto(name)) return 4; return 0; }
  if(nivel>=2 && nivel<=7) return 4;
  if(nivel===8){ if(esPasillo(name)) return 3; return 4; }
  if(nivel===9||nivel===10) return 3;
  if(nivel===11){ if(esPasillo(name)) return 0; return 1; }
  if(nivel===12){ if(esPasillo(name)) return 0; if(n===1205) return 0; return 1; }
  return undefined; }
correrFisico('T3','Salón de jóvenes',FIS_T3,expFisT3);

const FIS_T4=['N1=0; 101=4; 102=4; 103=4; 104=4; 105=4; PASILLO=4','N2=4','N3=4','N4=4','N5=4','N6=4','N7=4','N8=3; 804=4','N9=3; 904=2; 905=2; 906=2; 907=2; 908=2','N10=3','N11=1; PASILLO=0','N12=1; 1206=0; PASILLO=0'].join('\n');
function expFisT4(nivel,name){ const n=num(name);
  if(nivel===1){ if(esPasillo(name)) return 4; if(esApto(name)) return 4; return 0; }
  if(nivel>=2 && nivel<=7) return 4;
  if(nivel===8){ if(esPasillo(name)) return 3; if(n===804) return 4; return 3; }
  if(nivel===9){ if(esPasillo(name)) return 3; if(n>=904 && n<=908) return 2; return 3; }
  if(nivel===10) return 3;
  if(nivel===11){ if(esPasillo(name)) return 0; return 1; }
  if(nivel===12){ if(esPasillo(name)) return 0; if(n===1206) return 0; return 1; }
  return undefined; }
correrFisico('T4','Cine',FIS_T4,expFisT4);

// ───────── PAGOS ─────────  (expected: 0-4 = n/4, 'G' = cheque verde / 100%)
function correrPago(tName, extra, texto, expFn){
  const tower=mkTorre(tName, extra);
  const parsed=P(texto);
  ok(tName+' PAGO: parsea ok', parsed.ok===true);
  const res=APPLY_AV(tower, parsed.niveles, function(a,n){ a.pagoManual=PAG(n); });
  ok(tName+' PAGO: overrides todos coinciden', res.overridesNotMatched.length===0 || (console.log('  notMatched:',res.overridesNotMatched),false));
  let mism=0;
  tower.levels.forEach(lvl=>{ const nivel=num(lvl.name); if(nivel===13) return;
    lvl.aptos.forEach(a=>{ const niv=NPAG(a.pagoManual); const got=niv.green?'G':niv.n; const exp=expFn(nivel,a.name);
      if(exp===undefined) return; if(got!==exp){ mism++; if(mism<=25) console.log('  MISMATCH PAGO '+tName+' N'+nivel+' "'+a.name+'": esp '+exp+' got '+got); } }); });
  ok(tName+' PAGO: todos los aptos con el resultado esperado', mism===0);
}

const PAGO_T3=['N1=5; 105=4','N2=5','N3=5','N4=5','N5=5','N6=5','N7=5; PASILLO=4','N8=5; 803=4; PASILLO=4','N9=4; 905=3; 908=3','N10=1; 1006=4; 1007=4; 1008=4; PASILLO=0','N11=1; PASILLO=0','N12=1; 1205=0; PASILLO=0'].join('\n');
function expPagoT3(nivel,name){ const n=num(name);
  if(nivel===1){ if(esPasillo(name)) return 'G'; if(n===105) return 4; return 'G'; }
  if(nivel>=2 && nivel<=6) return 'G';
  if(nivel===7){ if(esPasillo(name)) return 4; return 'G'; }
  if(nivel===8){ if(esPasillo(name)) return 4; if(n===803) return 4; return 'G'; }
  if(nivel===9){ if(esPasillo(name)) return 4; if(n===905||n===908) return 3; return 4; }
  if(nivel===10){ if(esPasillo(name)) return 0; if(n>=1006 && n<=1008) return 4; return 1; }
  if(nivel===11){ if(esPasillo(name)) return 0; return 1; }
  if(nivel===12){ if(esPasillo(name)) return 0; if(n===1205) return 0; return 1; }
  return undefined; }
correrPago('T3','Salón de jóvenes',PAGO_T3,expPagoT3);

const PAGO_T4=['N1=5','N2=5','N3=5','N4=5','N5=5','N6=5','N7=5; 706=4','N8=4; 805=1; PASILLO=0','N9=1; PASILLO=0','N10=1; PASILLO=0','N11=1; PASILLO=0','N12=0; 1201=1; 1207=1'].join('\n');
function expPagoT4(nivel,name){ const n=num(name);
  if(nivel===1) return 'G';
  if(nivel>=2 && nivel<=6) return 'G';
  if(nivel===7){ if(n===706) return 4; return 'G'; }
  if(nivel===8){ if(esPasillo(name)) return 0; if(n===805) return 1; return 4; }
  if(nivel>=9 && nivel<=11){ if(esPasillo(name)) return 0; return 1; }
  if(nivel===12){ if(n===1201||n===1207) return 1; return 0; }
  return undefined; }
correrPago('T4','Cine',PAGO_T4,expPagoT4);

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
