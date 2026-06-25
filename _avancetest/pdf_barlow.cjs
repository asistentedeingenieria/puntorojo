/* v825/v827: tipografía de la app dentro de los PDFs (jsPDF). v827: Familjen Grotesk (variable).
   La fuente (TTF) se baja una vez de un CDN con CORS y se cachea en localStorage (base64, una
   sola string); se aplica de forma CENTRAL envolviendo el constructor de jsPDF (doc.text) y
   autoTable (tablas), sin tocar cada generador. Si la fuente aún no cargó, cae a Helvetica
   (sin crashear). Alias interno de la fuente en el PDF: 'AppFont' (genérico, para futuros swaps). */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// loader + cache
ok('window._pdfBarlow (loader) existe', html.indexOf('window._pdfBarlow')>=0);
ok('cachea en localStorage (key versionada v2)', /pr_pdf_font_v2/.test(html));
ok('baja el TTF de Familjen (variable) desde un CDN con CORS', /cdn\.jsdelivr\.net\/gh\/google\/fonts@main\/ofl\/familjengrotesk\/FamiljenGrotesk%5Bwght%5D\.ttf/.test(html));
ok('tiene prefetch + ready', /prefetch:/.test(html) && /ready:/.test(html));

// registro en el doc
ok('_pdfApplyBarlow registra la fuente en el doc', html.indexOf('function _pdfApplyBarlow')>=0);
ok('addFont AppFont normal+bold (misma TTF variable)', /addFont\('AppFont-N\.ttf','AppFont','normal'\)/.test(html) && /addFont\('AppFont-B\.ttf','AppFont','bold'\)/.test(html));
ok('deja AppFont como fuente activa', /setFont\('AppFont','normal'\)/.test(html));
ok('cae a Helvetica si no cargó (return false sin crashear)', /function _pdfApplyBarlow\(doc\)\{[\s\S]{0,400}return false/.test(html));

// parche central
ok('envuelve el constructor de jsPDF', /window\.jspdf\.jsPDF\s*=\s*Wrapped/.test(html) && /__barlowPatched/.test(html));
ok('el wrap aplica la fuente a cada doc nuevo', /function Wrapped\([\s\S]{0,160}_pdfApplyBarlow\(doc\)/.test(html));
ok('autoTable usa AppFont por defecto (sin pisar font ya puesto)', /\.styles\.font\s*=\s*'AppFont'/.test(html) && /__barlowAT/.test(html));
ok('autoTable solo inyecta en la forma de objeto-único', /!Array\.isArray/.test(html));
ok('prefetch se dispara al arrancar', /_pdfBarlow\.prefetch\(\)/.test(html));

// ── FUNCIONAL: _pdfApplyBarlow contra un doc jsPDF simulado (cache = base64 string) ──
function extractFn(name){ const m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
const srcApply=extractFn('_pdfApplyBarlow');
ok('_pdfApplyBarlow extraída', !!srcApply);
if(srcApply){
  const make=(ready)=> new Function('window', srcApply+'\nreturn _pdfApplyBarlow;')({ _pdfBarlow:{ ready:function(){ return ready; } } });
  function mockDoc(){ const calls={vfs:0,fonts:[],setF:null}; return { addFileToVFS:function(){calls.vfs++;}, addFont:function(f,fam,st){calls.fonts.push(fam+'/'+st);}, setFont:function(fam,st){calls.setF=fam+'/'+st;}, _c:calls }; }
  // con fuente lista (base64 string)
  const apply1=make('AAAABBBB'); const d1=mockDoc(); const r1=apply1(d1);
  ok('FUNC con fuente -> true', r1===true);
  ok('FUNC registra AppFont normal + bold', d1._c.fonts.indexOf('AppFont/normal')>=0 && d1._c.fonts.indexOf('AppFont/bold')>=0);
  ok('FUNC 2 archivos VFS (misma TTF para ambos)', d1._c.vfs===2);
  ok('FUNC deja AppFont activa', d1._c.setF==='AppFont/normal');
  // idempotente: re-aplicar no re-registra VFS pero sí re-setea
  apply1(d1);
  ok('FUNC idempotente (no re-registra VFS)', d1._c.vfs===2);
  // sin fuente -> helvetica (false, sin tocar el doc)
  const apply0=make(null); const d0=mockDoc(); const r0=apply0(d0);
  ok('FUNC sin fuente -> false (cae a Helvetica)', r0===false);
  ok('FUNC sin fuente NO toca el doc', d0._c.vfs===0 && d0._c.setF===null);
}

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
