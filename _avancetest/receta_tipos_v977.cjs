/* v977 (pedido de Antonio 26-jul): TIPO/MODELO de apto desde el Excel de la receta.
   El encabezado de cada columna trae el tipo ALAPAR: "301 - A1" → apto 301, tipo A1;
   si no trae nada alapar, el encabezado MISMO es el modelo (ej. "PASILLOS").
   Se captura al (re)cargar la receta → recetaV2.tipos = { aptoId: tipo }.
   Al cambiar la CANTIDAD de un apto, el cambio se propaga a TODOS los aptos del MISMO
   tipo en TODO el proyecto (frontera reusa el ejecutor PURO por apto destino; tn por delta). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. el parser captura los tipos del encabezado (funcional) ──
const srcP = ex('function _aptoNorm(') + '\n' + ex('function resolveAptoId(') + '\n' + ex('function parseRecetaEstandar(');
let parse = null;
try { parse = new Function(srcP + '\nreturn parseRecetaEstandar;')(); } catch(e){}
if (parse) {
  const towers = [{ name:'TORRE ÚNICA', levels:[{ id:'l3', name:'NIVEL 03', aptos:[
    { id:'a301', name:'APARTAMENTO 301' }, { id:'a302', name:'APARTAMENTO 302' }, { id:'apas', name:'PASILLOS' } ] }] }];
  const sheets = { 'N03': [
    ['', 'RECETA DE MATERIALES — NIVEL 03'],
    ['MATERIAL', 'NOMBRE REAL (COMPRA)', 'U', 'PASILLOS', '301 - A1', '302 - A2', 'TOTAL NIVEL'],
    ['1RA ETAPA', '', '', '', '', '', ''],
    ['Clavo de fijación', 'CLAVO CON ROLDANA 1"', 'u', 19, 122, 132, 273]
  ] };
  let r = null, threw = false;
  try { r = parse(sheets, towers); } catch(e){ threw = true; console.log('  parser lanzó:', e && e.message); }
  ok('el parser corre', !threw && !!r);
  const tipos = (r && r.recetaV2 && r.recetaV2.tipos) || {};
  ok('"301 - A1" → tipo A1', tipos['a301'] === 'A1');
  ok('"302 - A2" → tipo A2', tipos['a302'] === 'A2');
  ok('sin nada alapar → el encabezado ES el modelo (PASILLOS)', tipos['apas'] === 'PASILLOS');
  ok('las cantidades siguen entrando igual', !!(r && r.recetaV2.niveles.l3 && r.recetaV2.niveles.l3[0][0].aptos.a301 === 122));
} else ok('parseRecetaEstandar evaluable', false);

// ── 2. la propagación por tipo (funcional, ejecutor puro por destino) ──
const srcProp = ex('function aplicarOperacionReceta(') + '\n' + ex('function _recetaPropagarPorTipo(');
let propag = null, aplicar = null;
try { const f = new Function(srcProp + '\nreturn [aplicarOperacionReceta, _recetaPropagarPorTipo];')(); aplicar = f[0]; propag = f[1]; } catch(e){}
if (propag) {
  const p = { towers:[{ levels:[
    { id:'l1', name:'NIVEL 01', aptos:[{ id:'a1', name:'101' }] },
    { id:'l2', name:'NIVEL 02', aptos:[{ id:'a2', name:'201' }, { id:'a3', name:'202' }] } ] }] };
  const rv = { tipos:{ a1:'A1', a2:'A1', a3:'B1' }, niveles:{
    l1:{ 0:[{ m:'CLAVO', u:'u', aptos:{ a1:5 }, tn:5 }], 1:[],2:[],3:[] },
    l2:{ 0:[{ m:'CLAVO', u:'u', aptos:{ a2:5, a3:7 }, tn:12 }], 1:[],2:[],3:[] } } };
  const op = { tipo:'cantidad', levelId:'l1', etapaIdx:0, material:'CLAVO', aptoId:'a1', cantidadNueva:8 };
  const r1 = aplicar(rv, null, op);
  const rp = propag(p, rv, op);
  ok('propaga al apto del MISMO tipo en otro nivel', r1.ok && rp.aplicados === 1 && rv.niveles.l2[0][0].aptos.a2 === 8);
  ok('NO toca aptos de otro tipo', rv.niveles.l2[0][0].aptos.a3 === 7);
  ok('el tn del nivel destino se ajusta por delta (12+3=15)', rv.niveles.l2[0][0].tn === 15);
  ok('devuelve el tipo para el toast', rp.tipo === 'A1');
  const rp2 = propag(p, { niveles: rv.niveles }, op); // receta vieja sin tipos
  ok('sin tipos importados no propaga (0 aplicados)', rp2.aplicados === 0);
} else ok('_recetaPropagarPorTipo evaluable', false);

// ── 3. las fronteras llaman la propagación ──
ok('recetaV2Op propaga tras aplicar', /_recetaPropagarPorTipo\(/.test(ex('window.recetaV2Op = async function')));
ok('autorizarReceta propaga tras aplicar', /_recetaPropagarPorTipo\(/.test(ex('window.autorizarReceta = async function')));

// ── 4. el tipo se VE al elegir apto ──
const iR = html.indexOf("html += selrow('Apartamento'");
const zSel = html.slice(iR - 200, iR + 3500);
ok('los chips de apto muestran el tipo', /rv\.tipos/.test(zSel));
ok('aviso en vista por apto: el cambio va a TODOS los del tipo', /TODOS LOS APARTAMENTOS TIPO/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
