/* v848: análisis de "apartamentos desparejos". Lógica PURA _avAnalisisTorreApt(units, TOL):
   referencia=FÍSICO, marca un apto si una dimensión difiere > TOL% del físico; dimensión "plana"
   (>=90% en 0%) → nota de torre y se excluye; áreas comunes excluidas; "sin datos" = !cuenta. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractAt(startIdx){ let i=html.indexOf('{',startIdx),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(startIdx,i+1); } } return ''; }
function extractFn(name){ const m=html.indexOf('function '+name+'('); return m<0?'':extractAt(m); }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const src = extractFn('_avAnalisisTorreApt');
ok('_avAnalisisTorreApt existe', !!src);
function ap(name,f,c,m,pg,comun){ return { name:name, esComun:!!comun, m:{ fisico:{pct:f,cuenta:true}, cobro:{pct:c,cuenta:c>0}, material:{pct:m,cuenta:m>0}, pago:{pct:pg,cuenta:true} } }; }
if(src){
  const fn = new Function(src+'\nreturn _avAnalisisTorreApt;')();
  // 1) desparejo real: físico 83, cobro 0, pago 25 (con un par parejos para que cobro NO sea plano)
  var r1 = fn([ ap('1001',83,0,100,25), ap('a',83,100,100,100), ap('b',83,100,100,100) ], 40);
  var d1 = r1.desparejos.find(function(d){return d.name==='1001';});
  ok('marca el apto desparejo real', !!d1);
  ok('cobro y pago fuera de tolerancia se marcan', d1 && d1.dims.some(function(d){return d.tipo==='cobro';}) && d1.dims.some(function(d){return d.tipo==='pago';}));
  ok('material dentro de tolerancia (100 vs 83) NO se marca', d1 && !d1.dims.some(function(d){return d.tipo==='material';}));
  ok('los parejos no se marcan', !r1.desparejos.some(function(d){return d.name==='a'||d.name==='b';}));
  // 2) todo parejo → nada
  ok('apto 100/100/100/100 no se marca', fn([ ap('201',100,100,100,100) ],40).desparejos.length===0);
  // 3) físico plano (todos 0) → nota, sin per-apto
  var r3 = fn([ ap('a',0,100,100,100), ap('b',0,100,100,100), ap('c',0,100,100,100) ], 40);
  ok('físico plano → nota de torre + 0 desparejos', r3.notas.some(function(n){return /F[IÍ]SICO/i.test(n);}) && r3.desparejos.length===0);
  // 4) cobro plano → nota + cobro excluido del per-apto
  var r4 = fn([ ap('a',100,0,100,100), ap('b',100,0,100,100), ap('c',100,0,100,100) ], 40);
  ok('cobro plano → nota de torre', r4.notas.some(function(n){return /COBRO/i.test(n);}));
  ok('cobro plano no marca apto por apto', r4.desparejos.length===0);
  // 5) área común excluida del análisis
  var r5 = fn([ ap('PASILLO',100,0,0,100,true) ], 40);
  ok('área común no participa (sin desparejos ni notas)', r5.desparejos.length===0 && r5.notas.length===0);
  // 6) "sin datos" se marca con bandera sinDatos
  var r6 = fn([ ap('a',100,100,100,100), ap('b',100,100,100,100), ap('x',100,0,100,100) ], 40);
  var d6 = r6.desparejos.find(function(d){return d.name==='x';});
  ok('apto con cobro sin datos se marca como sinDatos', !!d6 && d6.dims.some(function(d){return d.tipo==='cobro' && d.sinDatos===true;}));
  // 7) ordenado por severidad (mayor brecha primero)
  var r7 = fn([ ap('leve',100,55,100,100), ap('grave',100,0,100,100), ap('c',100,100,100,100), ap('d',100,100,100,100) ], 40);
  ok('ordena por severidad desc', r7.desparejos.length>=2 && r7.desparejos[0].name==='grave');
}

// estructural: gathering + UI + PDF + tarjeta del dashboard
ok('_avAnalisisDesparejos expuesto', html.indexOf('window._avAnalisisDesparejos=_avAnalisisDesparejos')>=0);
ok('_avEsAreaComun excluye comunes', html.indexOf('function _avEsAreaComun(')>=0 && /PASILLO[\s\S]{0,60}CINE/.test(html));
ok('snapshot incluye cuenta (sin datos exacto)', /lObj\.aptos\.push\(\{[\s\S]{0,140}cuenta:m\.cuenta/.test(html));
ok('UI _avDesparejosUI + _avDesparejosHTML', html.indexOf('window._avDesparejosUI=')>=0 && html.indexOf('function _avDesparejosHTML(')>=0);
ok('PDF _pdfAnalisisDesparejos expuesto', html.indexOf('window._pdfAnalisisDesparejos=_pdfAnalisisDesparejos')>=0);
ok('tarjeta dashboard con botón ANALIZAR', html.indexOf('id="dashDesparejos"')>=0 && /onclick="window\._avDesparejosUI\(\)"/.test(html));
ok('botón PDF cableado', /id="btnDesparejosPdf"[\s\S]{0,120}_pdfAnalisisDesparejos/.test(html));

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail ? 1 : 0);
