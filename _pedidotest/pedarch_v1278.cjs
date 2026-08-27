/* v1278 · FASE 1 DEL ALIGERAMIENTO (Antonio, 24-ago, tras la radiografía: "SINCRONIZANDO
   eterno" = subidas gordas; p.materiales pesa 320 KB en VDC / 113 en ESSENZA y la mitad
   es HISTORIAL): los pedidos CERRADOS (RECIBIDO/CANCELADO/solicitud atendida) con ≥7 días
   de reposo y SIN orden DEVUELTA (v1259: eso es trabajo vivo) se van con SUS órdenes a
   su propio doc appState/pedarch_<obra>. Calca EXACTA del patrón pagosarch_ (v931):
   (1) strip al subir (orden SEGURO: el doc se confirma ANTES de adelgazar el clon),
   (2) re-unión al ensamblar (el caliente MANDA por id; los tombstones filtran),
   (3) hash sobre la MISMA forma canónica en las DOS puntas (_projSinPedArch en el
       upload Y en la siembra del hash-skip de applyRemote — lección v1166-68),
   (4) _pedArchDocOnly siembra los hashes del doc; _pedArchEmbebidaIds saca del hash-skip
       a los proj_ que aún traen archivables (migración automática, sin comandos).
   APP_SYNC 943: un cliente viejo no ve pedarch_ y subiría el proj_ sin los archivados
   (los nuevos los re-unen — no se pierde nada — pero el viejo vería historial/gastos
   incompletos): minSync 943 apenas el dominio sirva v1278. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* ── 1. las funciones PURAS ── */
const src = ex('function _pedArchCtx(') + ';' + ex('function _projSinPedArch(') + ';' + ex('function _pedArchDe(');
let fns = null;
try { fns = new Function('PEDARCH_DIAS', src + '; return { ctx: _pedArchCtx, sin: _projSinPedArch, de: _pedArchDe };')(7); } catch(e){ console.log('  eval:', e.message); }
ok('las tres funciones evalúan', !!fns);

if (fns) {
  const DIA = 86400000, HOY = 1756000000000;
  const p = { id: 'x', materiales: {
    pedidos: [
      { id: 'v', status: 'RECIBIDO', _ts: HOY - 30 * DIA },            // viejo cerrado → ARCHIVA
      { id: 'r', status: 'RECIBIDO', _ts: HOY - 1 * DIA },             // cerrado RECIENTE → caliente
      { id: 's', status: 'SOLICITADO', _ts: HOY - 60 * DIA },          // vivo → caliente
      { id: 'c', status: 'CANCELADO', _ts: HOY - 20 * DIA },           // cancelado viejo → ARCHIVA
      { id: 'd', status: 'RECIBIDO', _ts: HOY - 40 * DIA },            // viejo PERO con orden DEVUELTA → caliente (v1259)
      { id: 'a', status: 'EN COMPRA', solEtapaAtendida: { n: 1 }, _ts: HOY - 15 * DIA } // solicitud atendida vieja → ARCHIVA
    ],
    ordenes: [
      { id: 'o1', pedidoId: 'v', status: 'AUTORIZADA' },   // del archivado → se va con él
      { id: 'o2', pedidoId: 's', status: 'AUTORIZADA' },   // de un vivo → caliente
      { id: 'o3', pedidoId: 'd', status: 'DEVUELTA' },     // la DEVUELTA que revive a d
      { id: 'o4', pedidoId: 'c', status: 'ANULADA' }       // del cancelado → se va con él
    ]
  } };
  const ctx = fns.ctx(p, HOY);
  ok('archiva v, c y a — nada más', !!ctx.peds.v && !!ctx.peds.c && !!ctx.peds.a && !ctx.peds.r && !ctx.peds.s && !ctx.peds.d);
  ok('las órdenes siguen a su pedido (o1 y o4; o2/o3 calientes)', !!ctx.ords.o1 && !!ctx.ords.o4 && !ctx.ords.o2 && !ctx.ords.o3);
  const sin = fns.sin(p, ctx);
  ok('el clon caliente queda sin los archivados', sin.materiales.pedidos.length === 3 && sin.materiales.ordenes.length === 2);
  ok('el original NO se toca (clona el camino)', p.materiales.pedidos.length === 6 && sin !== p);
  const arch = fns.de(p, ctx);
  ok('el archivo lleva exactamente el complemento', arch.pedidos.length === 3 && arch.ordenes.length === 2);
  const p2 = { id: 'y', materiales: { pedidos: [{ id: 'z', status: 'SOLICITADO', _ts: HOY }], ordenes: [] } };
  ok('sin archivables: el clon es el MISMO objeto (no invalida el hash)', fns.sin(p2, fns.ctx(p2, HOY)) === p2);
}

/* ── 2. la subida: doc pedarch_ con orden SEGURO y strip con el MISMO ctx ── */
ok('upload: escribe pedarch_<id> con hash propio', /doc\('pedarch_' \+ _dp\.id\)\.set\(\{ pedidos: _arch\.pedidos, ordenes: _arch\.ordenes/.test(html) && /_pedArchHashes\[_dp\.id\] = _djson/.test(html));
ok('upload: partición y strip comparten UN contexto (regla v933)', /_pedArchCtx\(_dp\)/.test(html) && /_projSinPedArch\(_dp, _dctx\)/.test(html));
ok('upload: si el doc falla, viaja embebido esta vez (continue antes del strip)', /Doc de archivo de pedidos no se subió[\s\S]{0,120}continue/.test(html));
ok('upload: sin archivables borra el doc (no resucita)', /doc\('pedarch_' \+ _dp\.id\)\.delete\(\)/.test(html));

/* ── 3. el ensamblado: re-unión con el caliente MANDANDO y tombstones filtrando ── */
ok('assemble: colecta pedarch_', /indexOf\('pedarch_'\) === 0/.test(html) && /pedArchById\[doc\.id\.slice\(8\)\]/.test(html));
const iRe = html.indexOf('_pedArchDocOnly = pedArchById');
const zRe = html.slice(Math.max(0, iRe - 2600), iRe + 300);
ok('re-unión: el caliente manda por id', /_pIds\[x\.id\]/.test(zRe) && /_oIds\[x\.id\]/.test(zRe));
ok('re-unión: los tombstones filtran (pedidosEliminadas/ordenesEliminadas)', /pedidosEliminados/.test(zRe) && /ordenesEliminadas/.test(zRe));
ok('re-unión: marca los proj_ que aún traen archivables (migración)', /_pedArchEmbebidaIds/.test(zRe));

/* ── 4. applyRemote: siembra de hashes + hash-skip con la MISMA forma canónica ── */
ok('siembra: _pedArchHashes desde _pedArchDocOnly', /_pedArchDocOnly \|\| \{\}/.test(html) && /this\._pedArchHashes = _dh/.test(html));
const iNh = html.indexOf('this._projHashes = _nh');
const zNh = html.slice(Math.max(0, iNh - 900), iNh + 100);
ok('hash-skip: la cadena canónica incluye _projSinPedArch', /_projSinPedArch\(/.test(zNh));
ok('hash-skip: los embebidos quedan fuera (migran en la próxima subida)', /_pedArchEmbebidaIds \|\| \[\]/.test(zNh));

/* ── 5. limpieza al borrar proyecto + candado de versión ── */
ok('proyecto eliminado: su pedarch_ se borra', /doc\('pedarch_' \+ id\)\.delete\(\)/.test(html));
ok('APP_SYNC_VERSION subió al menos a 943', (function(){ const m = html.match(/APP_SYNC_VERSION = (\d+)/); return m && Number(m[1]) >= 943; })()); /* v1296: ancla de piso, no de igualdad — cada subida legítima la rompía */

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
