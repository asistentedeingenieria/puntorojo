/* v1044 — COSTO DE LA RECETA por TOTALES / NIVEL / APARTAMENTO.
   Antonio (con la vista ya andando con datos reales): "que esto salga predeterminado pero
   también quiero que de alguna manera se pueda ver por nivel y por apto y totales para poder
   ir viendo cuánto cuesta cada apto también." */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. el cálculo acepta el alcance —');
const zC = ex('function _comprasRecetaCosto(');
let make = null;
try {
  make = (nivelFn, aptoFn) => new Function('_getProveedores','_recetaV2EtapaNivel','precioDeProductoReceta','_recetaV2EtapaNivelPorApto',
    'return (' + zC + ')')(() => [], nivelFn, () => ({ precio: 10, rendimiento: 1 }), aptoFn);
} catch(e){}
ok('evaluable', !!make);
if (make) {
  const p = { materiales: { recetaV2: { formato:'estandar', etapas:['E1'], niveles: { l1:{}, l2:{} } } } };
  const nivel = (pp, lid, ei) => ({ M: lid === 'l1' ? 10 : 20 });
  const apto = (pp, lid, ei, aid) => ({ M: aid === 'a1' ? 3 : 5 });
  const f = make(nivel, apto);
  ok('sin alcance = TOTALES (lo predeterminado)', f(p).total === 300);
  ok('POR NIVEL restringe al nivel elegido', f(p, { tipo:'nivel', levelId:'l1' }).total === 100);
  ok('POR APARTAMENTO usa la columna del apto', f(p, { tipo:'apto', levelId:'l1', aptoId:'a1' }).total === 30);
  ok('otro apto, otro costo', f(p, { tipo:'apto', levelId:'l1', aptoId:'a2' }).total === 50);
  ok('nivel inexistente no revienta (cae vacío)', (f(p, { tipo:'nivel', levelId:'nope' }).total || 0) === 0);
} else { ['totales','nivel','apto','otro','inexistente'].forEach(n => ok(n, false)); }

console.log('\n— 2. los controles en la vista —');
const zH = ex('function _comprasRecetaCostoHTML(');
ok('selector de alcance (TOTALES / NIVEL / APARTAMENTO)', /POR NIVEL/.test(zH) && /POR APARTAMENTO/.test(zH) && /TOTALES/.test(zH));
ok('selects nativos (no los captura el picker)', /data-nativo/.test(zH));
ok('el título dice qué se está viendo', /_scopeLbl|NIVEL '|APTO/.test(zH));
ok('si el nivel elegido ya no existe, vuelve a TOTALES', /tipo: ?'total'|tipo:'total'/.test(zH));
const zS = ex('window._comprasCostoSet = function');
ok('cambiar el alcance re-pinta', /_comprasRecetaCostoHTML\(\)/.test(zS));
ok('cambiar de tipo elige nivel/apto por defecto', /levelId/.test(zS) && /aptoId/.test(zS));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
