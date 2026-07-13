/* v907 (reporte 13-jul "no me cuadran las cantidades" + "la medida de postes debe ser por nivel"):
   (1) CANTIDADES: la columna TOTAL NIVEL del Excel usa REDONDEO ÚNICO (ceil sobre la suma
       cruda) y las columnas por apto vienen redondeadas c/u hacia arriba → sumar los 12
       redondeos da MÁS que el total real de compra (canal N02: Σ celdas 197 vs TOTAL 191).
       Fix: parseRecetaEstandar captura item.tn (TOTAL NIVEL del Excel); _recetaV2EtapaNivel
       y totalMaterialNivel lo prefieren; aplicarOperacionReceta ajusta tn por delta al editar.
   (2) POSTES POR NIVEL: p.materiales.postesMedidaNivel[levelId] (override) con fallback al
       default del proyecto (postesMedida) y luego estándar 10'. _postesMedidaDe(p, levelId),
       _nombreCompraConMedida(nc, p, levelId); el chip y el pedido usan la medida DEL NIVEL. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. el parser captura TOTAL NIVEL (item.tn) ──
const deps = extractFn('_aptoNorm') + '\n' + extractFn('resolveAptoId') + '\n';
const srcParser = extractFn('parseRecetaEstandar');
if (srcParser && deps.length > 20) {
  const parse = new Function(deps + srcParser + '\nreturn parseRecetaEstandar;')();
  const towers = [{ id:'t1', name:'TORRE ÚNICA', levels:[{ id:'l-2', name:'NIVEL 02', aptos:[{id:'a-pas',name:'PASILLOS'},{id:'a-201',name:'APARTAMENTO 201'}] }]}];
  const sheets = { 'N02': [
    ['','RECETA — NIVEL 02'],
    ['','MATERIAL','NOMBRE REAL (COMPRA)','U','PASILLOS',"201 - A1'",'TOTAL NIVEL'],
    ['','1RA ETAPA'],
    ['','Canal','CANAL X','u',4,6,9],
    ['','Poste','POSTE X','u',2,3,0]
  ]};
  const { recetaV2 } = parse(sheets, towers);
  const e0 = (recetaV2.niveles['l-2']||{})[0] || [];
  const canal = e0.find(l => l.m === 'Canal');
  ok('item.tn = TOTAL NIVEL del Excel (9, no 10)', !!canal && canal.tn === 9);
  const poste = e0.find(l => l.m === 'Poste');
  ok('TOTAL 0 no deja tn', !!poste && !('tn' in poste));
} else { ok('parser extraído', false); }

// ── 2. los totales prefieren tn ──
const srcNivel = extractFn('_recetaV2EtapaNivel');
if (srcNivel) {
  const f = new Function(srcNivel + '\nreturn _recetaV2EtapaNivel;')();
  const p = { materiales: { recetaV2: { formato:'estandar', niveles: { 'l-2': { 0: [
    { m:'Canal', nc:'CANAL X', aptos:{ a:4, b:6 }, tn: 9 },
    { m:'Clavo', nc:'CLAVO X', aptos:{ a:2, b:2 } }
  ] } } } } };
  const r = f(p, 'l-2', 0);
  ok('pedido usa tn (redondeo único)', !!r && r['CANAL X'] === 9);
  ok('sin tn cae a la suma de aptos', !!r && r['CLAVO X'] === 4);
} else { ok('_recetaV2EtapaNivel extraída', false); }

const srcTot = extractFn('totalMaterialNivel');
if (srcTot) {
  const g = new Function(srcTot + '\nreturn totalMaterialNivel;')();
  ok('la vista de receta muestra tn', g({ aptos:{a:4,b:6}, tn:9 }) === 9);
  ok('sin tn muestra la suma', g({ aptos:{a:4,b:6} }) === 10);
} else { ok('totalMaterialNivel extraída', false); }

// ── 3. editar cantidad ajusta tn por delta ──
const srcOp = extractFn('aplicarOperacionReceta');
if (srcOp) {
  const h = new Function(srcOp + '\nreturn aplicarOperacionReceta;')();
  const rv = { niveles: { 'l-2': { 0: [ { m:'Canal', u:'u', aptos:{ a:4 }, tn: 9 } ], 1:[],2:[],3:[] } } };
  const res = h(rv, null, { tipo:'cantidad', levelId:'l-2', etapaIdx:0, material:'Canal', aptoId:'a', cantidadNueva:7 });
  ok('cantidad editada ajusta tn por delta (9+3=12)', res.ok === true && rv.niveles['l-2'][0][0].tn === 12 && rv.niveles['l-2'][0][0].aptos.a === 7);
} else { ok('aplicarOperacionReceta extraída', false); }

// ── 4. postes por nivel ──
const srcPm = extractFn('_postesMedidaDe') + '\n' + extractFn('_metrosAPies') + '\n' + extractFn('_nombreCompraConMedida');
if (/postesMedidaNivel/.test(srcPm)) {
  const mod = new Function(srcPm + '\nreturn { _postesMedidaDe, _nombreCompraConMedida };')();
  const p = { materiales: {
    postesMedida: { modo:'especial', metros: 2.8 },
    postesMedidaNivel: { 'l-s': 2.4 }
  } };
  ok('override del nivel gana', mod._postesMedidaDe(p, 'l-s').metros === 2.4);
  ok('sin override cae al default del proyecto', mod._postesMedidaDe(p, 'l-2').metros === 2.8);
  ok('sin nada → estándar', mod._postesMedidaDe({ materiales:{} }, 'l-2').modo === 'estandar');
  const nc = "POSTE DE 2½\" X 10' CAL. 26";
  ok('nombre de compra usa la medida DEL NIVEL', /X 7\.87'/.test(mod._nombreCompraConMedida(nc, p, 'l-s')) && /MEDIDA ESPECIAL 2\.4 m/.test(mod._nombreCompraConMedida(nc, p, 'l-s')));
  ok('compat: sin levelId usa el default', /MEDIDA ESPECIAL 2\.8 m/.test(mod._nombreCompraConMedida(nc, p)));
} else { ok('_postesMedidaDe con postesMedidaNivel', false); }

// ── 5. cableado ──
ok('el pedido usa la medida del nivel', /_nombreCompraConMedida\(key, p, levelId\)/.test(html));
ok('el chip de postes es por nivel seleccionado', /_postesMedidaDe\(p, recetaV2NivelSel\)/.test(html));
ok('checkbox aplicar a todos los niveles', /_postesTodosTmp/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
