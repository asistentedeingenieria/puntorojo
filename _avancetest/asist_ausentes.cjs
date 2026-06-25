/* v837: KPI de AUSENTES en ASISTENCIA.
   _ausentes(personalGlobal, dia, obra) = asignados a la obra (no OFICINA, no multiObra) que hoy
   NO están presentes (marcados ausentes O sin marcar). obra='' → todas. Mismo universo que
   _faltanIngreso pero contando los no-presentes (no solo los pendientes). KPI clickeable. */
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

// ── funcional: _ausentes ──
const src = extractFn('_ausentes');
ok('extraída _ausentes', !!src);
if (src){
  const f = new Function(src + '\nreturn _ausentes;')();
  const personal=[
    {id:'p1',nombre:'A',obraAsignada:'E'},                 // presente → no ausente
    {id:'p2',nombre:'B',obraAsignada:'E'},                 // marcado ausente → ausente
    {id:'p3',nombre:'C',obraAsignada:'E'},                 // sin marcar → ausente
    {id:'p4',nombre:'D',obraAsignada:'T'},                 // presente (otra obra)
    {id:'p5',nombre:'E',obraAsignada:'E',tipo:'OFICINA'},  // oficina → excluido
    {id:'p6',nombre:'F',obraAsignada:'E',multiObra:true},  // multiObra → excluido
    {id:'p7',nombre:'G'},                                  // sin obraAsignada → excluido
    {id:'p8',nombre:'H',obraAsignada:'T'},                 // sin marcar (otra obra)
  ];
  const dia={ p1:{presente:true}, p2:{presente:false,motivo:'PERMISO'}, p4:{presente:true} };
  const aE=f(personal, dia, 'E').map(p=>p.id).sort();
  ok('obra E: ausentes = p2,p3', JSON.stringify(aE)===JSON.stringify(['p2','p3']));
  const aAll=f(personal, dia, '').map(p=>p.id).sort();
  ok('todas: ausentes = p2,p3,p8', JSON.stringify(aAll)===JSON.stringify(['p2','p3','p8']));
  ok('excluye OFICINA / multiObra / sin obraAsignada', aAll.indexOf('p5')<0 && aAll.indexOf('p6')<0 && aAll.indexOf('p7')<0);
}

// ── estructural: KPI + modal ──
ok('KPI AUSENTES usa _ausentes con el filtro de obra', /Ausentes<\/div><div class="val">\$\{\(typeof _ausentes==='function'\?_ausentes\(_getPersonalActivo\(\), dia, _obraFiltroK\)/.test(html));
ok('el KPI es clickeable al modal', /onclick="window\._asistAusentesModal&&window\._asistAusentesModal\(\)"/.test(html));
ok('modal _asistAusentesModal definido', /window\._asistAusentesModal\s*=\s*function/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
