/* v846: el PDF de AVANCE DE PAGOS POR APARTAMENTO tiraba "ReferenceError: paidPct5 is not defined".
   paidPct5 vive en el IIFE de pagos (~37695); _avAptoMetric (~12145, otro alcance) la llamaba bare.
   Fix: exponer window.paidPct5 y que _avAptoMetric la use por window. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractAt(startIdx){ let i=html.indexOf('{',startIdx),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(startIdx,i+1); } } return ''; }
function extractFn(name){ const m=html.indexOf('function '+name+'('); return m<0?'':extractAt(m); }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// estructural: paidPct5 expuesta + _avAptoMetric la usa por window
ok('paidPct5 expuesto en window', html.indexOf('window.paidPct5 = paidPct5')>=0);
const src = extractFn('_avAptoMetric');
ok('_avAptoMetric existe', !!src);
ok('_avAptoMetric llama window.paidPct5', src.indexOf('window.paidPct5(')>=0);
ok('_avAptoMetric ya NO llama paidPct5 bare', !/[^.]paidPct5\(/.test(src.replace(/window\.paidPct5\(/g,'')));

// funcional: la rama 'pago' NO debe tirar ReferenceError (inyectando window.paidPct5 + _avanceAptoNivelPago)
if(src){
  const fn = new Function('window','_avanceAptoNivelPago', src+'\nreturn _avAptoMetric;')(
    { paidPct5: function(){ return 50; } },
    function(pcts){ return { n:2, green:false }; }
  );
  let threw=false, r=null; try{ r=fn('pago', {id:'x',planilla:{pagos:[]}}, {id:'a1'}, null, 5); }catch(e){ threw=true; }
  ok('pago NO tira ReferenceError', !threw);
  ok('pago devuelve {n,green,pct}', !!(r && typeof r.n!=='undefined' && typeof r.green!=='undefined' && typeof r.pct!=='undefined'));
}

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail ? 1 : 0);
