/* v782: visor de PDF in-app para Android (WebView de Capacitor no descarga blobs).
   Lógica pura: el router _pdfModoEntrega decide save/anchor/viewer según entorno. */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function ext(name){ const m=html.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}')); return m?m[0]:''; }
let pass=0,fail=0;const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const src=ext('_pdfModoEntrega');
ok('_pdfModoEntrega existe', !!src);
if(src){
  const f=new Function(src+'\nreturn _pdfModoEntrega;')();
  ok('app nativa -> viewer', f(true,true)==='viewer');
  ok('app nativa (UA no movil) -> viewer', f(true,false)==='viewer');
  ok('navegador movil -> anchor (en Chrome SI descarga)', f(false,true)==='anchor');
  ok('escritorio -> save', f(false,false)==='save');
}
const srcDesc=ext('_pdfDescargar');
ok('_pdfDescargar existe', !!srcDesc);
ok('_pdfDescargar usa el router _pdfModoEntrega', srcDesc.indexOf('_pdfModoEntrega')>=0);
ok('_pdfDescargar abre el visor en nativo', srcDesc.indexOf('_pdfAbrirVisor')>=0);
ok('_pdfDescargar conserva el camino anchor (movil navegador)', srcDesc.indexOf('createObjectURL')>=0);

ok('_pdfAbrirVisor existe', html.indexOf('function _pdfAbrirVisor')>=0);
const srcCarga=ext('_cargarPdfJs');
ok('_cargarPdfJs existe', !!srcCarga);
ok('_cargarPdfJs reutiliza/carga pdf.js (pdf.min.js)', srcCarga.indexOf('pdf.min.js')>=0);
ok('_cargarPdfJs setea el worker de pdf.js', srcCarga.indexOf('pdf.worker.min.js')>=0);
ok('renderiza a canvas', /function _pdfAbrirVisor[\s\S]{0,3500}createElement\('canvas'\)/.test(html));

// v782: offline — pdf.js + worker precacheados en sw.js para que el visor ande sin señal
const sw=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8');
ok('sw.js precachea pdf.min.js', /pdf\.js\/[\d.]+\/pdf\.min\.js/.test(sw));
ok('sw.js precachea pdf.worker.min.js', /pdf\.js\/[\d.]+\/pdf\.worker\.min\.js/.test(sw));

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
