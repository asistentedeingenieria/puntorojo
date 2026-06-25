/* v838: REPORTE MENSUAL de asistencia (acceso restringido por permiso personal.asistenciaMensual).
   Por persona, TODOS los días del mes con ENTRADA, SALIDA y UBICACIÓN (EN OBRA / FUERA) de
   entrada Y salida. Helpers puros: _mesesRecientes, _asistUbic (geo), _asistMesFilas. */
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

// ── _mesesRecientes ──
const srcMes = extractFn('_mesesRecientes');
ok('extraída _mesesRecientes', !!srcMes);
if (srcMes){
  const mr = new Function(srcMes + '\nreturn _mesesRecientes;')();
  const a = mr('2026-06-25', 3);
  ok('meses recientes (jun/may/abr 2026)', a.length===3 && a[0].key==='2026-06' && a[0].label==='JUNIO 2026' && a[1].key==='2026-05' && a[2].label==='ABRIL 2026');
  ok('hoyKey inválido → []', mr('x', 3).length===0);
}

// ── ensamble geo + filas ──
const parts = ['haversineMeters','evalGeocerca','_asistUbic','_asistMesFilas'].map(extractFn);
parts.forEach((s,i)=>ok('extraída '+['haversineMeters','evalGeocerca','_asistUbic','_asistMesFilas'][i], !!s));
if (parts.every(Boolean)){
  const api = new Function(parts.join('\n') + '\nreturn {_asistUbic,_asistMesFilas};')();
  const projs=[{id:'E', name:'ESSENZA FASE 2', geo:{lat:14.60,lng:-90.50,radio:100}}];
  // _asistUbic
  ok('ubic EN OBRA (mismo punto)', (function(){ const u=api._asistUbic({obraId:'E',geoEntrada:{lat:14.60,lng:-90.50}},'geoEntrada',projs); return u.enObra===true && u.txt==='EN OBRA'; })());
  ok('ubic FUERA (~1.1km)', (function(){ const u=api._asistUbic({obraId:'E',geoSalida:{lat:14.61,lng:-90.50}},'geoSalida',projs); return u.enObra===false && /^FUERA /.test(u.txt); })());
  ok('ubic sin geo → —', (function(){ const u=api._asistUbic({obraId:'E'},'geoEntrada',projs); return u.enObra===null && u.txt==='—'; })());

  // _asistMesFilas: junio 2026, 1 persona obra E
  const personal=[{id:'p1',nombre:'ANA',obraAsignada:'E'},{id:'p2',nombre:'OFI',obraAsignada:'E',tipo:'OFICINA'}];
  const A={
    '2026-06-01':{ p1:{presente:true,obraId:'E',entrada:'08:00',salida:'17:00',geoEntrada:{lat:14.60,lng:-90.50},geoSalida:{lat:14.61,lng:-90.50}} },
    '2026-06-02':{ p1:{presente:false,motivo:'PERMISO'} }
  };
  const filas=api._asistMesFilas(personal, A, 'E', 2026, 6, projs);
  ok('1 fila (excluye OFICINA), ordenada', filas.length===1 && filas[0].nombre==='ANA');
  ok('30 días en junio', filas[0].dias.length===30);
  const d1=filas[0].dias[0], d2=filas[0].dias[1], d3=filas[0].dias[2];
  ok('día 1: entrada 08:00, salida 17:00', d1.entrada==='08:00' && d1.salida==='17:00');
  ok('día 1: entrada EN OBRA, salida FUERA', d1.ubEnt.enObra===true && d1.ubSal.enObra===false);
  ok('día 2: AUSENTE (motivo)', d2.ausente===true && d2.entrada==='AUSENTE');
  ok('día 3: sin marca → —', d3.entrada==='—' && d3.salida==='—');
}

// ── estructural: permiso + botón + generador ──
ok('permiso personal.asistenciaMensual en el catálogo', /\{ key: 'personal\.asistenciaMensual',[^}]*group: 'EDICIÓN PERSONAL' \}/.test(html));
ok('botón PDF MENSUAL con data-perm', /data-perm="personal\.asistenciaMensual"[^>]*onclick="abrirPdfMensual\(\)"/.test(html));
ok('_generarPdfMensual exige el permiso', /function _generarPdfMensual[\s\S]{0,160}can\('personal\.asistenciaMensual'\)\|\|can\('users\.manage'\)/.test(html));
ok('abrirPdfMensual pasa _obraFiltroAsist() + true', /_generarPdfMensual\([^;]*_obraFiltroAsist\(\)[^;]*true\)/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
