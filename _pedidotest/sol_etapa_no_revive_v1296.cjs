/* v1296 (Antonio, 27-ago: "hay pedidos que salen como NO procesados pero en realidad YA
   se procesaron hace ratos — hay que revisar porque esto NO puede pasar"): las
   SOLICITUDES DE ETAPA de VDC (v1256) atendidas REVIVIERON en la vista activa. La marca
   `solEtapaAtendida` vive en la solicitud y viaja por union-merge con _ts — un aparato
   ATRASADO que re-selló la solicitud SIN la marca (p.ej. el self-heal v1270 estampó
   status+_ts fresco sobre una copia vieja) le GANÓ a la versión atendida y la marca se
   perdió en toda la flota. Misma familia que v1039 (factura) y v1240 (verifTok).
   FIX doble:
   1. ESCUDO `_solAtendidaShield` en el merge de pedidos del proyecto (quien-la-tiene-
      gana, patrón _verifTokShield) — la marca ya no se puede perder hacia adelante.
   2. SELF-HEAL `_solEtapaHeal` en renderPedidosList: el PEDIDO FORMAL es el dueño del
      vínculo (origenSolicitudEtapaId; fallback: observación "ATIENDE <numero> — ")
      — si existe el formal y la solicitud perdió la marca, se re-marca (regla v1064:
      campo derivable se cura desde la estructura dueña). Idempotente; repara lo YA
      dañado en cuanto cualquier aparato pinta la lista.
   Toca el merge ⇒ APP_SYNC_VERSION sube a 944 (ritual v892: minSync tras verificar
   el dominio). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* ── 1. el ESCUDO, funcional ── */
const zSh = ex('function _solAtendidaShield(');
ok('_solAtendidaShield existe', zSh.length > 200);
if (zSh.length > 200) {
  try {
    const sh = new Function(zSh + '\nreturn _solAtendidaShield;')();
    const marca = { pedidoId: 'F1', numero: 'VDC – 99', ts: 1 };
    const merged = [{ id: 's1', esSolicitudEtapa: true }, { id: 'p2' }];
    const local = [{ id: 's1', esSolicitudEtapa: true, solEtapaAtendida: marca }];
    ok('restaura la marca perdida desde el par local/remoto', sh(merged, local, []) === true && merged[0].solEtapaAtendida === marca);
    ok('sin marca en ningún lado no inventa nada', sh([{ id: 's3', esSolicitudEtapa: true }], [], []) === false);
    ok('idempotente (ya con marca no cambia)', sh(merged, local, []) === false);
    ok('solo toca solicitudes de etapa', (function(){ const m2 = [{ id: 'x' }]; return sh(m2, [{ id: 'x', solEtapaAtendida: marca }], []) === false && !m2[0].solEtapaAtendida; })());
  } catch(e){ ok('escudo evaluable', false); console.log('  ' + e.message); }
}
ok('el merge de pedidos del proyecto lo llama (junto al de verifTok)', (function(){
  const i = html.indexOf("_verifTokShield(_mpd.list");
  return i > 0 && /_solAtendidaShield\(_mpd\.list/.test(html.slice(i, i + 500));
})());

/* ── 2. el SELF-HEAL, funcional ── */
const zHe = ex('function _solEtapaHeal(');
ok('_solEtapaHeal existe', zHe.length > 300);
if (zHe.length > 300) {
  try {
    const heal = new Function(zHe + '\nreturn _solEtapaHeal;')();
    const mk = () => [
      { id: 's1', numero: 'VICINIA DEL CARMEN – 66', esSolicitudEtapa: true },
      { id: 'f1', numero: 'VICINIA DEL CARMEN – 113', origenSolicitudEtapaId: 's1' },
      { id: 's2', numero: 'VICINIA DEL CARMEN – 67', esSolicitudEtapa: true },
      { id: 'f2', numero: 'VICINIA DEL CARMEN – 114', observaciones: 'ATIENDE VICINIA DEL CARMEN – 67 — ETAPA 1' },
      { id: 's3', numero: 'VICINIA DEL CARMEN – 68', esSolicitudEtapa: true }
    ];
    const l1 = mk();
    ok('cura por el vínculo directo (origenSolicitudEtapaId)', heal(l1) === true && l1[0].solEtapaAtendida && l1[0].solEtapaAtendida.pedidoId === 'f1' && l1[0]._ts > 0);
    ok('cura por la observación "ATIENDE <numero> — "', l1[2].solEtapaAtendida && l1[2].solEtapaAtendida.pedidoId === 'f2');
    ok('la solicitud sin formal queda VIVA', !l1[4].solEtapaAtendida);
    ok('idempotente (segunda pasada no cambia nada)', heal(l1) === false);
  } catch(e){ ok('self-heal evaluable', false); console.log('  ' + e.message); }
}
ok('renderPedidosList lo corre y guarda si curó', (function(){
  const i = html.indexOf('const _conDevuelta = {};');
  return i > 0 && /_solEtapaHeal\(pedidos\)/.test(html.slice(i - 600, i));
})());

/* ── 3. el ritual del sync ── */
ok('APP_SYNC_VERSION subió a 944', /const APP_SYNC_VERSION = 944/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
