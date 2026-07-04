/* v894: ESTADO DE FUERZA —
   (1) el encabezado PRESENTES del PDF va centrado igual que los números de su columna
       (columnStyles.halign de autoTable solo aplica al cuerpo, el head necesita su propio estilo);
   (2) con la torre "AMBAS TORRES" (v893) el grupo de producción y el de apoyo compartían título
       y salían DOS secciones "AMBAS TORRES" — se funden en una sola (PDF y modal). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. estructural: los DOS autoTable del estado de fuerza centran el head PRESENTES ──
const headsCentrados = (html.match(/head:\[\['PUESTO',\{content:'PRESENTES',styles:\{halign:'center'\}\}\]\]/g)||[]).length;
ok('ambos PDFs centran el encabezado PRESENTES', headsCentrados === 2);
ok('no queda ningún head PRESENTES sin estilo', !/head:\[\['PUESTO','PRESENTES'\]\]/.test(html));

// ── helpers para ejecutar las funciones extraídas ──
const stubs = {
  _pdfLogo: function(){},
  _efPuestoLabel: function(k){ return String(k); },
  _efApoyoOrden: function(){ return []; },
  _efProdTotales: function(){ return {}; },
};
function mkDoc(cap){
  const noop=function(){};
  return { internal:{pageSize:{width:595,height:842}}, setFont:noop, setTextColor:noop, setFontSize:noop,
    text:noop, setDrawColor:noop, setFillColor:noop, setLineWidth:noop, roundedRect:noop, rect:noop,
    addPage:noop, splitTextToSize:function(s){ return [String(s)]; },
    autoTable:function(o){ cap.opts=o; this.lastAutoTable={finalY:120}; } };
}
const resBase = function(){ return {
  total:6, sexoM:6, sexoF:0, sexoSin:0, sinClasificar:0,
  torresOrden:['TORRE A','AMBAS TORRES'],
  porTorre:{ 'TORRE A':{INSTALADOR:1}, 'AMBAS TORRES':{INSTALADOR:1} },
  apoyo:{ 'AYUDANTE_OBRA':4 }
}; };

// ── 2. PDF por torre: UNA sola sección AMBAS TORRES con producción + apoyo ──
const srcPdf = extractFn('_efDibujarObraTorre');
ok('_efDibujarObraTorre existe', !!srcPdf);
if (srcPdf) {
  const f = new Function('_pdfLogo','_efPuestoLabel','_efApoyoOrden','_efProdTotales', srcPdf + '\nreturn _efDibujarObraTorre;')(stubs._pdfLogo, stubs._efPuestoLabel, stubs._efApoyoOrden, stubs._efProdTotales);
  const cap = {}; f(mkDoc(cap), 'VICINIA', resBase(), '04/07/2026', '', true);
  const body = (cap.opts && cap.opts.body) || [];
  const secciones = body.filter(r => r[0] && typeof r[0]==='object' && r[0].content==='AMBAS TORRES');
  ok('PDF: una sola sección AMBAS TORRES', secciones.length === 1);
  const iAmbas = body.findIndex(r => r[0] && typeof r[0]==='object' && r[0].content==='AMBAS TORRES');
  const despues = body.slice(iAmbas+1).filter(r => Array.isArray(r) && typeof r[0]==='string');
  ok('PDF: la sección une producción y apoyo', despues.some(r=>r[0]==='INSTALADOR'&&r[1]==='1') && despues.some(r=>r[0]==='AYUDANTE_OBRA'&&r[1]==='4'));
  ok('PDF: el head del autoTable va centrado', cap.opts.head[0][1] && cap.opts.head[0][1].content==='PRESENTES' && cap.opts.head[0][1].styles.halign==='center');
  // sin torre AMBAS pero con apoyo → conserva la sección de apoyo (regresión v758)
  const cap2 = {}; const res2 = resBase(); delete res2.porTorre['AMBAS TORRES']; res2.torresOrden=['TORRE A'];
  f(mkDoc(cap2), 'VICINIA', res2, '04/07/2026', '', true);
  const secc2 = (cap2.opts.body||[]).filter(r => r[0] && typeof r[0]==='object' && r[0].content==='AMBAS TORRES');
  ok('PDF: sin bucket AMBAS, el apoyo mantiene su sección', secc2.length === 1);
}

// ── 3. modal (HTML): UNA sola sección AMBAS TORRES ──
const srcModal = extractFn('_estadoFuerzaTorreHtml');
ok('_estadoFuerzaTorreHtml existe', !!srcModal);
if (srcModal) {
  const g = new Function('_efPuestoLabel','_efApoyoOrden','_efProdTotales', srcModal + '\nreturn _estadoFuerzaTorreHtml;')(stubs._efPuestoLabel, stubs._efApoyoOrden, stubs._efProdTotales);
  const out = g(resBase(), true);
  ok('modal: una sola sección AMBAS TORRES', (out.match(/>AMBAS TORRES</g)||[]).length === 1);
  ok('modal: producción y apoyo presentes', out.indexOf('INSTALADOR')>=0 && out.indexOf('AYUDANTE_OBRA')>=0);
}

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
