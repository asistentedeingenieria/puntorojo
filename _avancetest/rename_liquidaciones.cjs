/* v869: rename PLANILLAS → LIQUIDACIONES A PROVEEDORES en TODO el texto visible de la app.
   SOLO texto de UI (labels, títulos, toasts, PDFs, labels de permisos). Los identificadores
   internos NO cambian: claves de permisos (view.planilla, planilla.*), IDs (planilla-*),
   funciones (renderPlanilla*), campos de datos (p.planilla, planillasArmadas), data-plantab. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── visible: la pestaña y el encabezado renombrados ──
ok('pestaña del menú dice LIQUIDACIONES A PROVEEDORES', html.indexOf('>LIQUIDACIONES A PROVEEDORES<') >= 0);
ok('ya no existe la pestaña >PLANILLAS<', html.indexOf('>PLANILLAS<') < 0);
ok('encabezado de sección renombrado', html.indexOf('PAGO DE PLANILLAS') < 0);
ok('título h1 renombrado', html.indexOf('planillas.</em>') < 0);
ok('sub-pestaña LIQUIDACIÓN POR PERSONA', html.indexOf('>LIQUIDACIÓN POR PERSONA<') >= 0);
ok('flujo dice LIQUIDACIONES QUINCENALES', html.indexOf('LIQUIDACIONES QUINCENALES · FLUJO') >= 0);

// ── identificadores INTACTOS (esto es lo que no se puede romper) ──
ok('permiso view.planilla intacto', html.indexOf("'view.planilla'") >= 0 || html.indexOf('"view.planilla"') >= 0);
ok('permiso planilla.generate intacto', html.indexOf("planilla.generate") >= 0);
ok('permiso planilla.authorize intacto', html.indexOf("planilla.authorize") >= 0);
ok('permiso planilla.porPersona intacto', html.indexOf("planilla.porPersona") >= 0);
ok('id planilla-etapas intacto', html.indexOf('planilla-etapas') >= 0);
ok('campo p.planilla intacto', html.indexOf('p.planilla') >= 0);
ok('campo planillasArmadas intacto', html.indexOf('planillasArmadas') >= 0);
ok('función renderPlanilla intacta', html.indexOf('renderPlanilla') >= 0);
ok('data-plantab planillapersona intacto', html.indexOf('data-plantab="planillapersona"') >= 0);
ok('data-view planilla intacto', html.indexOf("data-view=\"planilla\"") >= 0 || html.indexOf("data-view='planilla'") >= 0);

// ── textos clave de las olas 2-5 renombrados ──
ok('toasts renombrados (PLANILLA NO ENCONTRADA)', html.indexOf('PLANILLA NO ENCONTRADA') < 0 && html.indexOf('LIQUIDACIÓN NO ENCONTRADA') >= 0);
ok('flujo de retenciones renombrado', html.indexOf('ENVIAR PLANILLA DE RETENCIONES') < 0);
ok('routing de notifs acepta título viejo Y nuevo', html.indexOf("!t.includes('pago liquidación')") >= 0);
ok('router de vistas rutea liquidaci', /liquidaci\|retenci/.test(html));

// ── residuo DELIBERADO intacto (conceptos distintos / pareados) ──
ok('contrato PLANILLA (nómina, estado de fuerza) intacto', html.indexOf("contrato==='PLANILLA'") >= 0);
ok('PLANILLA_ETAPAS_5 (identificador) intacto', html.indexOf('PLANILLA_ETAPAS_5') >= 0);
ok('hoja Excel PLANILLA pareada (addWorksheet+XML)', html.indexOf("addWorksheet('PLANILLA'") >= 0);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
