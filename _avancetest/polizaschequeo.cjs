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
ok('sub-pestaña CHEQUEO QUINCENAL', /CHEQUEO QUINCENAL/.test(html));
ok('vista _polView chequeo', /_polView\s*=\s*'chequeo'|_polView==='chequeo'/.test(html));

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

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
