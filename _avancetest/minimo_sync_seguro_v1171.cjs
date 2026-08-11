/* v1171 — SUBIR EL MÍNIMO DE VERSIÓN YA NO PUEDE DEJAR A NADIE PARADO
             + LA EVIDENCIA DE UN FALLO DE SYNC DEJA DE BORRARSE SOLA

   LO QUE PASÓ (11-ago): le di a Antonio el comando crudo para subir appState/config
   .minSyncVersion a 932. Lo corrió desde una pestaña que todavía tenía v1167 (APP_SYNC 931).
   Resultado: se bloqueó a sí mismo — el candado v892 rechaza las subidas de cualquier app por
   debajo del mínimo. Y con él, cualquiera de los 50 que no hubiera recargado.

   DOS FALLAS, NINGUNA DE ANTONIO:
   1. El mínimo se sube pegando un comando crudo de Firestore. Nada impide subirlo por encima
      de la versión de quien lo ejecuta (imposible que eso sea correcto) ni saber a cuánta
      gente va a dejar parada. Un procedimiento que depende de que yo me acuerde de avisar
      "recargá primero" no es un blindaje.
   2. Cuando fui a buscar el error, no había nada: _chipDone BORRA users/{uid}.lastSyncError
      en el primer sync exitoso, así que el Ctrl+Shift+R de Antonio se llevó la evidencia del
      episodio. Seguimos sin saber qué pintó el chip rojo, y no por falta de registro sino
      porque el registro se autodestruye al recuperarse.

   EL ARREGLO:
   · _minimoSyncValidar(n, miVersion): PURA. Rechaza subir por encima de la propia versión.
   · _minimoSyncResumen(usuarios, n): PURA. Cuenta quién quedaría abajo ANTES de aplicar, con
     los datos reales de users/ (cada equipo ahora sella su appVer al sincronizar bien).
   · El error ya no se borra: se marca como resuelto y el rastro queda.

   REGLA: ninguna acción que pueda parar a la flota se ejecuta a ciegas ni sin poder deshacerse. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— la validación (PURA): lo que pasó el 11-ago no puede volver a pasar —');
const srcVal = ex(code, 'function _minimoSyncValidar(');
ok('existe _minimoSyncValidar', !!srcVal);
if (srcVal) {
  const val = new Function(srcVal + '\nreturn _minimoSyncValidar;')();
  /* EL CASO EXACTO: Antonio en 931 subiendo el mínimo a 932 */
  ok('RECHAZA subir por encima de la versión propia (el error del 11-ago)', val(932, 931).ok === false);
  ok('y explica por qué, sin tecnicismos', /BLOQUE|RECARG|VERSI/i.test(val(932, 931).motivo || ''));
  ok('permite igualar la versión propia', val(932, 932).ok === true);
  ok('permite un mínimo más viejo (marcha atrás para desbloquear)', val(930, 932).ok === true);
  ok('rechaza basura', val('x', 932).ok === false && val(null, 932).ok === false);
  ok('rechaza negativos y cero', val(0, 932).ok === false && val(-5, 932).ok === false);
}

console.log('\n— el resumen previo (PURO): con datos, no a ciegas —');
const srcRes = ex(code, 'function _minimoSyncResumen(');
ok('existe _minimoSyncResumen', !!srcRes);
if (srcRes) {
  const res = new Function(srcRes + '\nreturn _minimoSyncResumen;')();
  const USERS = [
    { nombre: 'ANTONIO', appVer: 934 },
    { nombre: 'SUSANA',  appVer: 934 },
    { nombre: 'RONY',    appVer: 931 },   // atrasado: quedaría parado
    { nombre: 'ERLIN',   appVer: 0   },   // nunca sincronizó con el sello nuevo
    { nombre: 'CLAUDIA' },                // sin dato
  ];
  const r = res(USERS, 934);
  ok('cuenta los que quedarían parados', r.atrasados.length === 1);
  ok('los nombra (para poder avisarles)', /RONY/.test(JSON.stringify(r.atrasados)));
  ok('cuenta los que están al día', r.alDia === 2);
  ok('cuenta aparte los que no tienen dato (no se pueden dar por buenos)', r.sinDato === 2);
  ok('con la flota al día, nadie queda parado', res([{nombre:'A',appVer:934}], 934).atrasados.length === 0);
  ok('tolera lista vacía o basura', (() => { try { return res([], 934).atrasados.length === 0 && res(null, 934).sinDato === 0; } catch(e){ return false; } })());
}

console.log('\n— el comando seguro reemplaza al comando crudo —');
ok('existe window._subirMinimoSync', /window\._subirMinimoSync\s*=/.test(code));
const sub = ex(code, 'window._subirMinimoSync = async function(');
ok('valida ANTES de tocar la nube', /_minimoSyncValidar\(/.test(sub));
ok('mira en qué versión está cada usuario', /_minimoSyncResumen\(/.test(sub) && /collection\('users'\)/.test(sub));
ok('exige confirmación explícita', /confirm|prConfirm/i.test(sub));
ok('deja rastro de quién lo subió y cuándo', /minSyncSubidoPor|minSyncSubidoTs/.test(sub));

console.log('\n— la evidencia de un fallo ya no se borra sola —');
const done = ex(code, '_chipDone(){');
ok('_chipDone ya NO borra lastSyncError', !/lastSyncError: firebase\.firestore\.FieldValue\.delete\(\)/.test(done));
ok('lo marca como resuelto (queda el rastro para diagnosticar)', /lastSyncErrorResuelto/.test(done));
ok('sella la versión de este equipo (para el aviso previo)', /appVer/.test(done));
ok('sella cuándo se lo vio por última vez', /lastSeen/.test(done));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
