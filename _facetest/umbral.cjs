/* TDD: el umbral de reconocimiento del kiosko (pickFaceCandidates en _kioskTick) estaba en
   0.44 — demasiado ESTRICTO para obra. Sintoma confirmado en campo: la cara SE DETECTA pero
   NO se reconoce ("NO TE RECONOZCO") parejo para cualquiera, porque en luz/angulos reales las
   lecturas caen seguido en la banda 0.44-0.54 (zona gris = no marca). Se afloja strict a >=0.50
   manteniendo el margen anti-ambiguedad (0.10) y los 2 cuadros seguidos como red de seguridad
   contra marcar a la persona equivocada. */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');

let pass=0, fail=0;
const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// 1) El kiosko llama pickFaceCandidates(all, strict, loose, margin): strict aflojado, margen intacto.
const calls=[...html.matchAll(/pickFaceCandidates\(all\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\)/g)];
ok('hay al menos 2 llamadas del kiosko', calls.length>=2);
calls.forEach((c,i)=>{
  const strict=parseFloat(c[1]), margin=parseFloat(c[3]);
  ok('call'+i+' strict aflojado (>=0.50)', strict>=0.50);
  ok('call'+i+' margen anti-ambiguedad intacto (>=0.10)', margin>=0.10);
});

// 2) Con el umbral nuevo, una lectura de 0.48 (antes rechazada) AHORA reconoce (auto).
const m=html.match(/function pickFaceCandidates\([\s\S]*?\n\}/);
if(!m){ console.log('NO pickFaceCandidates FOUND'); process.exit(2); }
const pick=new Function(m[0]+'\nreturn pickFaceCandidates;')();
const r=pick([{id:'a',distance:0.48},{id:'b',distance:0.80}], 0.50, 0.54, 0.10);
ok('0.48 ahora reconoce (auto)', r.status==='auto' && r.matchId==='a');
// 3) Sigue protegido: si un 2do candidato esta a <0.10 de margen, NO marca (ambiguo) aunque entre.
const r2=pick([{id:'a',distance:0.48},{id:'b',distance:0.55}], 0.50, 0.54, 0.10);
ok('ambiguo (margen<0.10) NO marca aunque entre en umbral', r2.status!=='auto');

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
