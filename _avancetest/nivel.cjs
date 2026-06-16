/* TDD: las 3 vistas "AVANCE POR APARTAMENTO" comparten el ícono de 4 cuadritos + cheque verde,
   pero con la nomenclatura unificada de la Foto 1 (4 etapas). Cada vista decide el NIVEL
   (cuántos cuadritos rojos 0..4, o cheque verde) con su propia lógica:
   - FÍSICO: term de 6 etapas físicas → 4 etapas (1RA=tabique1cara, 2DA=tabique2caras,
             3RA=estructura+forro, 4TA=masilla+lija). Cheque = acuse firmado.
   - COBRO: % acumulado → 25/50/75/95 cuadros, 100% cheque.
   - PAGO: etapas pagadas → e1=1, e2&e3=2, e4=3, e5@90=4, e5@100 cheque. */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function ext(name){ const m=html.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}')); if(!m){ console.log('NO '+name+' FOUND'); process.exit(2);} return m[0]; }
const F=new Function(ext('_avanceAptoNivelFisico')+'\nreturn _avanceAptoNivelFisico;')();
const C=new Function(ext('_avanceAptoNivelCobro')+'\nreturn _avanceAptoNivelCobro;')();
const G=new Function(ext('_avanceAptoNivelPago')+'\nreturn _avanceAptoNivelPago;')();

let pass=0, fail=0;
const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// FÍSICO: term físico 0/1→0, 2/3→1, 4→2, 5→3, 6→4; acuse firmado → cheque
ok('fis term0 => 0', F(0,false).n===0 && !F(0,false).green);
ok('fis term1 (solo estructura) => 0', F(1,false).n===0);
ok('fis term2 (tabique 1 cara) => 1', F(2,false).n===1);
ok('fis term3 (refuerzos) sigue => 1', F(3,false).n===1);
ok('fis term4 (tabique 2 caras) => 2', F(4,false).n===2);
ok('fis term5 (estructura+forro) => 3', F(5,false).n===3);
ok('fis term6 (masilla+lija) => 4', F(6,false).n===4 && !F(6,false).green);
ok('fis acuse firmado => cheque verde', F(6,true).green===true);

// COBRO: 25/50/75/95 cuadros, 100% cheque
ok('cob 0% => 0', C(0).n===0);
ok('cob 24% => 0 (aun no 25)', C(24).n===0);
ok('cob 25% => 1', C(25).n===1);
ok('cob 50% => 2', C(50).n===2);
ok('cob 74% => 2', C(74).n===2);
ok('cob 75% => 3', C(75).n===3);
ok('cob 94% => 3', C(94).n===3);
ok('cob 95% => 4', C(95).n===4 && !C(95).green);
ok('cob 100% => cheque', C(100).green===true);

// PAGO: etapas [e1,e2,e3,e4,e5] en %
ok('pago e1=100 => 1', G([100,0,0,0,0]).n===1);
ok('pago e1 solo, e2<100 => 1 (no sube a 2)', G([100,50,0,0,0]).n===1);
ok('pago e1,e2,e3=100 => 2', G([100,100,100,0,0]).n===2);
ok('pago e2 100 pero e3<100 => 1', G([100,100,50,0,0]).n===1);
ok('pago hasta e4=100 => 3', G([100,100,100,100,0]).n===3);
ok('pago e5=90 => 4', G([100,100,100,100,90]).n===4 && !G([100,100,100,100,90]).green);
ok('pago e5=100 => cheque', G([100,100,100,100,100]).green===true);
ok('pago nada => 0', G([0,0,0,0,0]).n===0);

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
