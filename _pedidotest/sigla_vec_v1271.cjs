/* v1271 (Antonio, 24-ago: "Vicinia del carmen es VEC en TODAS las abrebiaturas —
   corrígelo de una vez"): la sigla automática (v948, primera letra por palabra) daba
   VDC, y el mapa de siglas FIJAS v1182 (EF2/TOR, "mandan sobre _projSiglas") no la
   tenía — además media app llama _projSiglas DIRECTO (hoja de solicitud, QR del
   pedido, PDF de inventario) y ahí las fijas ni mandaban. El PDF de asistencia
   (v839) ya decía VEC desde siempre — esa es la sigla oficial.
   FIX: 'VICINIA DEL CARMEN': 'VEC' en OBRA_SIGLAS_FIJAS + _projSiglas consulta las
   FIJAS primero (con guarda: PURA sigue evaluando sola en tests viejos) — así VEC
   sale en TODAS las abreviaturas sin migrar ningún número guardado (patrón v1180:
   derivado en display). Efecto colateral deseado: TORELO directo también da TOR
   (consistente con v1182). El candado v1256 de VDC acepta VDC y VEC. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* 1. el mapa fijo — v1296 (27-ago): Antonio revirtió a VDC ("me volvió a salir VEC
   cuando debe de ser VDC"); el mecanismo v1271 (fijas mandan, derivado en display)
   sigue igual, solo cambió el valor. El candado v1256 acepta ambas siglas. */
const mMapa = html.match(/var OBRA_SIGLAS_FIJAS = \{[^}]*\};/);
const mapaSrc = mMapa ? mMapa[0] : '';
ok("OBRA_SIGLAS_FIJAS: 'VICINIA DEL CARMEN': 'VDC' (v1296)", /'VICINIA DEL CARMEN': 'VDC'/.test(mapaSrc));
ok('OBRA_SIGLAS_FIJAS conserva EF2 y TOR', /'EF2'/.test(mapaSrc) && /'TOR'/.test(mapaSrc));

/* 2. funcional: las fijas mandan también en _projSiglas directo */
const srcNorm = ex('function _obraCodigoNorm(');
const srcProj = ex('function _projSiglas(');
const srcObra = ex('function _obraSigla(');
let fns = null;
try {
  fns = new Function(srcNorm + ';' + mapaSrc + ';' + srcProj + ';' + srcObra + '; return { p: _projSiglas, o: _obraSigla };')();
} catch(e){ console.log('  eval:', e.message); }
ok('las funciones evalúan juntas', !!fns);
if (fns) {
  ok("_projSiglas('VICINIA DEL CARMEN') = VDC", fns.p('VICINIA DEL CARMEN') === 'VDC');
  ok('con minúsculas también', fns.p('Vicinia del Carmen') === 'VDC');
  ok("_obraSigla('VICINIA DEL CARMEN') = VDC", fns.o('VICINIA DEL CARMEN') === 'VDC');
  ok('VICINIA LAS AMÉRICAS sigue VLA', fns.p('VICINIA LAS AMÉRICAS') === 'VLA');
  ok('TORELO directo ahora TOR (la fija manda, v1182)', fns.p('TORELO') === 'TOR');
  ok('ESSENZA FASE 2 sigue EF2', fns.o('ESSENZA FASE 2') === 'EF2');
}

/* 3. PURA con guarda: _projSiglas evaluada SOLA (sin mapa ni norm) no revienta */
let sola = null;
try { sola = new Function(srcProj + '; return _projSiglas;')(); } catch(e){}
ok('_projSiglas sola sigue siendo evaluable (tests viejos, guarda try/catch)', !!sola && sola('VICINIA LAS AMÉRICAS') === 'VLA');

/* 4. el candado v1256 (solo VDC) acepta la sigla nueva */
const iGate = html.indexOf("_projSiglas((p && p.name) || '') === 'VDC'");
const iGateNuevo = html.indexOf("'VDC'") >= 0 && /\['VDC', ?'VEC'\]/.test(html);
ok('el candado v1256 de VDC acepta VDC y VEC', iGateNuevo);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
