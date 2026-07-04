/* v892: PREVENCIÓN DEFINITIVA post-incidente 03-jul (planilla desarmada por un equipo
   con HTML viejo en caché). Tres capas:
   1) BLOQUEO DE VERSIONES VIEJAS: appState/config.minSyncVersion (doc que las versiones
      viejas ni conocen → no lo pueden pisar) con listener en vivo; si APP_SYNC_VERSION es
      menor, TODAS las subidas se bloquean y sale overlay a pantalla completa "ACTUALIZAR".
      Fail-open: sin doc config o minSyncVersion 0 → no bloquea nada.
   2) FORENSE: cada subida sella quién y con qué versión (stamp {ts, by, ver}).
   3) ALARMA: cuando el blindaje v891 rescata datos de una copia vieja, queda en ACTIVIDAD
      y avisa con toast (anoche nunca supimos qué equipo pisó). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. constante y helper puro ──
ok('APP_SYNC_VERSION = 892', /const APP_SYNC_VERSION = 892;/.test(html));
const src = extractFn('_versionBloqueada');
ok('_versionBloqueada existe', !!src);
if (src) {
  const f = new Function(src + '\nreturn _versionBloqueada;')();
  ok('bloquea si app < mínima', f(892, 900) === true);
  ok('NO bloquea si app == mínima', f(892, 892) === false);
  ok('NO bloquea si app > mínima', f(900, 892) === false);
  ok('fail-open: mínima 0 no bloquea', f(892, 0) === false);
  ok('fail-open: mínima null/undefined/basura no bloquea', f(892, null) === false && f(892, undefined) === false && f(892, 'xx') === false);
}

// ── 2. gate en las DOS rutas de subida (antes de escribir nada) ──
const upCur = html.slice(html.indexOf('async uploadCurrent(){'), html.indexOf('async uploadCurrent(){')+900);
ok('uploadCurrent gatea por versión', upCur.indexOf('_versionBloqueada(APP_SYNC_VERSION, this._minSyncVersion)') >= 0 && upCur.indexOf('_mostrarBloqueoVersion(') >= 0);
const upAsis = html.slice(html.indexOf('async uploadAsistencia(){'), html.indexOf('async uploadAsistencia(){')+900);
ok('uploadAsistencia gatea por versión', upAsis.indexOf('_versionBloqueada(APP_SYNC_VERSION, this._minSyncVersion)') >= 0);

// ── 3. listener en vivo del doc config (kill-switch instantáneo) ──
ok('lee appState/config con onSnapshot', /doc\('config'\);?\s*\n\s*cfgRef\.onSnapshot/.test(html.replace(/\r\n/g,'\n')));
ok('setea _minSyncVersion desde el doc', html.indexOf('minSyncVersion') >= 0 && html.indexOf('this._minSyncVersion = Number(') >= 0);

// ── 4. overlay bloqueante con botón de actualizar ──
const ov = extractFn('_mostrarBloqueoVersion');
ok('_mostrarBloqueoVersion existe', !!ov);
ok('overlay a pantalla completa con z-index máximo', ov.indexOf('2147483647') >= 0 && ov.indexOf('position:fixed') >= 0);
ok('botón ACTUALIZAR recarga', ov.indexOf('window.location.reload()') >= 0);
ok('no duplica el overlay', ov.indexOf("getElementById('verBloqueoOverlay')") >= 0);

// ── 5. forense: el stamp de subida lleva versión (además de ts y by que ya llevaba) ──
ok('los stamps de subida sellan la versión (2 rutas)', (html.match(/ver: APP_SYNC_VERSION \}/g)||[]).length >= 2);

// ── 6. alarma del blindaje v891: rastro en ACTIVIDAD + toast ──
ok('el hook v891 cuenta proyectos blindados', /_blindados\+\+/.test(html));
ok('deja rastro en ACTIVIDAD', /logActivity\('update', 'BLINDAJE DE PLANILLAS ACTIVADO'/.test(html));
ok('avisa con toast', /BLINDAJE: SE RESCATARON DATOS/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
