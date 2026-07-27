/* v994 (pedidos de Antonio 27-jul):
   1. CORRELATIVOS SIN CEROS: pedidos, OC, DESP, OP y bodega numeran 1, 2, 3, 4…
      (antes 00001). Las series siguen SEPARADAS y cada OC cita su pedido origen.
   2. El select de proveedor de CARGAR EXISTENCIAS dice solo "— PROVEEDOR —".
   3. UNIDAD AUTOMÁTICA EN EL CATÁLOGO DE PROVEEDORES: los 658 materiales del Excel
      DATOS_COMPRAS entran sin unidad; la app los clasifica sola (CIENTO, CAJA, SACO,
      CUBETA, GALÓN, LIBRA, ROLLO, METRO, PAR, TIRA…) al abrir el catálogo y al
      importar el Excel. La receta manda si el material ya tiene unidad ahí. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. correlativos sin ceros ──
ok('el pedido ya NO se rellena con ceros', /return `\$\{prefix\} – \$\{_primerNumeroLibre\(usados\)\}`/.test(html));
ok('la OC/DESP/OP tampoco', html.includes('const numero = `${pd.numero} - ${serie} ${folio}`'));
ok('el campo No. del modal tampoco', html.includes('`${_seriePrev} ${nextNum} · DEL PEDIDO ${pd.numero}`'));
ok('bodega central tampoco', html.includes("'BODEGA – ' + String(_bodegaNextNum(b.pedidos))"));
ok('no queda ningún padStart(5) de numeración', !/padStart\(5/.test(html));
// las series siguen separadas y citando el pedido origen
ok('las series OC/DESP/OP siguen separadas', /_usadosSerie/.test(html) && /function _ocSerieDe\(/.test(html));

// los documentos muestran el correlativo sin ceros AUNQUE el pedido sea viejo
const zSN = ex('function _solNum(');
let fSN = null;
try { fSN = new Function('return (' + zSN + ')')(); } catch(e){}
if (fSN) {
  ok('el doc de un pedido VIEJO también sale sin ceros', fSN({ numero:'VICINIA LAS AMÉRICAS – 00002' }) === '2');
  ok('el doc de un pedido nuevo sale igual', fSN({ numero:'VICINIA LAS AMÉRICAS – 7' }) === '7');
} else ok('_solNum evaluable', false);

// el listado de OCs ordena por el correlativo NUMÉRICO (sin ceros, 'OC 2' antes que 'OC 10')
ok('el listado de OCs ordena numéricamente', /_ocOrdNum/.test(html));
const mOrd = html.match(/const _ocOrdNum = (.+);\r?\n/);
if (mOrd) {
  const fO = new Function('return (' + mOrd[1] + ')')();
  const arr = ['VLA – 1 - OC 10', 'VLA – 1 - OC 2', 'VLA – 1 - OC 00003'].sort((a,b) => fO(a) - fO(b));
  ok('OC 2 va antes que OC 10 (y los viejos con ceros entran en su lugar)',
     arr[0].endsWith('OC 2') && arr[1].endsWith('OC 00003') && arr[2].endsWith('OC 10'));
} else ok('_ocOrdNum evaluable', false);

// ── 2. placeholder del proveedor en CARGAR EXISTENCIAS ──
ok('el select dice solo — PROVEEDOR —', /— PROVEEDOR —/.test(html) && !/PROVEEDOR \(para el costo\)/.test(html));

// ── 3. clasificación de unidades ──
const zU = ex('function _bodegaUnidadDelNombre(');
let f = null;
try { f = new Function('return (' + zU + ')')(); } catch(e){}
if (!f) { ok('_bodegaUnidadDelNombre evaluable', false); }
else {
  const casos = [
    // ciento / tira / millar
    ['CIENTO DE TORNILLO DE 1 5/8" PUNTA FINA', 'CIENTO'],
    ['CIENTO BOLSA 50LB #05', 'CIENTO'],
    ['TIRA DE FULMINANTE CAL. 27 AMARILLO', 'TIRA'],
    ['FULMINANTE TIRA CAL. 27 VERDE', 'TIRA'],
    // caja (presentación) vs objeto que se llama caja
    ['CAJA DECOPASTA EXTERIOR VERDE 14 KG', 'CAJA'],
    ['MASILLA JOINT WELDBOND CAJA 21.8 KG', 'CAJA'],
    ['PASTA REDIMIX USG 21.8 KG CAJA', 'CAJA'],
    ['RESPIRADOR N95 JFY CAJA DE 20 UNIDADES', 'CAJA'],
    ['CAJA RECTANGULAR DE METAL', 'UND'],
    ['CAJA FUERTE ORGANIZADORA GUATEPLAST', 'UND'],
    ['TAPON DE OIDOS LIBUS REUSABLE C/CUERDA Y CAJA', 'UND'],
    // cubeta / galón / litro (presentación vs envase)
    ['PASTA REDIMIX USG 28 KG CUBETA', 'CUBETA'],
    ['SUPER PAINT PAINT AND PRIMER CUBETA BLANCO', 'CUBETA'],
    ['CUBETA PLASTICA 5 GALONES MULTIUSOS', 'UND'],
    ['CUBETA ESCURRIDORA SURTIDA PLASTICA 16L', 'UND'],
    ['PRO PLUS LATEX MATE BLANCO GALON', 'GALÓN'],
    ['PEGAMENTO DE CONTACTO WELDBOND 1/8 GAL', 'GALÓN'],
    ['RESINA 6100 INTERIOR (BOLSA DE 1 GALÓN)', 'GALÓN'],
    ['CEMENTO ASFÁLTICO 1GL', 'GALÓN'],
    ['ENVASE PLASTICO ¼GL BLANCO', 'UND'],
    ['THINNER LACA LITRO', 'LITRO'],
    ['SOTTOFONDO 1000 LITRO', 'LITRO'],
    // saco (polvo a granel)
    ['CEMENTO GRIS USO GENERAL 4060PSI', 'SACO'],
    ['CEMENTO UGC PROGRESO GRIS', 'SACO'],
    ['CAL GRANDE HIDRATADA HORCALSA 25KG', 'SACO'],
    ['CERNIDO REPELLO NORMAL PEGASO 40KG', 'SACO'],
    ['MONOCAPA BLANCO 40KG', 'SACO'],
    ['PEGATABLA ADESIVO SACO 18KG', 'SACO'],
    ['SACO POLVO DE MARMOL EXTRAFINO', 'SACO'],
    ['BASECOAT LA ROCA 20 KG', 'SACO'],
    ['MEZCLA LEVANTA MURO 50KG', 'SACO'],
    ['BOLSA DE CONCRETO 3001 3/8 PULGADA DE 45KG MIXTO LISTO', 'SACO'],
    // libra / rollo / metro / yarda / par / resma / tonel
    ['ALAMBRE AMARRE LB.', 'LIBRA'],
    ['LBS. ALAMBRE GALVANIZADO CAL. 14', 'LIBRA'],
    ['LB. YESO EN POLVO', 'LIBRA'],
    ['LIBRA TILOSA USO REVESTIMIENTO', 'LIBRA'],
    ['ROLLO DE CINTA DE PAPEL 250\'', 'ROLLO'],
    ['ROLLO NYLON NEGRO (72"X60m)', 'ROLLO'],
    ['ARENA DE RIO RUS. METRO', 'METRO'],
    ['PIEDRIN DE 3/8/" METRO', 'METRO'],
    ['PLASTICO NEGRO YARDA', 'YARDA'],
    ['GUANTE SOLVEX ALPHATECH DE NITRILO TALLA 8', 'PAR'],
    ['BOTA DE SEGURIDAD BALDER EH SAFETY#', 'PAR'],
    ['ZAPATO INDUSTRIAL PUNTA DE ACERO 42', 'PAR'],
    ['RESMA DE PAPEL T/CARTA PAPERLINE 2000 75GR', 'RESMA'],
    ['RESINA DM-21 TONEL', 'TONEL'],
    ['TONEL DE METAL CON CINCHO', 'UND'],
    ['MEDIO TONEL METAL', 'UND'],
    // lo que se cuenta por unidad (perfilería, tablas, herramienta, EPP)
    ['POSTE DE 2½" X 10\' (0.35) CAL. 26', 'UND'],
    ['TABLA DUROCK ½” X 4’ X 8’', 'UND'],
    ['CANAL DE 2 ½" X 10\' (0.35) CAL. 26', 'UND'],
    ['CASCO BLANCO CON RATCH KAYO', 'UND'],
    ['ESPATULA PARA TABLAYESO 10" DE METAL TACTIX', 'UND'],
    /* v994-b (revisión adversarial): nombres que HOY no están en el Excel pero que van a
       entrar. Cada uno salía mal por una regla demasiado ancha o mal ordenada. */
    ['SILICON ACETICO 280 G', 'UND'],                    // gramos ≠ galones
    ['LIJA DE AGUA 100 G', 'UND'],
    ['LAMINA 26 G', 'UND'],                              // calibre
    ['CEMENTO SOLVENTE PARA PVC 1/4 GALON', 'GALÓN'],    // "cemento" líquido, no saco
    ['CEMENTO DE CONTACTO 1 GALON', 'GALÓN'],
    ['GUANTES DESECHABLES DE NITRILO CAJA DE 100', 'CAJA'],  // la caja gana al par
    ['GUANTE DE CARNAZA CAJA DE 12 PARES', 'CAJA'],
    ['BOTE PLASTICO 5 GALONES', 'UND'],                  // el recipiente, no su contenido
    ['GARRAFON DE 5 GALONES', 'UND'],
    ['BALDE PLASTICO 5 GALONES', 'UND'],
    ['EXTENSION ELECTRICA 25 METROS', 'UND'],            // el largo del artículo ≠ m³
    ['CABLE THHN #12 X 100 METROS', 'UND'],
    ['NIVEL LASER 30 METROS', 'UND'],
    ['CINTA DE MEDIR 8M', 'UND'],                        // herramienta, no cinta adhesiva
    ['CINTA MEDIDORA 5M', 'UND'],
    ['CAJA DE CINTA DE PAPEL', 'CAJA'],                  // dice CAJA: manda la caja
    ['MARMOL FINO', 'SACO'],                             // polvos que faltaban
    ['CALCIO OM', 'SACO'],
    ['LIBRA TILOSA USO REVESTIMIENTO', 'LIBRA'],
    ['SELLADOR LA ROCA CUBETA', 'CUBETA'],               // LA ROCA es marca, no presentación
    ['IMPERMEABILIZANTE LA ROCA GALON', 'GALÓN'],
    ['MAZO DE 5 LBS', 'UND'],                            // el peso de la herramienta
    ['ALMADANA 10 LB MANGO DE MADERA', 'UND'],
    ['MARTILLO DE 2 LB MANGO FIBRA', 'UND']
  ];
  let malos = [];
  casos.forEach(([n, esp]) => { const got = f(n); if (got !== esp) malos.push(n + ' → ' + got + ' (esperado ' + esp + ')'); });
  ok('clasifica los ' + casos.length + ' materiales de muestra' + (malos.length ? ':\n     ' + malos.join('\n     ') : ''), !malos.length);
}

// ── el catálogo de proveedores usa la unidad automática ──
const zRender = ex('function renderCatProvProductos(');
ok('el render del catálogo muestra la unidad derivada', /_catUnidadAuto\(prod\.nombre, _uIdx\)/.test(zRender));
/* v994-b (revisión adversarial, hallazgo alto): abrir el catálogo NO puede escribir ni
   subir el state — proveedoresGlobales viaja por last-write-wins y pisaría el catálogo
   editado en otro dispositivo. La unidad se muestra derivada; se graba solo al editarla
   a mano o al importar el Excel. */
ok('el render NO persiste nada', !/_catRellenarUnidades/.test(html) && !/saveState\(\)/.test(zRender));
ok('el buscador también encuentra por la unidad derivada', /_uDe\(prod\)/.test(zRender));
ok('la importación del Excel de precios también asigna unidad', /_catUnidadAuto\(/.test(html));
// el índice se cachea: renderCatProvProductos corre en CADA tecleo del buscador
ok('el índice de unidades se cachea', /_catUIdxCache/.test(ex('function _catUnidadIndex(')));
ok('el cache se invalida al abrir el catálogo y al importar', (html.match(/_catUnidadIndexReset\(\)/g) || []).length >= 2);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
