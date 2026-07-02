/* v814: VINCULAR NOMBRES — alinear pólizas/anticipos al roster de COLABORADORES.
   Puras: _colMatchSuggest(nombre, colaboradores) → {colab, exact} | null
          _nombresPorVincular(polizas, anticipos, colaboradores) → [{tipo,id,nombreActual,colabIdActual,sugerencia}] */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
function extract(name){ const m=html.indexOf('function '+name+'('); if(m<0) return null; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){d--; if(d===0) return html.slice(m,i+1);}} return null; }

ok('_colMatchSuggest existe', html.indexOf('function _colMatchSuggest(')>=0);
ok('_nombresPorVincular existe', html.indexOf('function _nombresPorVincular(')>=0);
ok('expuestas en window', html.indexOf('window._nombresPorVincular')>=0);

const bSug=extract('_colMatchSuggest'), bVin=extract('_nombresPorVincular');
ok('_colMatchSuggest extraída', !!bSug);
ok('_nombresPorVincular extraída', !!bVin);
const roster=[{id:'c1',nombre:'JUAN PEREZ GOMEZ'},{id:'c2',nombre:'MARIA LOPEZ'},{id:'c3',nombre:'CARLOS RUIZ SOL'}];
if(bSug){
  const sug=new Function(bSug+'\n return _colMatchSuggest;')();
  ok('match EXACTO normalizado', (r=>r&&r.colab.id==='c1'&&r.exact===true)(sug('  juan   perez gomez ', roster)));
  ok('match FUZZY por tokens (JUAN PEREZ → JUAN PEREZ GOMEZ)', (r=>r&&r.colab.id==='c1'&&r.exact===false)(sug('JUAN PEREZ', roster)));
  ok('sin match razonable → null', sug('PEDRO ANONIMO', roster)===null);
  ok('un solo apellido común NO sugiere (umbral alto)', sug('PEDRO LOPEZ', roster)===null);
  const dup=[{id:'d1',nombre:'JUAN PEREZ GOMEZ'},{id:'d2',nombre:'JUAN PEREZ GOMEZ'}];
  ok('nombre DUPLICADO → exacto pero AMBIGUO', (r=>r&&r.exact===true&&r.ambiguo===true)(sug('JUAN PEREZ GOMEZ', dup)));
}
if(bSug && bVin){
  const fn=new Function(bSug+'\n'+bVin+'\n return _nombresPorVincular;')();
  const polizas=[
    {id:'p1', aCargoDeNombre:'JUAN PEREZ GOMEZ', aCargoDeColabId:'c1', estatus:'ACTIVA'}, // vinculada exacta → skip
    {id:'p2', aCargoDeNombre:'JUAN PEREZ', aCargoDeColabId:'', estatus:'ACTIVA'},          // sin id → incluir (sugg c1)
    {id:'p3', aCargoDeNombre:'MARIA LOPEZ', aCargoDeColabId:'cWRONG', estatus:'ACTIVA'}    // id no existe → incluir (sugg c2)
  ];
  const anticipos=[{id:'a1', colaboradorNombre:'CARLOS RUIZ SOL', colaboradorId:''}];      // sin id → incluir (sugg c3)
  const out=fn(polizas, anticipos, roster);
  const by=Object.fromEntries(out.map(x=>[x.id,x]));
  ok('p1 (vinculada exacta) NO aparece', !by['p1']);
  ok('p2 aparece con sugerencia c1', by['p2'] && by['p2'].tipo==='poliza' && by['p2'].sugerencia && by['p2'].sugerencia.colab.id==='c1');
  ok('p3 (id inexistente) aparece con sugerencia exacta c2', by['p3'] && by['p3'].sugerencia && by['p3'].sugerencia.colab.id==='c2' && by['p3'].sugerencia.exact===true);
  ok('a1 (anticipo) aparece con sugerencia c3', by['a1'] && by['a1'].tipo==='anticipo' && by['a1'].sugerencia && by['a1'].sugerencia.colab.id==='c3');
  ok('total 3 por vincular', out.length===3);
}

// v814: acciones + UI cableadas
ok('window._vincularUno existe', html.indexOf('window._vincularUno')>=0);
ok('window._vincularAuto existe', html.indexOf('window._vincularAuto')>=0);
ok('window._colabIdPorNombre existe', html.indexOf('window._colabIdPorNombre')>=0);
ok('el form de póliza guarda el ID (aCargoDeColabId via _colabIdPorNombre)', /aCargoDeColabId: \(\(typeof _colabIdPorNombre/.test(html));
ok('tab VINCULAR NOMBRES + vista vincular', /VINCULAR NOMBRES/.test(html) && /_polView=\\?'vincular\\?'|_polView === 'vincular'/.test(html));
ok('la vista vincular usa _nombresPorVincular + combobox inline', /_polView === 'vincular'\)\{[\s\S]{0,2500}_nombresPorVincular\(/.test(html) && /prComboInline\(comboId/.test(html));
ok('botón VINCULAR AUTOMÁTICO + VINCULAR por fila', /window\._vincularAuto\(\)/.test(html) && /window\._vincularUno\(/.test(html));
ok('botón del tab removido en v873 (render dormido)', !/VINCULAR NOMBRES'\+\(_vincN/.test(html));
// v814 (revisión adversarial): correcciones
const bApl=extract('_aplicarVinculo');
ok('FIX crítico: _aplicarVinculo lee state.polizasGlobales (no _getPolizas, fuera de scope)', !!bApl && /polizasGlobales/.test(bApl) && bApl.indexOf('_getPolizas(')<0);
ok('FIX permiso real via can(polizas.edit) en los handlers', /_puedeVincular[\s\S]{0,140}can\('polizas\.edit'\)/.test(html));
ok('FIX VINCULAR AUTOMÁTICO aplica solo exactos NO ambiguos', /x\.sugerencia\.exact && !x\.sugerencia\.ambiguo/.test(html));

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
