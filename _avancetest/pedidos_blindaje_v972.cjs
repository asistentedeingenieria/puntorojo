/* v972 INCIDENTE 24-jul (pedidos de VLA desaparecidos — quedó solo el 00001): los
   PEDIDOS y ÓRDENES de proyecto eran LWW puro ("el último que sube gana") — el ÚLTIMO
   dato operativo sin blindaje. Un teléfono con copia vieja pisó los pedidos nuevos.
   Fix (mismo patrón v891 de planillas):
   - applyRemote: union-merge por id + _ts de p.materiales.pedidos y p.materiales.ordenes
     POR PROYECTO, con tombstones pedidosEliminados/ordenesEliminadas.
   - Toda mutación sella _ts (advancePedido, generarOrdenCompra sobre el pd, autorizarOrden
     ya sellaba, recibido ya sellaba) y todo borrado escribe tombstone.
   - APP_SYNC_VERSION 912 (cambio de sync ⇒ minSyncVersion). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFrom(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. el merge en applyRemote, POR PROYECTO ──
const iApply = html.indexOf('applyRemote(remoteData');
const zApply = html.slice(iApply, iApply + 40000);
const iBlq = zApply.indexOf('v972');
ok('bloque v972 en applyRemote', iBlq > -1);
const zB = zApply.slice(iBlq, iBlq + 2600);
ok('mergea pedidos por proyecto', /_mergeById\([^)]*\.pedidos/.test(zB.replace(/\n/g, ' ')));
ok('mergea ordenes por proyecto', /_mergeById\([^)]*\.ordenes/.test(zB.replace(/\n/g, ' ')));
ok('tombstones de ambos', /pedidosEliminados/.test(zB) && /ordenesEliminadas/.test(zB));
ok('needsResync cuando el local aporta', (zB.match(/needsResync = true/g) || []).length >= 2);
ok('recorre merged.projects contra el proyecto LOCAL por id', /merged\.projects/.test(zB) && /_locProj|state\.projects/.test(zB));

// ── 2. sellos _ts en las mutaciones ──
const zAdv = extractFrom('async function advancePedido(');
ok('advancePedido sella pd._ts al transicionar', (zAdv.match(/pd\._ts = Date\.now\(\)/g) || []).length >= 1);
const zGen = extractFrom('async function generarOrdenCompra(');
ok('generarOrdenCompra sella pd._ts (status APROBADO/fecha)', (zGen.match(/pd\._ts = Date\.now\(\)/g) || []).length >= 2);
ok('las OCs de proyecto nacen selladas', /oc\._ts = oc\.ts/.test(zGen) && !/if \(_ctx\.esBodega\) oc\._ts/.test(zGen));
const zSub = extractFrom('function submitPedido(') || extractFrom('async function submitPedido(');
ok('submitPedido nace sellado', /_ts/.test(zSub));

// ── 3. borrados con tombstone (antes solo filtraban) ──
const zDelP = extractFrom('function _doDeletePedido(');
ok('_doDeletePedido escribe tombstone TAMBIÉN en proyecto', /pedidosEliminados\[id\] = Date\.now\(\)/.test(zDelP) && (zDelP.match(/pedidosEliminados/g) || []).length >= 2);
const zDelO = extractFrom('function _doDeleteOrden(');
ok('_doDeleteOrden escribe tombstone TAMBIÉN en proyecto', (zDelO.match(/ordenesEliminadas/g) || []).length >= 2);

// ── 4. versión de sync subida ──
const mVer = html.match(/const APP_SYNC_VERSION = (\d+)/);
ok('APP_SYNC_VERSION >= 912', !!mVer && Number(mVer[1]) >= 912);

// ── 5. merge idempotente de verdad: correr el bloque dos veces no cambia el resultado ──
const memSrc = extractFrom('function _mergeById(');
let mFn = null;
try { mFn = new Function('return (' + memSrc + ')')(); } catch(e){}
if (typeof mFn === 'function') {
  const loc = [{ id: 'a', ts: 1 }, { id: 'b', ts: 5 }];
  const rem = [{ id: 'a', ts: 1 }];
  const r1 = mFn(loc, rem, null);
  const r2 = mFn(r1.list, r1.list, null);
  ok('union preserva el local-only (el pedido de Rony)', r1.list.length === 2);
  ok('re-aplicar no cambia nada (regla v856)', r2.list.length === 2 && r2.changed === false);
} else { ok('_mergeById evaluable', false); }

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
