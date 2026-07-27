/* v977 (pedido de Antonio 26-jul): APROXIMACIÓN A MILES en la receta, SOLO en los
   materiales que él marque (casilla ≈ del admin), visible en receta Y pedidos.
   Regla: el restante a miles <500 → inferior, >500 → siguiente (1,146→1,000; 1,550→2,000).
   Guardas: debajo de 500 va EXACTO (un pedido por apto de 122 clavos no se infla a mil,
   y un marcado nunca colapsa a 0); piso 1,000 desde 500.
   Flags en p.materiales.recetaMiles (FUERA de recetaV2: sobreviven re-import del Excel). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. la regla de redondeo (funcional) ──
// la regla vive DENTRO de la zona RECETA-PURE (función plana); window.* es solo el alias de afuera
// v978: la regla base es _recetaAprox(n, mult) — acá se prueba el caso millar (mult 1000)
const zAx = ex('function _recetaAprox(');
ok('_recetaAproxMiles existe (alias de mult 1000)', !!zAx && /function _recetaAproxMiles\(n\)\{ return _recetaAprox\(n, 1000\); \}/.test(html));
let fx = null;
try { const g = new Function('return (' + zAx.slice(zAx.indexOf('function')) + ')')(); fx = n => g(n, 1000); } catch(e){}
if (fx) {
  ok('1,146 → 1,000 (restante <500 al inferior)', fx(1146) === 1000);
  ok('1,550 → 2,000 (restante >500 al siguiente)', fx(1550) === 2000);
  ok('2,400 → 2,000 y 2,500 → 3,000', fx(2400) === 2000 && fx(2500) === 3000);
  ok('debajo de 500 queda EXACTO (pedidos por apto no se inflan)', fx(122) === 122 && fx(499) === 499);
  ok('500-999 sube a 1,000 (nunca colapsa a 0)', fx(500) === 1000 && fx(999) === 1000);
  ok('0 queda 0', fx(0) === 0);
} else ok('_recetaAproxMiles evaluable', false);

// ── 2. el flag y su toggle (solo admin) ──
const zEs = ex('function _recetaEsMiles(');
ok('_recetaEsMiles lee p.materiales.recetaMiles en MAYÚSCULA', /recetaMiles/.test(zEs) && /toUpperCase\(\)/.test(zEs));
const zTg = ex('window.recetaToggleMiles = async function'); // v978: async (pregunta el múltiplo)
ok('recetaToggleMiles solo admin', /can\('users\.manage'\)/.test(zTg));
ok('toggle guarda y fuerza subida', /saveState\(\)/.test(zTg) && /forceUploadNow/.test(zTg));

// ── 3. la vista TOTAL de la receta muestra el aproximado ──
const iR = html.indexOf('// v949: el admin APLICA cambios directo');
const zRen = html.slice(iR, iR + 9000);
ok('el render calcula qty aproximada para marcados en TOTAL', /_recetaEsMiles\(p, l\.nc \|\| l\.m\)/.test(zRen) && /_recetaAprox\(/.test(zRen)); // v977-fix2/v978: clave única nc||m + múltiplo
ok('marca visual ≈ con la cantidad real en el title', /REAL:/.test(zRen));
ok('toggle ≈ del admin en la fila (vista TOTAL)', /recetaToggleMiles\(/.test(zRen));

// ── 4. los pedidos de receta nacen aproximados ──
const iB = html.indexOf('// v909: SOLO POSTES A MEDIDA');
const zB = html.slice(iB, iB + 6000);
ok('el pedido redondea el q final del marcado', /_recetaEsMiles\(/.test(zB) && /_recetaAprox\(/.test(zB));
ok('el modal de confirmación muestra el mismo número que saldrá', (zB.match(/_recetaAprox\(/g) || []).length >= 2);

// ── 5. FIXES de la revisión adversarial (26-jul) ──
// D1: las claves del circuito de pedidos son nc||m — el flag debe cubrir AMBAS
const zTg2 = ex('window.recetaToggleMiles = async function');
// v977-fix2 (verificación): UNA sola clave = nc||m — la MISMA del circuito de pedidos.
// Así toggle, render y pedido siempre coinciden (el diseño de "ambas claves" era asimétrico:
// decidía por m pero el render miraba m||nc, y con nc compartido quedaba desync UI/pedido).
ok('D1: el toggle usa la clave del circuito (nc||m) con {on,ts,mult}', /String\(nombreCompra \|\| material \|\| ''\)/.test(zTg2) && /\{ on: nuevo, ts: Date\.now\(\), mult: mult \}/.test(zTg2));
ok('D1: el toggle decide por ESA misma clave', /nuevo = !_recetaEsMiles\(p, k\)/.test(zTg2));
let fEs = null;
try { fEs = new Function('return (' + ex('function _recetaEsMiles(') + ')')(); } catch(e){}
if (fEs) {
  const mkP = f => ({ materiales: { recetaMiles: f } });
  ok('D1: {on:true,ts} cuenta como marcado (case-insensitive)', fEs(mkP({ 'CLAVO': { on:true, ts:1 } }), 'clavo') === true);
  ok('D1: {on:false,ts} NO cuenta (desmarcado sin delete, mergeable)', fEs(mkP({ 'CLAVO': { on:false, ts:2 } }), 'CLAVO') === false);
  ok('D1: legacy true sigue valiendo', fEs(mkP({ 'CLAVO': true }), 'CLAVO') === true);
} else ok('_recetaEsMiles evaluable', false);
ok('D1: el render consulta por la clave del circuito (nc||m)', /_recetaEsMiles\(p, l\.nc \|\| l\.m\)/.test(zRen));
// escaping: los nc llevan comillas de pies (X 10') — el replace va ANTES de esc()
ok("D1: el nc del onclick escapa comillas ANTES de esc", /esc\(String\(l\.nc \|\| ''\)\.replace/.test(zRen));
// D2: recetaQty (contabilidad v909) queda EXACTA; solo items (lo comprado) va aproximado
const zB2 = html.slice(html.indexOf('// v909: SOLO POSTES A MEDIDA'), html.indexOf('// v909: SOLO POSTES A MEDIDA') + 7000);
ok('D2: recetaQty guarda el EXACTO', /recetaQty\[key\] = qExacto/.test(zB2) && !/recetaQty\[key\] = q;/.test(zB2));
// D3: los selectores (que son la confirmación) muestran el número aproximado
const zItems = ex('function _etapaItemsParaPedir(');
ok('D3: _etapaItemsParaPedir calcula mil/qtyMostrar', /qtyMostrar/.test(zItems) && /_recetaEsMiles/.test(zItems));
ok('D3: los dos selectores pintan el ≈', (html.match(/it\.mil \? '≈ ' : ''/g) || []).length >= 2);
// D4: dos capas anti-ref-huérfana (regla v769/v770) en el flujo de prompts de receta
ok('D4: isUserBusy cubre los prompts (.prModal-backdrop)', /\.prModal-backdrop'\)\) return true/.test(html)); // v989: la lista creció (#_recepcionModal)
const zOp = ex('window.recetaV2Op = async function');
ok('D4: recetaV2Op lee p DESPUÉS del await del prompt', zOp.indexOf('activeProj()') > zOp.indexOf('_recetaV2PedirDatos'));
const zSol2 = ex('window.recetaV2Solicitar = async function');
ok('D4: recetaV2Solicitar también', zSol2.indexOf('activeProj()') > zSol2.indexOf('_recetaV2PedirDatos'));
// D5: el flag viaja seguro — merge por clave/ts en applyRemote + versión de sync
const iV972 = html.indexOf('v972 BLINDAJE DE PEDIDOS');
ok('D5: applyRemote une recetaMiles por clave/ts', iV972 > 0 && /recetaMiles/.test(html.slice(iV972, iV972 + 7000)));
// v997: la versión de sync volvió a subir (merge de entregas por OC) — se fija el MÍNIMO
ok('D5: APP_SYNC_VERSION va en 913 o más', (function(){ const m = html.match(/const APP_SYNC_VERSION = (\d+);/); return !!m && Number(m[1]) >= 913; })());

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
