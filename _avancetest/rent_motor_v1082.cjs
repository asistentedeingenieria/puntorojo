/* v1082 — DASHBOARD DE RENTABILIDAD · Fase 1b: el motor (venta, costo, margen, CPI).
   Todo se DERIVA de lo que la app ya tiene. Reutiliza los derivadores existentes en vez de
   recalcular: totalProyectoNeto / cobroConfig / rowValues (venta) y _gastosDeProyecto
   (materiales). La única pieza que NO existía es la mano de obra por proyecto: su aritmética
   estaba incrustada en renderPlanilla (L40732-40735) y se extrae a _manoObraDeProyecto con
   la MISMA fórmula, para que las dos pantallas no puedan divergir.
   REGLAS CONTABLES (del mapeo del código):
   · Los montos guardados llevan IVA → los márgenes se calculan SIN IVA (decisión de Antonio).
   · Los DESCUENTOS de planilla NO son costo: son recuperación de préstamos ya desembolsados.
   · La retención del 10% YA está dentro del bruto: pagarla es caja, no costo nuevo.
   · Las ÓRDENES DE CAMBIO sí son costo extra real de mano de obra. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. mano de obra por proyecto (la pieza que faltaba) —');
const zM = ex('function _manoObraDeProyecto(');
let mo = null;
try { mo = new Function('return (' + zM + ')')(); } catch(e){}
ok('existe _manoObraDeProyecto y es pura (recibe el proyecto)', !!mo && zM.length > 250);
if (mo) {
  const p = { planilla: { pagos: [
      { bruto: 1000, retencion: 100, retencionPagada: true },
      { bruto: 500,  retencion: 50 }
    ], ajustes: [
      { tipo: 'ORDEN_CAMBIO', monto: 200 },
      { tipo: 'DESCUENTO',    monto: 300 }
    ] } };
  const r = mo(p);
  /* MISMA aritmética que renderPlanilla: bruto = pagos + ajustes que NO son descuento */
  ok('bruto = pagos + órdenes de cambio (el descuento NO suma)', r.bruto === 1700);
  ok('la retención acumulada se reporta', r.retenido === 150);
  ok('y cuánta ya se pagó', r.retencionPagada === 100);
  ok('los descuentos se reportan APARTE (no son costo de obra)', r.descuentos === 300);
  ok('el COSTO de mano de obra es el bruto (la retención ya está adentro)', r.costo === 1700);
  ok('proyecto sin planilla: todo en cero, sin reventar', mo({}).costo === 0 && mo(null).bruto === 0);
}

console.log('\n— 2. el motor de rentabilidad de un proyecto —');
const zR = ex('function _rentDatosProyecto(');
let rent = null;
try {
  rent = new Function('totalProyectoNeto','cobroConfig','rowValues','_gastosDeProyecto','_manoObraDeProyecto','_rentAvanceProyecto','_rentAvancePorEtapa',
    'return (' + zR + ')');
} catch(e){}
ok('existe _rentDatosProyecto', !!rent && zR.length > 700);
if (rent) {
  /* proyecto de prueba: contrato 1,120,000 CON IVA (12%) = 1,000,000 sin IVA */
  const P = { id: 'p1', name: 'OBRA X', ivaPct: 0.12, rentIndirectosPct: 0.05, rentMargenObjetivo: 0.20 };
  const cfg = { iva: 0.12, amort: 0.30, ret: 0.10, antic: 0.30, netFactor: 0.60 };
  const filas = [
    { sc: 'PAGADO',    vp_ci: 336000, isAnticipo: true },   // anticipo cobrado
    { sc: 'PAGADO',    vp_ci: 224000 },                      // estimación cobrada
    { sc: 'PENDIENTE', vp_ci: 112000 }                       // presentada, sin cobrar
  ];
  const f = rent(
    () => 1120000,                       // totalProyectoNeto (CON IVA)
    () => cfg,                           // cobroConfig
    (r, c) => ({ vpCI: r.vp_ci, vpSI: r.vp_ci / (1 + c.iva),
                 netCI: r.isAnticipo ? r.vp_ci : r.vp_ci * c.netFactor,
                 amCI: r.isAnticipo ? 0 : r.vp_ci * c.amort }),
    () => ({ total: 224000, totalCompra: 200000, totalDespacho: 24000, ordenes: [] }), // materiales CON IVA
    () => ({ costo: 300000, bruto: 300000, retenido: 30000, retencionPagada: 0, descuentos: 0 }),
    () => ({ pct: 0.25, aptos: 40, terminados: 5 }),
    () => []
  );
  const d = f(Object.assign({ cobro: { rows: filas } }, P));

  ok('la venta contratada se muestra CON IVA (como la ves)', d.ventaContratadaCI === 1120000);
  ok('y el margen se calcula SIN IVA', Math.abs(d.ventaContratadaSI - 1000000) < 0.01);
  /* materiales 224,000 con IVA = 200,000 sin IVA; mano de obra 300,000 (no lleva IVA) */
  ok('materiales pasan a sin IVA', Math.abs(d.costoMaterialesSI - 200000) < 0.01);
  ok('la mano de obra NO se toca (no lleva IVA)', d.costoManoObra === 300000);
  ok('los indirectos salen del % sobre el costo directo', Math.abs(d.costoIndirectos - (200000 + 300000) * 0.05) < 0.01);
  ok('costo real = materiales + mano de obra + indirectos', Math.abs(d.costoRealSI - 525000) < 0.01);
  /* venta ejecutada = lo presentado (anticipo NO es venta, es adelanto) */
  ok('el ANTICIPO no cuenta como venta ejecutada', Math.abs(d.ventaEjecutadaSI - (224000 + 112000) / 1.12) < 0.01);
  /* valor ganado = contrato sin IVA × avance físico */
  ok('valor ganado = contrato × avance', Math.abs(d.valorGanadoSI - 1000000 * 0.25) < 0.01);
  ok('CPI = valor ganado ÷ costo real', Math.abs(d.cpi - (250000 / 525000)) < 0.0001);
  ok('CPI < 1 avisa que se gasta más de lo construido', d.cpi < 1 && d.alertaCosto === true);
  ok('costo proyectado al terminar = contrato ÷ CPI', Math.abs(d.costoProyectadoSI - (1000000 / (250000 / 525000))) < 1);
  ok('margen proyectado = contrato − costo proyectado', Math.abs(d.margenProyectadoSI - (1000000 - d.costoProyectadoSI)) < 1);
  ok('semáforo ROJO si el margen queda muy por debajo del objetivo', d.semaforo === 'rojo');
  ok('trae el avance y los aptos para la ficha', d.avancePct === 0.25 && d.aptos === 40);
  ok('cobrado y por cobrar salen de las filas', d.cobradoCI > 0 && d.porCobrarCI > 0);

  /* proyecto sano: mucho avance, poco costo → verde */
  const f2 = rent(() => 1120000, () => cfg,
    (r, c) => ({ vpCI: r.vp_ci, vpSI: r.vp_ci / (1 + c.iva), netCI: r.vp_ci, amCI: 0 }),
    () => ({ total: 112000, totalCompra: 112000, totalDespacho: 0, ordenes: [] }),
    () => ({ costo: 100000, bruto: 100000, retenido: 0, retencionPagada: 0, descuentos: 0 }),
    () => ({ pct: 0.5, aptos: 40, terminados: 20 }), () => []);
  const d2 = f2(Object.assign({ cobro: { rows: [] } }, P));
  ok('proyecto sano: CPI > 1 y semáforo verde', d2.cpi > 1 && d2.semaforo === 'verde' && d2.alertaCosto === false);

  /* sin avance todavía: no se puede calcular CPI y no se inventa */
  const f3 = rent(() => 1120000, () => cfg, (r, c) => ({ vpCI: 0, vpSI: 0, netCI: 0, amCI: 0 }),
    () => ({ total: 0, totalCompra: 0, totalDespacho: 0, ordenes: [] }),
    () => ({ costo: 0, bruto: 0, retenido: 0, retencionPagada: 0, descuentos: 0 }),
    () => ({ pct: 0, aptos: 0, terminados: 0 }), () => []);
  const d3 = f3(Object.assign({ cobro: { rows: [] } }, P));
  ok('sin costo todavía: CPI null, no infinito', d3.cpi === null && d3.semaforo === 'sin-datos');
  ok('sin contrato tampoco revienta', rent(() => 0, () => cfg, () => ({ vpCI:0,vpSI:0,netCI:0,amCI:0 }),
    () => ({ total:0, totalCompra:0, totalDespacho:0, ordenes:[] }), () => ({ costo:0,bruto:0,retenido:0,retencionPagada:0,descuentos:0 }),
    () => ({ pct:0, aptos:0, terminados:0 }), () => [])({ cobro:{rows:[]} }).ventaContratadaSI === 0);
}

console.log('\n— 3. los 3 datos que SÍ se capturan (y sus valores por defecto) —');
ok('margen objetivo por proyecto', /rentMargenObjetivo/.test(html));
ok('% de indirectos por proyecto', /rentIndirectosPct/.test(html));
/* sin capturar: indirectos 0 (no inventa costo) y margen objetivo 20% */
ok('tienen default razonable si nunca se capturaron', /rentIndirectosPct\)? \|\| 0/.test(html) && /rentMargenObjetivo\)? \|\| 0\.\d/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
