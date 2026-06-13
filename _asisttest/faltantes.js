/* Pruebas de _faltanIngreso / _faltanSalida (KPIs de faltantes, v651).
   node _asisttest/faltantes.js
   Las funciones aquí DEBEN ser idénticas (código) a las de index.html. */

// ── datos de prueba ──
var PERSONAL = [
  { id:'p1', nombre:'ANA',   cargo:'INSTALADOR', tipo:'OBRA',    obraAsignada:'O1' },
  { id:'p2', nombre:'BETO',  cargo:'MASILLERO',  tipo:'OBRA',    obraAsignada:'O1' },
  { id:'p3', nombre:'CARLA', cargo:'LIMPIEZA',   tipo:'OBRA',    obraAsignada:'O2' },
  { id:'p4', nombre:'DARIO', cargo:'X',          tipo:'OBRA',    multiObra:true },
  { id:'p5', nombre:'EVA',   cargo:'OFICINA',    tipo:'OFICINA', obraAsignada:'O1' },
  { id:'p6', nombre:'FELIX', cargo:'Y',          tipo:'OBRA',    obraAsignada:'' },
  { id:'p7', nombre:'GINA',  cargo:'INSTALADOR', tipo:'OBRA',    obraAsignada:'O1' },
  { id:'p8', nombre:'HUGO',  cargo:'MASILLERO',  tipo:'OBRA',    obraAsignada:'O1' }
];
var DIA = {
  p1: { presente:true,  entrada:'07:00', obraId:'O1' },                 // entró O1, sin salida
  p3: { presente:false, motivo:'PERMISO', obraId:'O2' },                // ausente manual O2
  p7: { presente:true,  entrada:'07:00', salida:'17:00', obraId:'O1' }, // entró y SALIÓ
  p8: { presente:true,  hora:'07:30', obraId:'O1' }                     // presente por toggle (sin entrada), sin salida
};

// ── funciones bajo prueba (idénticas a index.html) ──
function _faltanIngreso(personalGlobal, dia, obra){
  // Asignados FIJOS a la obra (obraAsignada===obra, sin multiObra ni OFICINA) que hoy NO marcaron
  // entrada (presente) NI fueron marcados ausentes manualmente. obra==='' → todas las obras.
  var out = [];
  (personalGlobal||[]).forEach(function(p){
    if (!p) return;
    if (p.tipo === 'OFICINA') return;
    if (p.multiObra) return;
    if (!p.obraAsignada) return;
    if (obra && p.obraAsignada !== obra) return;
    var r = dia && dia[p.id];
    var entered = !!(r && r.presente === true);
    var absentManual = !!(r && r.presente === false && r.motivo);
    if (!entered && !absentManual) out.push(p);
  });
  return out;
}
function _faltanSalida(dia, obra){
  // Presentes (presente===true, excluye ausentes) que aún NO tienen salida. obra==='' → todas.
  var out = [];
  var d = dia || {};
  Object.keys(d).forEach(function(pid){
    var r = d[pid];
    if (!r || r.presente !== true) return;       // solo presentes
    if (r.salida) return;                          // ya salió
    if (obra && String(r.obraId||'') !== obra) return;
    out.push({ id: pid, entrada: r.entrada || r.hora || '', obraId: r.obraId || '' });
  });
  return out;
}

// ── mini framework ──
var PASS=0, FAIL=0;
function ok(name, cond){ if(cond){ PASS++; } else { FAIL++; console.log('FAIL: '+name); } }
var ids = a => a.map(x => x.id).sort().join(',');

// ── _faltanIngreso ──
ok('ingreso O1: solo pendiente p2 (p8 ya entró por toggle → no falta ingreso)', ids(_faltanIngreso(PERSONAL, DIA, 'O1'))==='p2');
ok('ingreso O2: CARLA está ausente manual → 0 faltantes', _faltanIngreso(PERSONAL, DIA, 'O2').length===0);
ok('ingreso TODAS: solo asignados fijos pendientes (p2)', ids(_faltanIngreso(PERSONAL, DIA, ''))==='p2');
ok('ingreso excluye multiObra (DARIO)', _faltanIngreso(PERSONAL, DIA, '').every(p=>p.id!=='p4'));
ok('ingreso excluye OFICINA (EVA)', _faltanIngreso(PERSONAL, DIA, '').every(p=>p.id!=='p5'));
ok('ingreso excluye SIN OBRA (FELIX)', _faltanIngreso(PERSONAL, DIA, '').every(p=>p.id!=='p6'));
ok('ingreso O1 no incluye al que entró (ANA p1)', _faltanIngreso(PERSONAL, DIA, 'O1').every(p=>p.id!=='p1'));

// ── _faltanSalida ──
ok('salida O1: presentes sin salida (p1,p8)', ids(_faltanSalida(DIA, 'O1'))==='p1,p8');
ok('salida TODAS: presentes sin salida (p1,p8)', ids(_faltanSalida(DIA, ''))==='p1,p8');
ok('salida O2: 0 (CARLA es ausente, no cuenta)', _faltanSalida(DIA, 'O2').length===0);
ok('salida excluye al que ya salió (GINA p7)', _faltanSalida(DIA, 'O1').every(x=>x.id!=='p7'));
ok('salida excluye ausentes manuales (p3)', _faltanSalida(DIA, '').every(x=>x.id!=='p3'));
ok('salida incluye toggle-presente sin entrada (HUGO p8)', _faltanSalida(DIA, 'O1').some(x=>x.id==='p8'));

console.log('PASS='+PASS+' FAIL='+FAIL);
process.exit(FAIL?1:0);
