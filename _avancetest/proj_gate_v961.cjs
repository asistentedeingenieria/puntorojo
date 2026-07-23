/* v961 (pedido de Antonio 23-jul): al ABRIR la app no hay ningún proyecto seleccionado —
   gate de selección OBLIGATORIA que bloquea todo hasta elegir, cada vez que se abre,
   para todos los usuarios. Decisiones confirmadas con Antonio: bloqueo TOTAL.
   Diseño: overlay opaco tras el login (applyAuthSession); NO va en isUserBusy (el sync
   inicial corre detrás mientras el usuario elige); usuarios con obraAsignada válida se
   saltan el gate (su obra se fuerza sola, v631); mustChangePassword también lo salta
   (su modal es z100 y quedaría tapado); logout resetea el flag. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFrom(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. predicado puro de elegibilidad ──
const aSrc = extractFrom('window._projGateAplica = function');
ok('_projGateAplica existe', !!aSrc);
let aFn = null;
try { aFn = new Function('return (function' + aSrc.slice(aSrc.indexOf('(')) + ')')(); } catch(e){}
ok('_projGateAplica evaluable', typeof aFn === 'function');
if (typeof aFn === 'function') {
  const projs = [{ id: 'essenza-f2' }, { id: 'vla' }];
  ok('usuario normal SÍ pasa por el gate', aFn({ perms: ['*'] }, projs) === true);
  ok('encargado con obra asignada VÁLIDA se lo salta', aFn({ obraAsignada: 'vla' }, projs) === false);
  ok('obra asignada que ya no existe NO lo salta', aFn({ obraAsignada: 'proyecto-viejo' }, projs) === true);
  ok('sin usuario no revienta', aFn(null, projs) === true);
}

// ── 2. el gate en sí ──
const gSrc = extractFrom('function _abrirGateProyecto(');
ok('_abrirGateProyecto existe', !!gSrc);
ok('overlay OPACO que bloquea todo', /_projGateModal/.test(gSrc) && /position:fixed;inset:0/.test(gSrc) && /background:var\(--paper\)/.test(gSrc));
ok('flag una-vez-por-carga', /_projGateHecho/.test(gSrc));
ok('elegir llama setActiveProject', /setActiveProject\(/.test(gSrc));
ok('reintenta si los proyectos aún no sincronizan', /setTimeout\(pinta/.test(gSrc) || /CARGANDO PROYECTOS/.test(gSrc));
ok('sin botón de cerrar ni click-afuera', !/CERRAR|onclick="\S*cerrar/i.test(gSrc.replace(/CARGANDO/g, '')));

// ── 3. cableado en el login ──
const zAuth = extractFrom('function applyAuthSession(');
ok('applyAuthSession dispara el gate', /_abrirGateProyecto/.test(zAuth));
ok('...pero NO en el flujo mustChangePassword (su modal es z100)', (() => {
  const iMust = zAuth.indexOf('mustChangePassword === true');
  const iGate = zAuth.indexOf('_abrirGateProyecto');
  if (iMust < 0 || iGate < 0) return false;
  // el gate vive en la rama else / después, no dentro del if de mustChangePassword
  const zMust = zAuth.slice(iMust, zAuth.indexOf('}', iMust));
  return !/_abrirGateProyecto/.test(zMust);
})());

// ── 4. logout resetea; el gate NO pospone el sync ──
ok('_showLoginScreenNow resetea el gate', /_projGateHecho = false/.test(extractFrom('function _showLoginScreenNow(')));
ok('el gate NO está en isUserBusy (el sync corre detrás)', !/_projGateModal/.test(extractFrom('isUserBusy(){')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
