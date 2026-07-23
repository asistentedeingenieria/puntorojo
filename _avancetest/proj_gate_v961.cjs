/* v961→v963: el GATE de proyecto al abrir (pantalla SELECCIONÁ EL PROYECTO) se implementó
   a pedido de Antonio y ÉL MISMO lo eliminó el mismo día tras probarlo ("Esto no me gusta
   asi"). Este test asegura que quedó FUERA y que no vuelva por accidente — NO recrear la
   pantalla sin pedido explícito (mismo patrón que la pestaña LIQUIDACIÓN POR PERSONA v952). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFrom(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. el gate NO existe (solo puede quedar la lápida en comentario) ──
ok('sin función _abrirGateProyecto', !/function _abrirGateProyecto\(/.test(html));
ok('sin overlay _projGateModal', !/_projGateModal/.test(html.replace(/\/\*[\s\S]*?\*\//g, '')));
ok('sin predicado _projGateAplica', !/_projGateAplica/.test(html));
ok('la lápida documenta la eliminación', /GATE de proyecto al abrir[\s\S]{0,200}ELIMINADO/.test(html));

// ── 2. el login quedó limpio ──
const zAuth = extractFrom('function applyAuthSession(');
ok('applyAuthSession no dispara ningún gate', !/GateProyecto|_projGate/.test(zAuth));
const zLogin = extractFrom('function _showLoginScreenNow(');
ok('_showLoginScreenNow sin residuos del gate', !/_projGate/.test(zLogin));

// ── 3. cerrar la bodega regresa a la app tal cual (sin gate) ──
const zCerrar = extractFrom('function _cerrarPanelBodega(');
ok('_cerrarPanelBodega simple, sin gate', /_cerrarPanelBodegaDom\(\)/.test(zCerrar) && !/_projGate|_abrirGateProyecto/.test(zCerrar));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
