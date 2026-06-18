/* Verificación de los textos de import de VICINIA DEL CARMEN (Torre A + B):
   físico, pago, despacho. Pasillos pre-cargados con un MARCADOR (n=2) para
   confirmar que "=N" (sin tocar) NO los pisa y "=0" sí. */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function ext(name){ const m=html.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}')); if(!m){ console.log('NO '+name+' FOUND'); process.exit(2);} return m[0]; }
const FIS=new Function(ext('_nCuadrosFisToStages')+'\nreturn _nCuadrosFisToStages;')();
const PAG=new Function(ext('_nCuadrosPagoToPcts')+'\nreturn _nCuadrosPagoToPcts;')();
const MAT=new Function(ext('_nCuadrosMatToPcts')+'\nreturn _nCuadrosMatToPcts;')();
const P=new Function(ext('_parseImportFisico')+'\nreturn _parseImportFisico;')();
const NFIS=new Function(ext('_avanceAptoNivelFisico')+'\nreturn _avanceAptoNivelFisico;')();
const NPAG=new Function(ext('_avanceAptoNivelPago')+'\nreturn _avanceAptoNivelPago;')();
const NMAT=new Function(ext('_avanceAptoNivelMaterial')+'\nreturn _avanceAptoNivelMaterial;')();
const APPLY_FIS=new Function('_nCuadrosFisToStages', ext('_aplicarImportFisico')+'\nreturn _aplicarImportFisico;')(FIS);
const APPLY_AV=new Function(ext('_aplicarImportAvance')+'\nreturn _aplicarImportAvance;')();

let pass=0, fail=0;
const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// Réplica de mkViciniaCarmen (niveles 2-11). n2-5: 8 aptos (201-208). n6-15: 6 aptos (N01-N06). + 'Pasillos'.
function mkVicinia(letter){
  const mk=(name)=>({name});
  const levels=[];
  for(let n=2;n<=5;n++){ const a=['Pasillos']; for(let i=1;i<=8;i++) a.push('Apartamento '+n+'0'+i); levels.push({name:'NIVEL '+n,id:'n'+n,aptos:a.map(mk)}); }
  for(let n=6;n<=11;n++){ const a=['Pasillos']; for(let i=1;i<=6;i++) a.push('Apartamento '+n+'0'+i); levels.push({name:'NIVEL '+n,id:'n'+n,aptos:a.map(mk)}); }
  return {id:'v'+letter.toLowerCase(),name:'TORRE '+letter,levels};
}
const num=(s)=>{const d=String(s).replace(/\D/g,'');return d?parseInt(d,10):null;};
const esPas=(s)=>/^Pasillos/i.test(s);

// FÍSICO: setea stages; marca pasillos en n=2 para ver "sin tocar".
function corrFis(letter, texto, expFn){
  const tw=mkVicinia(letter);
  tw.levels.forEach(l=>l.aptos.forEach(a=>{ a.stages = esPas(a.name)?FIS(2).slice():[]; a.stagesTs=[]; })); // pasillo marcador n=2
  APPLY_FIS(tw, P(texto).niveles);
  let mism=0;
  tw.levels.forEach(l=>{ const nv=num(l.name); l.aptos.forEach(a=>{ const got=NFIS((a.stages||[]).filter(Boolean).length,false).n; const exp=expFn(nv,a.name); if(exp===undefined)return; if(got!==exp){mism++; if(mism<=20)console.log('  FIS '+letter+' N'+nv+' '+a.name+': esp '+exp+' got '+got);} }); });
  ok('FÍSICO '+letter+' OK', mism===0);
}
// PAGO/DESPACHO: setea pagoManual/despachoManual; marca pasillos en n=2.
function corrAv(tag, letter, texto, fld, conv, nivf, expFn){
  const tw=mkVicinia(letter);
  tw.levels.forEach(l=>l.aptos.forEach(a=>{ if(esPas(a.name)) a[fld]=conv(2); })); // pasillo marcador n=2
  APPLY_AV(tw, P(texto).niveles, function(a,n){ a[fld]=conv(n); });
  let mism=0;
  tw.levels.forEach(l=>{ const nv=num(l.name); l.aptos.forEach(a=>{ const niv=a[fld]?nivf(a[fld]):{green:false,n:0}; const got=niv.green?5:niv.n; const exp=expFn(nv,a.name); if(exp===undefined)return; if(got!==exp){mism++; if(mism<=20)console.log('  '+tag+' '+letter+' N'+nv+' '+a.name+': esp '+exp+' got '+got);} }); });
  ok(tag+' '+letter+' OK', mism===0);
}

// ───── FÍSICO ─────
corrFis('A', ['N2=4; PASILLOS=N','N3=4; PASILLOS=N','N4=4; 405=3; 406=3; 407=3; 408=3; PASILLOS=N','N5=2; 505=1; 506=1; 507=1; 508=1; PASILLOS=N','N6=1; PASILLOS=N','N7=1; PASILLOS=N','N8=N; 801=1; 803=1'].join('\n'),
  (nv,name)=>{ const n=num(name); const pas=esPas(name);
    if(nv===2||nv===3){ return pas?2:4; }
    if(nv===4){ if(pas)return 2; return (n>=405&&n<=408)?3:4; }
    if(nv===5){ if(pas)return 2; return (n>=505&&n<=508)?1:2; }
    if(nv===6||nv===7){ return pas?2:1; }
    if(nv===8){ if(pas)return 2; return (n===801||n===803)?1:0; } // resto sin tocar (era 0)
    return undefined; });
corrFis('B', ['N2=4; PASILLOS=3','N3=4; PASILLOS=N','N4=4; PASILLOS=N','N5=4; PASILLOS=N','N6=4; PASILLOS=N','N7=4; PASILLOS=N','N8=3; 805=2; 806=2; PASILLOS=N','N9=1; PASILLOS=N','N10=1; PASILLOS=N'].join('\n'),
  (nv,name)=>{ const n=num(name); const pas=esPas(name);
    if(nv===2){ return pas?3:4; }
    if(nv>=3&&nv<=7){ return pas?2:4; }
    if(nv===8){ if(pas)return 2; return (n===805||n===806)?2:3; }
    if(nv===9||nv===10){ return pas?2:1; }
    if(nv===11) return undefined; return undefined; });

// ───── PAGO ─────  (pasillo marcador n=2; "=0" lo baja a 0, "=N" lo deja en 2)
corrAv('PAGO','A', ['N1=0','N2=4; PASILLOS=0','N3=4; PASILLOS=0','N4=N; 401=3; 408=3; PASILLOS=0','N5=1; PASILLOS=0','N6=1; PASILLOS=0'].join('\n'), 'pagoManual', PAG, NPAG,
  (nv,name)=>{ const n=num(name); const pas=esPas(name);
    if(nv===1) return undefined; // n1 amenities, no chequeo
    if(nv===2||nv===3){ return pas?0:4; }
    if(nv===4){ if(pas)return 0; return (n===401||n===408)?3:undefined; } // 402-407 sin tocar (no se chequean)
    if(nv===5||nv===6){ return pas?0:1; }
    return undefined; });
corrAv('PAGO','B', ['N2=4; PASILLOS=N','N3=4; PASILLOS=N','N4=4; PASILLOS=N','N5=4; 502=3; 504=3; PASILLOS=N','N6=4; 605=3; 606=3; PASILLOS=N','N7=3; PASILLOS=N','N8=1; PASILLOS=N','N10=N; 1001=1; 1002=1; 1004=1'].join('\n'), 'pagoManual', PAG, NPAG,
  (nv,name)=>{ const n=num(name); const pas=esPas(name);
    if(nv>=2&&nv<=4){ return pas?2:4; }
    if(nv===5){ if(pas)return 2; return (n===502||n===504)?3:4; }
    if(nv===6){ if(pas)return 2; return (n===605||n===606)?3:4; }
    if(nv===7){ return pas?2:3; }
    if(nv===8){ return pas?2:1; }
    if(nv===9){ return pas?2:0; } // N9 omitido → todo sin tocar (pasillo=2 marcador, aptos undefined→0)
    if(nv===10){ if(pas)return 2; return (n===1001||n===1002||n===1004)?1:0; }
    return undefined; });

// ───── DESPACHO ─────
corrAv('DESP','A', ['N2=4; PASILLOS=N','N3=4; PASILLOS=N','N4=4; PASILLOS=N','N5=3; PASILLOS=N','N6=1; PASILLOS=N','N7=1; PASILLOS=N','N8=1; PASILLOS=N'].join('\n'), 'despachoManual', MAT, NMAT,
  (nv,name)=>{ const pas=esPas(name);
    if(nv>=2&&nv<=4){ return pas?2:4; }
    if(nv===5){ return pas?2:3; }
    if(nv>=6&&nv<=8){ return pas?2:1; }
    return undefined; });
corrAv('DESP','B', ['N2=4; PASILLOS=N','N3=4; PASILLOS=N','N4=4; PASILLOS=N','N5=4; PASILLOS=N','N6=4; PASILLOS=N','N7=2; PASILLOS=N','N8=3; PASILLOS=N','N9=2; PASILLOS=N','N10=2; PASILLOS=N','N11=1; PASILLOS=N'].join('\n'), 'despachoManual', MAT, NMAT,
  (nv,name)=>{ const pas=esPas(name);
    if(nv>=2&&nv<=6){ return pas?2:4; }
    if(nv===7){ return pas?2:2; }
    if(nv===8){ return pas?2:3; }
    if(nv===9||nv===10){ return pas?2:2; }
    if(nv===11){ return pas?2:1; }
    return undefined; });

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
