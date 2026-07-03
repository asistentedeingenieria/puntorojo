/* v887: el chip/modal "PÓLIZAS PENDIENTES POR DESCONTAR" de cada planilla era POR PLANILLA
   (solo miraba los descuentos de esa planilla) cuando la regla real es POR QUINCENA GLOBAL:
   la póliza solo se descuenta en UNA planilla por quincena, así que si a la persona ya se le
   descontó en OTRA planilla del MISMO sábado (cualquier proyecto), NO debe salir pendiente.
   Caso real del user: VICTOR SALAZAR RAMOS descontado en ESSENZA salía pendiente en VICINIA.
   Descuentos de la MISMA planilla: match laxo de siempre. Descuentos de OTRAS planillas:
   match ESTRICTO estilo v811 (polizaIds mandan; con ids NO cae a nombre; nombre EXACTO sin ids). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const src = extractFn('_polizasPendientesDePlanilla');
ok('_polizasPendientesDePlanilla existe', !!src);
const f = new Function(src + '\nreturn _polizasPendientesDePlanilla;')();

// ── escenario base: 2 proyectos, misma quincena (sábado 04-07-2026) ──
// fechas martes/miércoles bien adentro de la semana para que el huso no cruce el sábado.
function mkSt(over){
  const pol1 = { id:'pol1', estatus:'ACTIVA', aCargoDeNombre:'VICTOR SALAZAR RAMOS', aseguradoNombre:'ASEG X' };
  const pol2 = { id:'pol2', estatus:'ACTIVA', aCargoDeNombre:'MARIO LOPEZ GARCIA', aseguradoNombre:'ASEG Y' };
  const plEss = Object.assign({ id:'plE', estado:'aprobada', fechaEnvio:'2026-06-30T10:00:00', pagosIds:['pgE1'],
    descuentosPlanilla:[{ id:'d1', subtipo:'POLIZA', colaboradorNombre:'VICTOR SALAZAR RAMOS', polizaIds:['pol1'], monto:100 }] }, (over&&over.plEss)||{});
  const plVic = Object.assign({ id:'plV', estado:'enviada', fechaEnvio:'2026-07-01T08:00:00', pagosIds:[], descuentosPlanilla:[] }, (over&&over.plVic)||{});
  const prEss = { id:'ess', planilla:{ pagos:[{ id:'pgE1', colaborador:'VICTOR SALAZAR RAMOS' }], planillasArmadas:[plEss] } };
  const prVic = { id:'vic', planilla:{ pagos:(over&&over.pagosVic)||[], planillasArmadas:[plVic] } };
  return { st:{ polizasGlobales:[pol1,pol2], projects:[prEss,prVic] }, plVic, prVic };
}
const nombres = out => out.map(x=>x.persona);

// 1) CASO VICTOR: descontado en ESSENZA (misma quincena, otro proyecto) → NO pendiente en VICINIA
let s = mkSt();
let out = f(s.plVic, s.prVic, s.st);
ok('VICTOR ya NO sale pendiente (descontado en otra planilla de la misma quincena)', nombres(out).indexOf('VICTOR SALAZAR RAMOS') < 0);
ok('MARIO (sin descuento en ningún lado) SÍ sigue pendiente', nombres(out).indexOf('MARIO LOPEZ GARCIA') >= 0);
ok('la razón de MARIO sigue siendo SIN PAGO', (out.find(x=>x.persona==='MARIO LOPEZ GARCIA')||{}).razon === 'SIN PAGO');

// 2) quincena DISTINTA: el descuento viejo de ESSENZA (semana anterior) NO limpia esta quincena
s = mkSt({ plEss:{ fechaEnvio:'2026-06-23T10:00:00' } });
out = f(s.plVic, s.prVic, s.st);
ok('descuento de OTRA quincena NO cuenta (VICTOR pendiente)', nombres(out).indexOf('VICTOR SALAZAR RAMOS') >= 0);

// 3) planilla RECHAZADA de la misma quincena NO cuenta
s = mkSt({ plEss:{ estado:'rechazada' } });
out = f(s.plVic, s.prVic, s.st);
ok('descuento en planilla rechazada NO cuenta (VICTOR pendiente)', nombres(out).indexOf('VICTOR SALAZAR RAMOS') >= 0);

// 4) regresión: el descuento en la MISMA planilla sigue limpiando con match laxo (substring, sin ids)
s = mkSt({ plEss:{ descuentosPlanilla:[] },
  plVic:{ descuentosPlanilla:[{ id:'d2', subtipo:'POLIZA', colaboradorNombre:'VICTOR SALAZAR RAMOS SOYOS', polizaIds:[], monto:100 }] } });
out = f(s.plVic, s.prVic, s.st);
ok('descuento propio con match laxo sigue limpiando (regresión)', nombres(out).indexOf('VICTOR SALAZAR RAMOS') < 0);

// 5) cruzado SIN ids pero nombre EXACTO → limpia
s = mkSt({ plEss:{ descuentosPlanilla:[{ id:'d3', subtipo:'POLIZA', colaboradorNombre:'VICTOR SALAZAR RAMOS', polizaIds:[], monto:100 }] } });
out = f(s.plVic, s.prVic, s.st);
ok('cruzado sin ids con nombre EXACTO limpia', nombres(out).indexOf('VICTOR SALAZAR RAMOS') < 0);

// 6) cruzado SIN ids y nombre solo SUBSTRING (no exacto) → NO limpia (match estricto cross-proyecto)
s = mkSt({ plEss:{ descuentosPlanilla:[{ id:'d4', subtipo:'POLIZA', colaboradorNombre:'VICTOR SALAZAR', polizaIds:[], monto:100 }] } });
out = f(s.plVic, s.prVic, s.st);
ok('cruzado sin ids con substring NO limpia (estricto)', nombres(out).indexOf('VICTOR SALAZAR RAMOS') >= 0);

// 7) cruzado CON ids de OTRA póliza (aunque el nombre empate exacto) → NO limpia (los ids mandan)
s = mkSt({ plEss:{ descuentosPlanilla:[{ id:'d5', subtipo:'POLIZA', colaboradorNombre:'VICTOR SALAZAR RAMOS', polizaIds:['polOTRA'], monto:100 }] } });
out = f(s.plVic, s.prVic, s.st);
ok('cruzado con ids ajenos NO limpia aunque el nombre empate', nombres(out).indexOf('VICTOR SALAZAR RAMOS') >= 0);

// 8) razón NO EMPATO se conserva: pago en ESTA planilla sin descuento en ningún lado
s = mkSt({ plEss:{ descuentosPlanilla:[] }, plVic:{ pagosIds:['pgV1'] }, pagosVic:[{ id:'pgV1', colaborador:'VICTOR SALAZAR RAMOS' }] });
out = f(s.plVic, s.prVic, s.st);
ok('razón NO EMPATO se conserva (tuvo pago acá, sin descuento)', (out.find(x=>x.persona==='VICTOR SALAZAR RAMOS')||{}).razon === 'NO EMPATO');

// 9) sin fecha parseable en la planilla → no revienta y cae al chequeo propio de siempre
s = mkSt({ plVic:{ fechaEnvio:'', fechaCreacion:'' } });
out = f(s.plVic, s.prVic, s.st);
ok('sin fecha: no revienta y VICTOR queda pendiente (solo chequeo propio)', Array.isArray(out) && nombres(out).indexOf('VICTOR SALAZAR RAMOS') >= 0);

// ── estructural: el texto del modal explica la regla global por quincena ──
ok('modal explica que es por quincena GLOBAL (ninguna liquidación de esta quincena)', /no<\/b> se les descontó en NINGUNA liquidación de esta quincena/.test(html));
// v889: el user pidió SOLO esa frase — sin el paréntesis explicativo ni el "Revisá si..."
ok('v889: sin el paréntesis "(se revisan TODAS..."', html.indexOf('(se revisan TODAS las liquidaciones') < 0);
ok('v889: sin la frase "Revisá si hay que generarles pago"', html.indexOf('Revisá si hay que generarles pago') < 0);
ok('v889: la frase termina en punto tras "quincena"', /no<\/b> se les descontó en NINGUNA liquidación de esta quincena\./.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
