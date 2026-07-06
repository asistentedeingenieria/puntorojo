/* v895: dos capacidades por-planilla, activadas por consola (caso planilla VICINIA 04/07):
   (1) pl.sinDescuentoPolizas === true → NINGUNA ruta auto-aplica descuentos de PÓLIZA a esa
       planilla (los anticipos siguen normal): _v411 no los agrega, el recálculo v890 los QUITA
       si existen, y el mapa de dueñas ignora la planilla (otra planilla puede descontar a la
       misma persona). Las pólizas del catálogo quedan intactas.
   (2) pl.fechaTituloLit = 'DDMMYYYY' → el título, el PDF, el Excel y el preview muestran esa
       fecha LITERAL en vez del sábado de la semana (título de tarjeta, encabezados, nombres
       de archivo y la celda de fecha del Excel). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
const norm = s => String(s||'').toUpperCase().replace(/\s+/g,' ').trim();
const NERY = 'NERY DE LA CRUZ SICAN TEPEU';
const mkSt = () => ({
  polizasGlobales: [
    { id:'po1', estatus:'ACTIVA', aCargoDeNombre:NERY, aseguradoNombre:'A1' },
    { id:'po2', estatus:'ACTIVA', aCargoDeNombre:NERY, aseguradoNombre:'A2' },
    { id:'po3', estatus:'ACTIVA', aCargoDeNombre:NERY, aseguradoNombre:'A3' },
  ],
  anticiposGlobales: [ { id:'ant1', colaboradorNombre:NERY, montoTotal:600, cantidadCuotas:6, cuotasPagadasInicial:0, desc:'PRESTAMO', subtipo:'PRESTAMO_PERSONAL' } ],
  polizasConfig: { montoDefault:44.95 },
  projects: []
});
const mkP = () => ({ planilla: { pagos: [ { id:'pg1', colaborador:NERY, colaboradorId:'c1' } ] } });

// ── 1. _v411: la marca bloquea SOLO pólizas (anticipos siguen) ──
const src411 = extractFn('_v411AplicarDescuentosInline');
ok('_v411 existe', !!src411);
if (src411) {
  const silent = { log(){}, warn(){}, error(){} };
  const f = new Function('state','_v464NormKey','_v464PolizaOwnerMap','console', src411 + '\nreturn _v411AplicarDescuentosInline;');
  const run = (flag) => {
    const pl = { id:'pln-x', pagosIds:['pg1'], descuentosPlanilla:[] };
    if (flag) pl.sinDescuentoPolizas = true;
    f(mkSt(), norm, ()=>({}), silent)(pl, mkP(), {});
    return pl.descuentosPlanilla;
  };
  const sin = run(false), con = run(true);
  ok('control: sin marca aplica póliza Q134.85', sin.some(d=>d.subtipo==='POLIZA' && d.monto===134.85));
  ok('con marca: NO aplica póliza', !con.some(d=>d.subtipo==='POLIZA'));
  ok('con marca: el anticipo SÍ se aplica', con.some(d=>d.anticipoId==='ant1' && d.monto===100));
}

// ── 2. recálculo v890: con la marca QUITA la póliza existente (idempotente) ──
const srcRec = extractFn('_polRecalcPlanillaPolizas');
ok('_polRecalcPlanillaPolizas existe', !!srcRec);
if (srcRec) {
  const g = new Function(srcRec + '\nreturn _polRecalcPlanillaPolizas;')();
  const desc = { id:'d1', subtipo:'POLIZA', autoAplicado:true, colaboradorNombre:NERY, monto:134.85, polizaIds:['po1','po2','po3'], polizasCount:3, desc:'PÓLIZAS · 3 ACTIVAS' };
  const pl = { id:'pln-x', autoDescuentos:true, sinDescuentoPolizas:true, pagosIds:['pg1'], descuentosPlanilla:[Object.assign({},desc)] };
  const pr = mkP();
  const r1 = g(pl, pr, mkSt(), {});
  ok('con marca: quita el descuento y reporta cambio', r1===true && !pl.descuentosPlanilla.some(d=>d.subtipo==='POLIZA'));
  ok('segunda pasada idempotente', g(pl, pr, mkSt(), {})===false);
  const pl2 = { id:'pln-y', autoDescuentos:true, pagosIds:['pg1'], descuentosPlanilla:[Object.assign({},desc)] };
  ok('control: sin marca lo conserva sin cambios', g(pl2, pr, mkSt(), {})===false && pl2.descuentosPlanilla.length===1);
}

// ── 3. dueñas de póliza: la planilla marcada no puede ser dueña ──
const srcOwn = extractFn('_v464PolizaOwnerMap');
ok('_v464PolizaOwnerMap existe', !!srcOwn);
if (srcOwn) {
  const st = { projects: [ { id:'pr1', planilla: {
    pagos: [ { id:'pg1', colaborador:NERY }, { id:'pg2', colaborador:NERY } ],
    planillasArmadas: [
      { id:'plVieja', estado:'pendiente_pm', fechaEnvio:'2026-07-01T00:00:00Z', pagosIds:['pg1'], sinDescuentoPolizas:true },
      { id:'plNueva', estado:'pendiente_pm', fechaEnvio:'2026-07-05T00:00:00Z', pagosIds:['pg2'] }
    ] } } ] };
  const h = new Function('state','_V465_OPEN','_v464NormKey', srcOwn + '\nreturn _v464PolizaOwnerMap;')(st, {pendiente_pm:1, aprobada_inicial:1, pendiente_pm_final:1}, norm);
  ok('la dueña salta a la planilla sin marca', h()[norm(NERY)]==='plNueva');
}

// ── 4. fecha literal en el título de la tarjeta ──
const srcTit = extractFn('_planillaTitulo');
ok('_planillaTitulo existe', !!srcTit);
if (srcTit) {
  const t = new Function('_activeProj','_fechaSabadoDDMMYYYY', srcTit + '\nreturn _planillaTitulo;')(()=>({name:'VICINIA DEL CARMEN'}), ()=>'11072026');
  ok('con fechaTituloLit el título es literal', t({ fechaTituloLit:'06072026', fechaEnvio:'2026-07-06' })==='Planilla VICINIA DEL CARMEN_06072026');
  ok('sin la marca sigue usando el sábado', t({ fechaEnvio:'2026-07-06' })==='Planilla VICINIA DEL CARMEN_11072026');
}

// ── 5. estructural: PDF/Excel/preview respetan la fecha literal ──
ok('_construirDatos propaga fechaTituloLit', /fechaTituloLit:\s*\(meta\.planilla && meta\.planilla\.fechaTituloLit\) \|\| ''/.test(html));
ok('helper _fechaLitSlash definido', /function _fechaLitSlash\(/.test(html));
ok('nombres de archivo (pdf/xlsx) y PDF por persona', (html.match(/data\.fechaTituloLit \|\| _fechaSabadoDDMM\(data\.fecha\)/g)||[]).length >= 3);
ok('encabezados y preview con ternario literal', (html.match(/data\.fechaTituloLit \? _fechaLitSlash\(data\.fechaTituloLit\)/g)||[]).length >= 4);
ok('celda de fecha del Excel respeta la literal', /data\.fechaTituloLit \? _fechaLitDate\(data\.fechaTituloLit\) : _sabadoDeSemana\(data\.fecha\)/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
