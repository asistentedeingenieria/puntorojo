/* v933 (fase 2 del congelado v931): además de los marcadores PRE-APP, se congelan los
   pagos REALES cuya planilla armada está PAGADA Y CERRADA (estado 'archivada' CON
   fechaCierre — OJO: archivada SIN fechaCierre = rechazada-modificada, NO es pagada)
   hace más de 60 días Y con la retención del 10% resuelta (sin retención o
   retencionPagada). El criterio sigue viviendo en UN solo lugar (_pagoCongelado, ahora
   con contexto _pagoCongCtx(p)); la infraestructura v931 (partición, migración, unión
   en memoria, anti-resurrección) no cambia. Cambio de SYNC ⇒ APP_SYNC_VERSION 905. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
function extractMethod(sig){ let m=html.indexOf(sig); if(m<0) return ''; let i=m+sig.length-1,d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const DIA = 86400000;
const iso = ts => new Date(ts).toISOString();

// ── 1. _pagoCongCtx: mapa de planillas PAGADAS-CERRADAS + corte de 60 días ──
const srcCtx = extractFn('_pagoCongCtx');
ok('_pagoCongCtx existe', !!srcCtx);
const DIAS = Number((html.match(/var _PAGOS_CONG_DIAS = (\d+)/) || [])[1]);
ok('la ventana es de 60 días (constante _PAGOS_CONG_DIAS)', DIAS === 60);
let mkCtx = null;
if (srcCtx) {
  mkCtx = new Function('_PAGOS_CONG_DIAS', 'return ' + srcCtx)(DIAS);
  const now = Date.now();
  const p = { planilla: { planillasArmadas: [
    { id:'pl-vieja', estado:'archivada', fechaCierre: iso(now - 90*DIA) },
    { id:'pl-recien', estado:'archivada', fechaCierre: iso(now - 10*DIA) },
    { id:'pl-mod', estado:'archivada' },                       // rechazada-modificada: SIN fechaCierre
    { id:'pl-abierta', estado:'pendiente_pm' },
  ] } };
  const ctx = mkCtx(p);
  ok('solo archivada CON fechaCierre entra al mapa', !!ctx.cerradas['pl-vieja'] && !!ctx.cerradas['pl-recien'] && !ctx.cerradas['pl-mod'] && !ctx.cerradas['pl-abierta']);
  ok('corte = ahora − 60 días', Math.abs(ctx.corte - (now - 60*DIA)) < 60000);
  ok('proyecto sin planillas no truena', !!mkCtx(null) && !!mkCtx({}));
}

// ── 2. _pagoCongelado con contexto (fase 2) ──
const srcPred = extractFn('_pagoCongelado');
let pred = null;
if (srcPred && mkCtx) {
  pred = new Function('return ' + srcPred)();
  const now = Date.now();
  const ctx = mkCtx({ planilla: { planillasArmadas: [
    { id:'pl-vieja', estado:'archivada', fechaCierre: iso(now - 90*DIA) },
    { id:'pl-recien', estado:'archivada', fechaCierre: iso(now - 10*DIA) },
    { id:'pl-mod', estado:'archivada' },
  ] } });
  ok('PRE-APP sigue congelando (sin contexto, compat v931)', pred({ _preApp:true }) === true);
  ok('real: cerrada hace 90d + retención pagada ⇒ CONGELA', pred({ planillaId:'pl-vieja', retencion:64.75, retencionPagada:true, bruto:647 }, ctx) === true);
  ok('real: cerrada hace 90d + SIN retención ⇒ CONGELA', pred({ planillaId:'pl-vieja', retencion:0, bruto:100 }, ctx) === true);
  ok('retención pendiente ⇒ NO congela (plata viva)', pred({ planillaId:'pl-vieja', retencion:64.75, retencionPagada:false }, ctx) === false);
  ok('cerrada hace 10d ⇒ NO congela todavía', pred({ planillaId:'pl-recien', retencion:0 }, ctx) === false);
  ok('archivada SIN fechaCierre ⇒ NO congela (no es pagada)', pred({ planillaId:'pl-mod', retencion:0 }, ctx) === false);
  ok('sin planilla ⇒ NO congela (disponible para armar)', pred({ bruto:100, retencion:0 }, ctx) === false);
  ok('real sin contexto ⇒ NO congela (compat)', pred({ planillaId:'pl-vieja', retencion:0 }) === false);
}

// ── 3. _projSinPagosCongelados usa el contexto ──
const srcHelper = extractFn('_projSinPagosCongelados');
ok('_projSinPagosCongelados construye el contexto', srcHelper.indexOf('_pagoCongCtx(') > -1);
if (srcHelper && pred && mkCtx) {
  const fn = new Function('_pagoCongelado', '_pagoCongCtx', 'return ' + srcHelper)(pred, mkCtx);
  const now = Date.now();
  const p = { id:'e', planilla: {
    planillasArmadas: [ { id:'pl-vieja', estado:'archivada', fechaCierre: iso(now - 90*DIA) } ],
    pagos: [ {id:'r1', planillaId:'pl-vieja', retencion:0, bruto:10}, {id:'r2', bruto:5}, {id:'p1', _preApp:true} ],
  } };
  const s = fn(p);
  ok('filtra fase 2 + PRE-APP y deja lo caliente', s.planilla.pagos.length===1 && s.planilla.pagos[0].id==='r2');
  ok('NO muta el original', p.planilla.pagos.length===3);
}

// ── 4. subida y bajada usan el contexto ──
const up = extractMethod('async uploadCurrent(){');
ok('uploadCurrent particiona con _pagoCongCtx', up.indexOf('_pagoCongCtx(') > -1);
const asm = extractMethod('_assembleFromSnap(snap){');
ok('_assembleFromSnap detecta embebidos con _pagoCongCtx', asm.indexOf('_pagoCongCtx(') > -1);

// ── 5. ritual de sync ──
ok('APP_SYNC_VERSION subió a 905', /const APP_SYNC_VERSION = 905/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
