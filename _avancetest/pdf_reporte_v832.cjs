/* v832: PDF de AVANCE POR APARTAMENTO — generador + cuadrito + botones.
   Estructural (funciones, wiring, 4 botones) + funcional (cuadrito dibuja primitivas correctas;
   el generador corre de punta a punta contra un jsPDF SIMULADO sin lanzar). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0; const ok = (n, c) => c ? pass++ : (fail++, console.log('FAIL ' + n));

function extractFn(name){
  const m = html.indexOf('function ' + name + '(');
  if (m < 0) return '';
  let i = html.indexOf('{', m), d = 0;
  for (; i < html.length; i++){ if (html[i] === '{') d++; else if (html[i] === '}'){ d--; if (d === 0) return html.slice(m, i + 1); } }
  return '';
}

// ── estructural ──
ok('_pdfAvanceReporte(tipo) existe', /function _pdfAvanceReporte\(tipo\)/.test(html));
ok('generador usa _avReporteSnapshot(tipo, p)', /_avReporteSnapshot\(tipo, p\)/.test(html));
ok('generador entrega con _pdfDescargar(doc, fn)', /_pdfDescargar\(doc, fn\)/.test(html));
ok('generador pone el logo (_pdfLogo)', /function _pdfAvanceReporte[\s\S]{0,1500}_pdfLogo\(doc\)/.test(html));
ok('_pdfDrawCuadrito existe', /function _pdfDrawCuadrito\(doc, cx, cy, n, green\)/.test(html));
ok('_pdfDrawLeyendaReporte existe', /function _pdfDrawLeyendaReporte\(/.test(html));
ok('cuadrito verde se dibuja con círculo + líneas (no glifo ✓)', /doc\.circle\(cx, cy, 7, 'F'\)[\s\S]{0,160}doc\.line\(/.test(html));
// 4 botones
ok('botón físico', /onclick="_pdfAvanceReporte\('fisico'\)"/.test(html));
ok('botón cobro', /onclick="_pdfAvanceReporte\('cobro'\)"/.test(html));
ok('botón pago', /onclick="_pdfAvanceReporte\('pago'\)"/.test(html));
ok('botón material (string JS escapado)', /onclick="_pdfAvanceReporte\(\\'material\\'\)"/.test(html));

// ── funcional: _pdfDrawCuadrito ──
(function(){
  const src = extractFn('_pdfDrawCuadrito');
  ok('extraída _pdfDrawCuadrito', !!src);
  if(!src) return;
  const draw = new Function(src + '\nreturn _pdfDrawCuadrito;')();
  function mock(){ const c={fills:[],rects:0,circles:0,lines:0}; return {
    setFillColor:function(){ c.fills.push(Array.from(arguments).join(',')); },
    setDrawColor:function(){}, setLineWidth:function(){},
    circle:function(){ c.circles++; }, rect:function(){ c.rects++; }, line:function(){ c.lines++; }, _c:c }; }
  const g=mock(); draw(g, 30,30,4,true);
  ok('verde: 1 círculo + 2 líneas + 0 rects', g._c.circles===1 && g._c.lines===2 && g._c.rects===0);
  const n2=mock(); draw(n2, 30,30,2,false);
  ok('n=2: 4 rects', n2._c.rects===4);
  ok('n=2: 2 celdas azul marino', n2._c.fills.filter(f=>f==='37,71,176').length===2);
  ok('n=2: 2 celdas vacías (blancas)', n2._c.fills.filter(f=>f==='255,255,255').length===2);
  const n0=mock(); draw(n0, 30,30,0,false);
  ok('n=0: 0 celdas azul marino', n0._c.fills.filter(f=>f==='37,71,176').length===0);
})();

// ── funcional: el generador completo corre sin lanzar ──
(function(){
  const names=['_avAptoNombre','_avAptoMetric','_avReporteSnapshot','_avanceAptoNivelFisico','_avanceAptoNivelCobro','_avanceAptoNivelMaterial','_avanceAptoNivelPago','_pdfDrawCuadrito','_pdfDrawLeyendaReporte','_pdfAvanceReporte'];
  const src=names.map(extractFn).join('\n');
  const captured={ fn:null, text:0, rect:0, circle:0, pages:1 };
  function FakeDoc(){ this.internal={pageSize:{width:595,height:842}}; }
  FakeDoc.prototype.setFontSize=function(){return this;};
  FakeDoc.prototype.setFont=function(){return this;};
  FakeDoc.prototype.setTextColor=function(){return this;};
  FakeDoc.prototype.setFillColor=function(){return this;};
  FakeDoc.prototype.setDrawColor=function(){return this;};
  FakeDoc.prototype.setLineWidth=function(){return this;};
  FakeDoc.prototype.text=function(){captured.text++;return this;};
  FakeDoc.prototype.rect=function(){captured.rect++;return this;};
  FakeDoc.prototype.circle=function(){captured.circle++;return this;};
  FakeDoc.prototype.line=function(){return this;};
  FakeDoc.prototype.addImage=function(){return this;};
  FakeDoc.prototype.addPage=function(){captured.pages++;return this;};
  const P={ name:'TORELO', materiales:{pedidos:[],ordenes:[]}, cobro:{avanceAptos:{}}, towers:[{name:'TORRE 1',levels:[{id:'l1',name:'NIVEL 2',aptos:[
    {id:'a1',name:'APARTAMENTO 2A',stages:[true,true,false,false,false,false]},
    {id:'a2',name:'2B',stages:[true,true,true,true,true,true],_acuse:{0:1,1:1,2:1,3:1,4:1,5:1}} ]}]}] };
  const win={ jspdf:{ jsPDF:FakeDoc }, _sortPasilloUltimo:(a)=>a };
  const globals={
    window:win, activeProj:()=>P, showToast:()=>{},
    _pdfLogo:()=>{}, _pdfDescargar:(doc,fn)=>{ captured.fn=fn; },
    getEtapasP:()=>[1,2,3,4,5], tieneAcuseFirmado:(a,i)=>!!(a._acuse&&a._acuse[i]),
    paidPct5:()=>0, _etapaDespachoPct:()=>0, _recetaEtapaItemKeys:()=>[], _itemsDespachadosEtapa:()=>[],
  };
  const run=new Function(...Object.keys(globals), src+'\nreturn _pdfAvanceReporte;')(...Object.values(globals));
  let threw=false; try{ run('fisico'); }catch(e){ threw=true; console.log('  generador lanzó:', e&&e.message); }
  ok('generador físico corre sin lanzar', !threw);
  ok('entregó un PDF con nombre del reporte', /AVANCE F[IÍ]SICO POR APARTAMENTO - TORELO\.pdf/.test(captured.fn||''));
  ok('dibujó texto (título/nombres) y figuras (cuadritos)', captured.text>0 && (captured.rect>0||captured.circle>0));
  // los 4 tipos corren sin lanzar
  let allOk=true; ['cobro','material','pago'].forEach(t=>{ try{ run(t); }catch(e){ allOk=false; } });
  ok('cobro/material/pago también corren sin lanzar', allOk);
})();

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
