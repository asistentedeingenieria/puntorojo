/* v845: la solicitud de anticipo toma la OBRA ASIGNADA de la persona (no el proyecto activo).
   Selector de obra en el form que se auto-rellena al elegir la persona; multi-obra → el user elige. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractAt(startIdx){ let i=html.indexOf('{',startIdx),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(startIdx,i+1); } } return ''; }
function extractFn(name){ const m=html.indexOf('function '+name+'('); return m<0?'':extractAt(m); }
function extractAssigned(name){ const m=html.indexOf('window.'+name+' = '); return m<0?'':extractAt(m); }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// 1) PURO: _antObraDeColab(nombre) → {id,name,multi} | null
const src = extractFn('_antObraDeColab');
ok('_antObraDeColab existe', !!src);
if(src){
  const fn = new Function('window', src+'\nreturn _antObraDeColab;')({ state:{
    personalGlobal:[
      {id:'p1', nombre:'JUAN PEREZ', obraAsignada:'proj-essenza'},
      {id:'p2', nombre:'PEDRO MULTI', multiObra:true, obraAsignada:'proj-essenza'},
      {id:'p3', nombre:'SIN OBRA'},
      {id:'p4', nombre:'BAJADO', obraAsignada:'proj-essenza', baja:true}
    ],
    projects:[{id:'proj-essenza', name:'ESSENZA FASE 2'}, {id:'proj-vic', name:'VICINIA'}]
  }});
  ok('single-obra -> {id,name,multi:false}', (function(){ var r=fn('JUAN PEREZ'); return r && r.id==='proj-essenza' && r.name==='ESSENZA FASE 2' && r.multi===false; })());
  ok('multi-obra -> {multi:true}', (function(){ var r=fn('PEDRO MULTI'); return !!(r && r.multi===true); })());
  ok('sin obra asignada -> null', fn('SIN OBRA')===null);
  ok('dado de baja -> null', fn('BAJADO')===null);
  ok('no existe en personal -> null', fn('FULANO DETAL')===null);
}

// 2) Form: selector de obra
const srcAbrir = extractAssigned('_antAbrirSolicitar');
ok('form tiene <select id=antSolObra>', srcAbrir.indexOf('antSolObra')>=0);
ok('form arma las opciones de obra', srcAbrir.indexOf('_antObraOpts')>=0);

// 3) crear toma la obra del selector
const srcCrear = extractAssigned('crearSolicitudAnticipo');
ok('crear lee antSolObra', srcCrear.indexOf('antSolObra')>=0);
ok('crear resuelve la obra elegida a projectId/Name', srcCrear.indexOf('antSolObra')>=0 && srcCrear.indexOf('_obraProj')>=0 && srcCrear.indexOf('projectId')>=0);

// 4) auto-relleno al elegir persona
ok('_antSolObraAuto existe', html.indexOf('window._antSolObraAuto')>=0);
ok('pick dispara _antSolObraAuto', /_antColabPick = function[\s\S]{0,420}_antSolObraAuto/.test(html));
ok('blur (cerrar) dispara _antSolObraAuto', /_antColabCerrar = function[\s\S]{0,600}_antSolObraAuto/.test(html));

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
