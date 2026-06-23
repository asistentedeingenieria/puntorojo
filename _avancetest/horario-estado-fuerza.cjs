/* v787: ESTADO DE FUERZA — el HORARIO es lun-vie por defecto y el SÁBADO cambia
   automáticamente (7 AM a 11 AM, 4 horas). Cada uno editable/guardado por separado. */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function ext(name){ const m=html.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}')); return m?m[0]:''; }
let pass=0,fail=0;const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const srcSab=ext('_efEsSabado');
const srcHor=ext('_efHorarioPorDia');
ok('_efEsSabado existe', !!srcSab);
ok('_efHorarioPorDia existe', !!srcHor);
if(srcSab){
  const f=new Function(srcSab+'\nreturn _efEsSabado;')();
  ok('2026-06-20 es sabado', f('2026-06-20')===true);
  ok('2026-06-19 (vie) no es sabado', f('2026-06-19')===false);
  ok('2026-06-22 (lun) no es sabado', f('2026-06-22')===false);
  ok('fecha invalida -> false', f('')===false);
}
if(srcSab && srcHor){
  const f=new Function(srcSab+'\n'+srcHor+'\nreturn _efHorarioPorDia;')();
  ok('sabado default -> 4 horas', f({},'2026-06-20').indexOf('7 AM A 11 AM (4 HORAS)')>=0);
  ok('viernes default -> 9 horas planilla', f({},'2026-06-19').indexOf('7 AM A 4 PM (9 HORAS)')>=0);
  ok('viernes usa estadoFuerzaHorarios guardado', f({estadoFuerzaHorarios:'MI LV'},'2026-06-19')==='MI LV');
  ok('sabado usa estadoFuerzaHorariosSab guardado', f({estadoFuerzaHorariosSab:'MI SAB'},'2026-06-20')==='MI SAB');
  ok('el guardado lun-vie NO se filtra al sabado', f({estadoFuerzaHorarios:'MI LV'},'2026-06-20').indexOf('4 HORAS')>=0);
}
// integracion
ok('abrirEstadoFuerza usa _efHorarioPorDia', /_efHorarioPorDia\(state,\s*fecha\)/.test(html));
ok('guarda en estadoFuerzaHorariosSab los sabados', html.indexOf('estadoFuerzaHorariosSab=horarios')>=0);
ok('ya no hay DEF_HOR fijo unico', html.indexOf('const DEF_HOR=')<0);

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
