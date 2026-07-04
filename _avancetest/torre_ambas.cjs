/* v893: opción "AMBAS TORRES" en el selector de torre del colaborador (COLABORADORES),
   para proyectos con 2+ torres. Se guarda como p.torre='AMBAS TORRES' (string plano) y el
   ESTADO DE FUERZA la muestra como su propio grupo, ordenado: torres con nombre → AMBAS
   TORRES → SIN TORRE al final. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. el desplegable inline ofrece AMBAS TORRES (con su selected) ──
ok('opción AMBAS TORRES en el selector', /value="AMBAS TORRES"/.test(html) && />AMBAS TORRES<\/option>/.test(html));
ok('marca selected cuando ya está asignada', /'AMBAS TORRES'\s*\?\s*' selected'/.test(html) || /==='AMBAS TORRES'\?' selected'/.test(html));

// ── 2. estado de fuerza: AMBAS TORRES es su propio grupo, ordenado antes de SIN TORRE ──
const src = extractFn('_estadoFuerzaPorTorre');
ok('_estadoFuerzaPorTorre existe', !!src);
if (src) {
  const f = new Function(src + '\nreturn _estadoFuerzaPorTorre;')();
  const personal = [
    { id:'1', puesto:'INSTALADOR', torre:'TORRE B' },
    { id:'2', puesto:'INSTALADOR', torre:'AMBAS TORRES' },
    { id:'3', puesto:'MASILLERO' },                    // sin torre
    { id:'4', puesto:'MASILLERO', torre:'TORRE A' },
    { id:'5', puesto:'INSTALADOR', torre:'AMBAS TORRES' },
  ];
  const dia = { '1':{presente:true}, '2':{presente:true}, '3':{presente:true}, '4':{presente:true}, '5':{presente:true} };
  const res = f(personal, dia, []);
  ok('AMBAS TORRES es su propio grupo con conteo', res.porTorre['AMBAS TORRES'] && res.porTorre['AMBAS TORRES'].INSTALADOR === 2);
  ok('las torres con nombre no se contaminan', res.porTorre['TORRE A'].MASILLERO === 1 && res.porTorre['TORRE B'].INSTALADOR === 1);
  ok('orden: nombradas → AMBAS TORRES → SIN TORRE', JSON.stringify(res.torresOrden) === JSON.stringify(['TORRE A','TORRE B','AMBAS TORRES','SIN TORRE']));
}

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
