/* v1315 · EL ADELANTO APROBADO LIBERA LA FOTO (caso VLA · N02 · apto 201, Antonio 05-sep).
   El admin aprobó el adelanto de las etapas 3 y 4 (a.acuseSaltosAprobados — el flujo
   "APROBAR ADELANTO" promete "el supervisor podrá cargar esta etapa antes de que termine la
   anterior"). El ACUSE se liberó, pero la FOTO de la etapa 4 seguía "🔒 BLOQUEADA · TERMINAR
   LA ETAPA ANTERIOR PRIMERO": el candado secuencial v904 de los proyectos EN ORDEN solo
   miraba 2 fotos / cuadrito de la etapa anterior y nunca el adelanto. Dos candados para una
   misma promesa.
   FIX: (1) helper _etapaAdelantoAprobado(a, idx); los 3 candados de foto (render + cámara en
   vivo + cámara nativa) lo respetan. (2) La CASCADA v904 (una foto en N marca las inferiores)
   se CORTA en una etapa con adelanto: el adelanto dice justamente que la anterior NO está —
   marcarla cobraría una etapa no hecha. Aplica en la subida local (_autoMarcarEtapaPorFotos)
   y en la re-evaluación por sync (_reevalAutoMarcaApto, v948) ⇒ APP_SYNC 950. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— 1. helper _etapaAdelantoAprobado —');
const srcH = extractFn('_etapaAdelantoAprobado');
ok('existe', !!srcH);
let h = null;
try { h = new Function(srcH + '\nreturn _etapaAdelantoAprobado;')(); } catch(e){}
ok('evaluable', typeof h === 'function');
if (h) {
  ok('adelanto en la etapa pedida ⇒ true', h({ acuseSaltosAprobados: { '3': { aprobadoPor: 'x' } } }, 3) === true);
  ok('adelanto en OTRA etapa ⇒ false', h({ acuseSaltosAprobados: { '3': {} } }, 2) === false);
  ok('índice como texto también', h({ acuseSaltosAprobados: { '3': {} } }, '3') === true);
  ok('sin mapa ⇒ false', h({}, 3) === false && h({ acuseSaltosAprobados: null }, 3) === false);
  ok('apto null ⇒ false (no truena)', h(null, 3) === false);
}

console.log('— 2. los 3 candados de foto respetan el adelanto —');
const render = extractFn('renderPhotosModal');
const iV904 = render.indexOf('if (_fotosEtapasLibres() && !_proyectoEtapasEnOrden(p)) prevDone = true;');
const iAdel = render.indexOf('const _viaAdelanto = !prevDone && _etapaAdelantoAprobado(a, idx)');
ok('render: consulta el adelanto DESPUÉS del candado v904', iV904 > 0 && iAdel > iV904);
ok('render: el adelanto abre la etapa', render.includes('if (_viaAdelanto) prevDone = true;'));
ok('render: se ve por qué está abierta', render.includes('ADELANTO APROBADO'));
ok('render: el candado normal sigue diciendo lo suyo', render.includes('TERMINAR LA ETAPA ANTERIOR PRIMERO'));
const cam = extractFn('openCameraModal');
ok('cámara en vivo: respeta el adelanto antes del toast', (function(){
  const i = cam.indexOf('_etapaAdelantoAprobado(_a, etapaIdx)');
  const j = cam.indexOf('PRIMERO TERMINAR LAS ETAPAS PREVIAS');
  return i > 0 && j > i;
})());
const nat = html.slice(html.indexOf('window.tomarFotoAvance = async function'), html.indexOf('window.tomarFotoAvance = async function') + 3000);
ok('cámara nativa (la de la PWA): respeta el adelanto antes del toast', (function(){
  const i = nat.indexOf('_etapaAdelantoAprobado(a, etapaIdx)');
  const j = nat.indexOf('PRIMERO TERMINAR LAS ETAPAS PREVIAS');
  return i > 0 && j > i;
})());
ok('los candados v904 siguen intactos (3 sitios)', (html.match(/_fotosEtapasLibres\(\) && !_proyectoEtapasEnOrden\(/g) || []).length >= 3);

console.log('— 3. la cascada local se corta en la etapa con adelanto —');
const srcL = extractFn('_autoMarcarEtapaPorFotos');
let f = null;
try { f = new Function(srcL + '\nreturn _autoMarcarEtapaPorFotos;')(); } catch(e){}
ok('_autoMarcarEtapaPorFotos evaluable', typeof f === 'function');
if (f) {
  /* apto 201: etapas 1-2 hechas, adelanto en 3 y 4, sube 1 foto de la etapa 4 */
  let a = { stages: [true,true,false,false,false,false], stagesTs: [10,20], photos: { '3': ['u1'] }, acuseSaltosAprobados: { '2': {}, '3': {} } };
  let r = f(a, 3);
  ok('apto 201: la foto de 2ª cara NO marca REFUERZOS', r.inferiores === 0 && a.stages[2] === false && r.actual === 'falta1');
  a.photos['3'].push('u2'); r = f(a, 3);
  ok('con 2 fotos marca SU etapa y REFUERZOS sigue sin marcar', r.actual === 'marcada' && a.stages[3] === true && a.stages[2] === false);
  /* adelanto SOLO en la 4: la cadena se rompe ahí, nada de abajo se infiere */
  a = { stages: [true,false,false,false,false,false], photos: { '3': ['u1'] }, acuseSaltosAprobados: { '3': {} } };
  r = f(a, 3);
  ok('adelanto solo en la 4: no infiere la 3 ni la 2', r.inferiores === 0 && a.stages[2] === false && a.stages[1] === false);
  /* adelanto SOLO en la 3: la foto de la 4 sí prueba la 3 (sin adelanto en la 4), pero la 3 ya no prueba la 2 */
  a = { stages: [false,false,false,false,false,false], photos: { '3': ['u1'] }, acuseSaltosAprobados: { '2': {} } };
  r = f(a, 3);
  ok('adelanto solo en la 3: marca la 3 y se detiene', r.inferiores === 1 && a.stages[2] === true && a.stages[1] === false && a.stages[0] === false);
  /* sin adelanto: cascada v904 intacta */
  a = { stages: [false,false,false,false,false,false], photos: { '3': ['u1'] } };
  r = f(a, 3);
  ok('sin adelanto: la cascada v904 sigue igual', r.inferiores === 3 && a.stages[0] && a.stages[1] && a.stages[2]);
}

console.log('— 4. la re-evaluación por sync (v948) también se corta —');
const srcR = extractFn('_reevalAutoMarcaApto');
let g = null;
try { g = new Function('return (' + srcR + ')')(); } catch(e){}
ok('_reevalAutoMarcaApto evaluable', typeof g === 'function');
if (g) {
  /* apto 201 llegando por sync a otro teléfono: 2 fotos en la 4, adelanto en 3 y 4 */
  let a = { stages: [true,true,false,false,false,false], stagesTs: [10,20], photos: { '3': ['u1','u2'] }, photoTs: { '3': [1000,1100] }, acuseSaltosAprobados: { '2': {}, '3': {} } };
  const n = g(a);
  ok('apto 201 por sync: marca la 4 (2 fotos propias) y NO REFUERZOS', n === 1 && a.stages[3] === true && a.stages[2] === false);
  ok('idempotente', g(a) === 0);
  /* adelanto solo en la 3, 1 foto en la 4 */
  a = { stages: [false,false,false,false,false,false], photos: { '3': ['u1'] }, photoTs: { '3': [2000] }, acuseSaltosAprobados: { '2': {} } };
  const n2 = g(a);
  ok('adelanto solo en la 3: la foto de la 4 marca la 3 y se detiene', n2 === 1 && a.stages[2] === true && a.stages[1] === false && a.stages[0] === false);
  /* sin adelanto: cascada v904 intacta */
  a = { stages: [false,false,false,false,false,false], photos: { '4': ['u1'] }, photoTs: { '4': [2000] } };
  ok('sin adelanto: cascada v948 igual (4 marcadas)', g(a) === 4 && a.stages[0] && a.stages[3] && a.stages[4] === false);
}

console.log('— 5. cambia el merge ⇒ ritual v892 (piso) —');
const m = html.match(/const APP_SYNC_VERSION = (\d+);/);
ok('APP_SYNC_VERSION >= 950', m && Number(m[1]) >= 950);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
