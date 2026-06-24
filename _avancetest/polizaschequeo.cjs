/* v803: doble chequeo de pólizas. Pura _polizasPendientesDePlanilla(pl,p,state) → pólizas
   ACTIVAS no aplicadas en la planilla: razón SIN PAGO (no tuvo pago) o NO EMPATO (tuvo pago
   pero el nombre no coincidió). Mismo match que _v411 (normalización + substring). */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
function extract(name){ const m=html.indexOf('function '+name+'('); if(m<0) return null; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){d--; if(d===0) return html.slice(m,i+1);}} return null; }

ok('_polizasPendientesDePlanilla existe', html.indexOf('function _polizasPendientesDePlanilla(')>=0);
ok('expuesta en window', html.indexOf('window._polizasPendientesDePlanilla')>=0);
// sub-pestaña comparativa + chip
ok('sub-pestaña CHEQUEO GLOBAL', /CHEQUEO GLOBAL/.test(html));
ok('vista _polView chequeo', /_polView\s*=\s*'chequeo'|_polView==='chequeo'/.test(html));
// v811: la rama chequeo es UNA lista GLOBAL de todos los proyectos (no por proyecto) y muestra el CONTEO.
ok('v811: la rama chequeo usa _polizasChequeoGlobal', /_polView === 'chequeo'\)\{[\s\S]{0,2000}_polizasChequeoGlobal\(/.test(html));
ok('v811: la columna PÓLIZAS muestra el CONTEO (x.polizasCount), no los nombres', /_polView === 'chequeo'\)\{[\s\S]{0,4200}x\.polizasCount/.test(html));

const body=extract('_polizasPendientesDePlanilla');
ok('_polizasPendientesDePlanilla extraída', !!body);
if(body){
  const fn=new Function(body+'\n return _polizasPendientesDePlanilla;')();
  const st={ polizasGlobales:[
    {id:'po1', aCargoDeNombre:'ANA LOPEZ', aseguradoNombre:'HIJO ANA', estatus:'ACTIVA'},
    {id:'po2', aCargoDeNombre:'BETO RUIZ', aseguradoNombre:'BETO', estatus:'ACTIVA'},
    {id:'po3', aCargoDeNombre:'CARLA SOL', aseguradoNombre:'CARLA', estatus:'EN PROCESO'},
    {id:'po4', aCargoDeNombre:'DARIO X', aseguradoNombre:'D', estatus:'DE BAJA'}
  ]};
  const p={ planilla:{ pagos:[
    {id:'pg1', colaborador:'ANA LOPEZ'},
    {id:'pg2', colaborador:'CARLA SOL'}
  ]}};
  const pl={ pagosIds:['pg1','pg2'], descuentosPlanilla:[
    {subtipo:'POLIZA', colaboradorNombre:'ANA LOPEZ', polizaIds:['po1']}
  ]};
  const r=fn(pl, p, st);
  const byName=Object.fromEntries(r.map(x=>[x.persona, x]));
  ok('ANA (pago + póliza aplicada) NO es pendiente', !byName['ANA LOPEZ']);
  ok('BETO (póliza activa sin pago) pendiente SIN PAGO', byName['BETO RUIZ'] && byName['BETO RUIZ'].razon==='SIN PAGO');
  ok('CARLA (pago pero sin descuento) pendiente NO EMPATO', byName['CARLA SOL'] && byName['CARLA SOL'].razon==='NO EMPATO');
  ok('DARIO (póliza DE BAJA) ignorado', !byName['DARIO X']);
  ok('total 2 pendientes', r.length===2);
}

// v804: chip en cada planilla + su modal
ok('chip PÓLIZAS PENDIENTES POR DESCONTAR en la planilla', /PÓLIZAS PENDIENTES POR DESCONTAR: '\+_polPend\.length/.test(html));
ok('chip solo si hay pendientes', /if \(_polPend\.length\)/.test(html));
ok('_polChipModal existe', html.indexOf('window._polChipModal')>=0);

// v805/v811: PDF del chequeo GLOBAL (lista única de todos los proyectos)
ok('_generarPdfChequeoPolizas existe', html.indexOf('window._generarPdfChequeoPolizas')>=0);
ok('botón DESCARGAR PDF en el chequeo', /_generarPdfChequeoPolizas\(\)/.test(html));
ok('PDF reusa _pdfDescargar', /_generarPdfChequeoPolizas[\s\S]{0,9500}_pdfDescargar\(doc/.test(html));
ok('v811: el PDF del chequeo usa _polizasChequeoGlobal (todos los proyectos)', /_generarPdfChequeoPolizas[\s\S]{0,1600}_polizasChequeoGlobal\(/.test(html));

// v812: toggle GLOBAL / POR QUINCENA + vista y PDF por quincena
ok('v812 toggle GLOBAL/POR QUINCENA (window._chkMode)', /window\._chkMode/.test(html) && /_tgl\('global','GLOBAL'\)/.test(html) && /_tgl\('quincena','POR QUINCENA'\)/.test(html));
ok('v812 la vista POR QUINCENA usa _polizasChequeoTodos', /_chkMode === 'quincena'|_chkMode==='quincena'/.test(html) && /window\._polizasChequeoTodos\(/.test(html));
ok('v812 estados COBRADA / NO COBRADA en la vista por quincena', /✓ COBRADA/.test(html) && /✗ NO COBRADA/.test(html));
ok('v812 el PDF ramifica por quincena', /_generarPdfChequeoPolizas[\s\S]{0,4500}window\._chkMode === 'quincena'/.test(html));

// v816: tercer modo POR PERSONA (cada persona del RESUMEN a través de TODAS las planillas)
ok('v816 toggle POR PERSONA', /_tgl\('persona','POR PERSONA'\)/.test(html));
ok('v816 la vista POR PERSONA usa _polizasChequeoPorPersona', /window\._polizasChequeoPorPersona\(/.test(html));
ok('v816 columnas COBRADO + DÓNDE FALTÓ', /DÓNDE FALTÓ/.test(html) && /TODO COBRADO/.test(html));
ok('v816 el PDF ramifica por persona', /_generarPdfChequeoPolizas[\s\S]{0,900}window\._chkMode === 'persona'/.test(html));

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
