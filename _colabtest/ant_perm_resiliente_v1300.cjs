/* v1300 (Antonio, 27-ago, tercera vuelta del "le marqué subir comprobantes a finanzas
   y NO le sale"): el doc users/<uid> de oficina@ TIENE anticipos.transferir en la nube
   — pero su sesión seguía con permisos viejos. Dos agujeros reales:
   (a) el guard v1289 bloqueaba TODO snapshot fromCache — en un aparato con Firestore
       flaky (el de finanzas) casi todo llega fromCache y los permisos nunca se
       actualizaban en vivo. El cache del SDK es MONÓTONO por doc: aceptarlo no puede
       regresar permisos; el caso-wipe real (eco local sin el campo) lo siguen
       bloqueando hasPendingWrites + el guard de array.
   (b) descubierto de paso: para NO-admins, cachedUsers = copia de la PROPIA sesión —
       jamás sirve de fallback (por eso el intento anterior se descartó).
   FIX:
   - _permsAplicarFrescos(d): helper ÚNICO que aplica un perfil fresco (perms/obra) si
     cambió — lo usan el listener v1288 y el refresco bajo demanda.
   - Listener: solo bloquea hasPendingWrites (el eco local jamás manda, v1289); el
     cache SÍ se acepta.
   - _antPermRefrescar(): al ABRIR la lista de SOLICITUDES de anticipo, relee el perfil
     DIRECTO DEL SERVIDOR (get {source:'server'}, cadencia 60s) y aplica — aunque toda
     otra vía esté atascada, entrar a la pantalla trae la verdad. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* ── 1. el helper, FUNCIONAL ── */
const zA = ex('function _permsAplicarFrescos(');
ok('_permsAplicarFrescos existe', zA.length > 300);
if (zA.length > 300) {
  try {
    const corre = (cu, d) => {
      const llamadas = { ap: 0, ra: 0 };
      const zCmp = ex('function _permsCambiaron(');
      const r = new Function('currentUser', '_permsCambiaron', 'applyPermissions', 'isUserBusy', 'renderAll',
        zCmp + '\n' + zA + '\nreturn _permsAplicarFrescos(' + JSON.stringify(d) + ');')(
        cu, null, function(){ llamadas.ap++; }, function(){ return false; }, function(){ llamadas.ra++; });
      return { r, cu, llamadas };
    };
    const c1 = corre({ perms: ['a'], obraAsignada: '' }, { perms: ['a', 'anticipos.transferir'] });
    ok('aplica la casilla nueva y repinta', c1.r === true && c1.cu.perms.indexOf('anticipos.transferir') >= 0 && c1.llamadas.ap === 1 && c1.llamadas.ra === 1);
    ok('sin cambios no repinta de gratis', corre({ perms: ['a'], obraAsignada: '' }, { perms: ['a'] }).r === false);
    ok('campo perms ausente JAMÁS borra (v1289)', (function(){ const c = corre({ perms: ['a'], obraAsignada: '' }, { lastLogin: 1 }); return c.r === false && c.cu.perms.join() === 'a'; })());
  } catch(e){ ok('helper evaluable', false); console.log('  ' + e.message); }
}

/* ── 2. el listener v1288 con el guard afinado ── */
const zS = ex('function _suscribirPermisosEnVivo(');
ok('el listener usa el helper', /_permsAplicarFrescos\(/.test(zS));
ok('el eco local sigue bloqueado (hasPendingWrites)', /hasPendingWrites/.test(zS));
ok('el cache YA NO se bloquea (aparatos flaky reciben sus casillas)', !/metadata\.fromCache/.test(zS));

/* ── 3. el refresco bajo demanda ── */
const zR = ex('function _antPermRefrescar(');
ok('_antPermRefrescar relee del SERVIDOR con cadencia', /source: ?'server'/.test(zR) && /_antPermRefrescarUlt/.test(zR) && /_permsAplicarFrescos/.test(zR));
ok('abrir SOLICITUDES dispara el refresco', (function(){ const i = html.indexOf('function _antSolicRender(cont)'); return i > 0 && /_antPermRefrescar\(\)/.test(html.slice(i, i + 600)); })());

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
