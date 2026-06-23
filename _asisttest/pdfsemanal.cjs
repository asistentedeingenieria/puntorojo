/* v802: PDF semanal de asistencia. Puras: _semanaLunSab (6 fechas lun-sáb) y
   _asistSemanaFilas (roster por obra + ✓/✗ por día). */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
function extract(name){ const m=html.indexOf('function '+name+'('); if(m<0) return null; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){d--; if(d===0) return html.slice(m,i+1);}} return null; }
const dow=(k)=>new Date(k+'T12:00:00').getDay();

// estructura
ok('_semanaLunSab existe', html.indexOf('function _semanaLunSab(')>=0);
ok('_asistSemanaFilas existe', html.indexOf('function _asistSemanaFilas(')>=0);
ok('_generarPdfSemanal existe', html.indexOf('function _generarPdfSemanal(')>=0);
ok('abrirPdfSemanal existe', html.indexOf('window.abrirPdfSemanal')>=0 || html.indexOf('function abrirPdfSemanal(')>=0);
ok('botón PDF SEMANAL en markup', /PDF SEMANAL/.test(html) && /abrirPdfSemanal\(\)/.test(html));
ok('dibuja ✓/✗ vectorial (didDrawCell)', /didDrawCell/.test(html));

// funcional: _semanaLunSab
const bS=extract('_semanaLunSab');
ok('_semanaLunSab extraída', !!bS);
if(bS){
  const sem=new Function(bS+'\n return _semanaLunSab;')();
  const w=sem('2026-06-24'); // miércoles
  ok('devuelve 6 fechas', Array.isArray(w) && w.length===6);
  ok('arranca lunes', dow(w[0])===1);
  ok('termina sábado', dow(w[5])===6);
  ok('días consecutivos', (new Date(w[5]+'T12:00:00')-new Date(w[0]+'T12:00:00'))===5*86400000);
  // domingo cae a la semana ANTERIOR (lun-sáb previos)
  const wd=sem('2026-06-21'); // si 21 es domingo
  ok('formato YYYY-MM-DD', /^\d{4}-\d{2}-\d{2}$/.test(w[0]));
}

// funcional: _asistSemanaFilas
const bF=extract('_asistSemanaFilas');
ok('_asistSemanaFilas extraída', !!bF);
if(bF){
  const filas=new Function(bF+'\n return _asistSemanaFilas;')();
  const wk=['2026-06-22','2026-06-23','2026-06-24','2026-06-25','2026-06-26','2026-06-27'];
  const personal=[
    {id:'a',nombre:'ANA',puesto:'INSTALADOR',obraAsignada:'OBRA1'},
    {id:'b',nombre:'BETO',puesto:'MASILLERO',obraAsignada:'OBRA2'}, // otra obra
    {id:'c',nombre:'CARLA',puesto:'AYUDANTE',obraAsignada:'',baja:true} // baja
  ];
  const asis={
    '2026-06-22':{ a:{presente:true,obraId:'OBRA1'} },
    '2026-06-24':{ a:{presente:true,obraId:'OBRA1'}, b:{presente:true,obraId:'OBRA1'} } // beto presente en OBRA1 ese día
  };
  const r=filas(personal, asis, 'OBRA1', wk);
  const ana=r.find(x=>x.id==='a');
  ok('incluye a ANA (asignada a la obra)', !!ana);
  ok('ANA presente lun y mié, ausente resto', ana.dias[0]===true && ana.dias[1]===false && ana.dias[2]===true && ana.total===2);
  ok('incluye a BETO (presente en la obra aunque asignado a otra)', !!r.find(x=>x.id==='b'));
  ok('excluye dados de baja', !r.find(x=>x.id==='c'));
}

// v809: estilo del PDF semanal (días completos, sin leyenda, mayúscula, menos cuadrícula, nombre 1 fila)
const bP=extract('_generarPdfSemanal');
ok('_generarPdfSemanal extraída', !!bP);
if(bP){
  ok('v809 días completos (LUNES/MARTES/MIÉRCOLES...)', /LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO'/.test(bP));
  ok('v809 sin la leyenda "(cheque = llegó · X = no llegó)"', bP.indexOf('cheque = llegó')<0);
  ok('v809 título de semana en MAYÚSCULA (SEMANA DEL ... AL ...)', /'SEMANA DEL '/.test(bP) && /' AL '/.test(bP));
  ok('v809 tabla menos cuadrícula (theme striped)', /theme:'striped'/.test(bP));
  ok('v809 nombre en una sola fila: columna NOMBRE ancha (_wName)', /cellWidth:_wName/.test(bP));
}

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
