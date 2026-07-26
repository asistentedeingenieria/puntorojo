/* v976 (pedido de Antonio 26-jul): en proyectos con 2+ torres, DESCARGAR PDF de avance
   por apartamento bajaba UN archivo POR TORRE (v833) y el navegador/visor solo dejaba
   pasar uno (Chrome bloquea descargas múltiples automáticas; el visor in-app muestra
   solo el último). Ahora se arma UN SOLO PDF con TODAS las torres — una torre arranca
   en página nueva — y se descarga UNA vez: funciona igual en desktop, Android e iPhone.
   _pdfAvanceReporteTorreDoc acepta un doc existente (pinta adentro, no descarga). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFrom(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zRep = extractFrom('function _pdfAvanceReporte(tipo)');
ok('_pdfAvanceReporte existe', !!zRep);
ok('arma UN doc y agrega página por torre (no un archivo por torre)', /if\s*\(\s*i\s*>\s*0\s*\)\s*doc\.addPage\(\)/.test(zRep.replace(/\n/g,' ')));
ok('descarga UNA sola vez desde el reporte', (zRep.match(/_pdfDescargar\(/g) || []).length === 1);

const zTd = extractFrom('function _pdfAvanceReporteTorreDoc(');
ok('la función de torre acepta doc existente', /function _pdfAvanceReporteTorreDoc\(tipo, p, snap, t, docExistente\)/.test(html) && /docExistente \|\| new jsPDF/.test(zTd));
ok('con doc existente NO descarga (descarga el llamador)', /if\s*\(\s*!docExistente\s*\)/.test(zTd.replace(/\n/g,' ')));

// funcional: 2 torres ⇒ 1 descarga, 2 pintadas de torre sobre EL MISMO doc, 1 addPage
let fn = null;
try {
  fn = new Function('window', 'activeProj', '_avReporteSnapshot', '_pdfAvanceReporteTorreDoc', '_pdfDescargar', 'showToast',
    'return (' + zRep.slice(zRep.indexOf('function')) + ')');
} catch(e){}
if (fn) {
  const calls = { torre: [], descargas: 0, addPages: 0 };
  function JS(){ this.addPage = () => { calls.addPages++; }; }
  const win = { jspdf: { jsPDF: JS } };
  const snap = { torres: [{name:'TORRE A'},{name:'TORRE B'}], titulo: 'AVANCE FÍSICO POR APARTAMENTO', kpis:{} };
  fn(win, () => ({ name: 'PROY' }), () => snap, function(tipo,p,s,t,doc){ calls.torre.push(doc); }, () => { calls.descargas++; }, () => {})('fisico');
  ok('funcional: 2 torres ⇒ 2 pintadas en el MISMO doc', calls.torre.length === 2 && calls.torre[0] && calls.torre[0] === calls.torre[1]);
  ok('funcional: UNA sola descarga', calls.descargas === 1);
  ok('funcional: página nueva entre torres', calls.addPages === 1);
} else ok('_pdfAvanceReporte evaluable', false);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
