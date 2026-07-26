/* v978 (pedido de Antonio 26-jul): el FULMINANTE va de la mano del clavo pero viene en
   CAJAS DE 100 — la aproximación deja de ser solo "a miles": cada material marcado ≈
   guarda su MÚLTIPLO de presentación ({on,ts,mult}): clavo=1000, fulminante=100.
   Regla generalizada _recetaAprox(n,mult): n < mult/2 → EXACTO; si no, round al múltiplo
   con piso mult (115,100→100; 156,100→200; 1,146,1000→1,000; 1,550,1000→2,000).
   Al ACTIVAR el ≈ se pregunta el múltiplo (default 1000, mínimo 10); flags viejos {on,ts}
   sin mult siguen valiendo como 1000. Sin cambio de sync (mismo merge por clave/ts). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. la regla generalizada (funcional) ──
const zA = ex('function _recetaAprox(');
ok('_recetaAprox(n, mult) existe (zona pura)', !!zA && html.indexOf('function _recetaAprox(') < html.indexOf('===RECETA-PURE-END==='));
let fA = null;
try { fA = new Function('return (' + zA + ')')(); } catch(e){}
if (fA) {
  ok('cajas de 100: 115 → 100 (restante <50 al inferior)', fA(115, 100) === 100);
  ok('cajas de 100: 156 → 200 (restante >50 al siguiente)', fA(156, 100) === 200);
  ok('cajas de 100: 49 queda EXACTO (< mitad del múltiplo)', fA(49, 100) === 49);
  ok('cajas de 100: 50-99 sube a 100 (piso, nunca 0)', fA(50, 100) === 100 && fA(99, 100) === 100);
  ok('millar: 1,146 → 1,000 y 1,550 → 2,000 (igual que antes)', fA(1146, 1000) === 1000 && fA(1550, 1000) === 2000);
  ok('sin mult usa 1000', fA(1146) === 1000);
} else ok('_recetaAprox evaluable', false);
ok('_recetaAproxMiles quedó como alias de mult 1000', /function _recetaAproxMiles\(n\)\{ return _recetaAprox\(n, 1000\); \}/.test(html));

// ── 2. el múltiplo por material ──
const zM = ex('function _recetaMilesMult(');
ok('_recetaMilesMult existe (zona pura)', !!zM);
let fM = null;
try { fM = new Function('return (' + zM + ')')(); } catch(e){}
if (fM) {
  const mkP = f => ({ materiales: { recetaMiles: f } });
  ok('lee el mult guardado', fM(mkP({ 'FULMINANTE TIRA CAL. 27 AMARILLO': { on:true, ts:1, mult:100 } }), 'fulminante tira cal. 27 amarillo') === 100);
  ok('flag viejo {on,ts} sin mult → 1000', fM(mkP({ 'CLAVO': { on:true, ts:1 } }), 'CLAVO') === 1000);
  ok('legacy true → 1000 y sin flag → 1000', fM(mkP({ 'X': true }), 'X') === 1000 && fM(mkP({}), 'Y') === 1000);
} else ok('_recetaMilesMult evaluable', false);

// ── 3. el toggle pregunta el múltiplo al ACTIVAR (y respeta v769/v770) ──
const zTg = ex('window.recetaToggleMiles = async function');
ok('toggle async: pregunta el múltiplo con prPrompt (default 1000)', /prPrompt/.test(zTg) && /1000/.test(zTg));
ok('guarda {on, ts, mult}', /\{ on: nuevo, ts: Date\.now\(\), mult: mult \}/.test(zTg));
ok('re-lee p tras el await del prompt (regla v769/v770)', /activeProj\(\)[\s\S]*prPrompt[\s\S]*activeProj\(\)/.test(zTg));
ok('múltiplo mínimo 10 (rechaza basura)', /mult >= 10/.test(zTg));

// ── 4. TODOS los sitios de aplicación usan el múltiplo del material ──
const iR = html.indexOf('// v949: el admin APLICA cambios directo');
const zRen = html.slice(iR, iR + 11000);
ok('render TOTAL aproxima con el mult del material', /_recetaAprox\(qtyReal, _recetaMilesMult\(p, l\.nc \|\| l\.m\)\)/.test(zRen));
const iB = html.indexOf('// v909: SOLO POSTES A MEDIDA');
const zB = html.slice(iB, iB + 7000);
ok('el generador del pedido también', /_recetaAprox\(qExacto, _recetaMilesMult\(p, _nOrigItem\)\)/.test(zB));
ok('el modal de confirmación también', /_recetaAprox\(qtyFinal, _recetaMilesMult\(p, _nOrig\)\)/.test(zB));
ok('los selectores también (vía _etapaItemsParaPedir)', /_recetaAprox\(n, _recetaMilesMult\(p, name\)\)/.test(ex('function _etapaItemsParaPedir(')));

// ── 5. FULMINANTES DERIVADOS (regla de Antonio 26-jul): los clavos de fijación y colganteo
// van de la mano con los fulminantes — la SUMA de clavos de la etapa ES el total de
// fulminantes (1 disparo por clavo). Tiras de 10 · cajas de 10 tiras · SIEMPRE cuadra
// hacia arriba (cajas completas que cubren los clavos ya aproximados). ──
const zF = ex('function _recetaDerivarFulminantes(');
ok('F: _recetaDerivarFulminantes existe (zona pura)', !!zF && html.indexOf('function _recetaDerivarFulminantes(') < html.indexOf('===RECETA-PURE-END==='));
let fF = null;
try { fF = new Function('return (' + zF + ')')(); } catch(e){}
if (fF) {
  const caso = fF([
    { name:'CLAVO CON ROLDANA 1"', qty:1000 },
    { name:'CLAVO CON ESCUADRA 1"', qty:270 },
    { name:'FULMINANTE TIRA CAL. 27 AMARILLO', qty:115 }
  ]);
  ok('F: 1,270 clavos → 127 tiras → 13 cajas = 130 tiras', !!caso && caso.tiras === 130 && caso.clavos === 1270);
  const chico = fF([{ name:'CLAVO CON ROLDANA 1"', qty:149 }, { name:'FULMINANTE TIRA CAL. 27 AMARILLO', qty:15 }]);
  ok('F: 149 clavos → 15 tiras → 2 cajas = 20 tiras (siempre CUBRE)', !!chico && chico.tiras === 20);
  ok('F: sin clavos en la etapa → null (el fulminante queda como está)', fF([{ name:'FULMINANTE TIRA CAL. 27 AMARILLO', qty:86 }]) === null);
  ok('F: sin fulminante → null', fF([{ name:'CLAVO CON ROLDANA 1"', qty:500 }]) === null);
  ok('F: dos líneas de fulminante → null (no se adivina el reparto)', fF([
    { name:'CLAVO X', qty:100 }, { name:'FULMINANTE A', qty:1 }, { name:'FULMINANTE B', qty:1 }
  ]) === null);
} else ok('_recetaDerivarFulminantes evaluable', false);
// los 4 sitios derivan
ok('F: el render TOTAL deriva el fulminante de la etapa', /_recetaDerivarFulminantes\(/.test(zRen2()));
ok('F: el generador del pedido deriva de los clavos del MISMO pedido', /_recetaDerivarFulminantes\(/.test(html.slice(iB, iB + 8000)));
ok('F: el selector también', /_recetaDerivarFulminantes\(/.test(ex('function _etapaItemsParaPedir(')));
function zRen2(){ return html.slice(iR, iR + 13000); }

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
