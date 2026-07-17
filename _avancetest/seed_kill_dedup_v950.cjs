/* v950 INCIDENTE 17-jul (reporte de Antonio con prints): descuentos DUPLICADOS y
   TRIPLICADOS en las planillas de TODOS los proyectos (mismo anticipo 2-3 veces,
   pólizas "17 ACTIVAS" infladas). CAUSA RAÍZ (verificada con el print de consola):
   los SEEDS del PDF (v354 pólizas / v355 anticipos) viven en ensureDataV9 gateados
   por una marca DENTRO del state (_anticiposPDFSeedLoadedV355). Un dispositivo que
   arranca con state local vacío (caché fallida / sesión nueva) no tiene la marca ni
   el catálogo => re-siembra TODO con ids nuevos (ant-pdf-v355-<ts>-i), y el
   union-merge v752 (por id) conserva las copias y las propaga a la flota. Pasó 2
   veces el 17-jul (lotes 1784226328831 y 1784232913066). Además REVIVIÓ anticipos
   borrados (tombstones son por id; el seed nace con id nuevo).
   FIX: (1) los auto-seeds se ELIMINAN (cumplieron en mayo; el catálogo vive en la
   nube); (2) self-heal _dedupCatalogoSeeds en applyRemote: colapsa por CONTENIDO
   las entradas nacidas del seed conservando el LOTE MÁS VIEJO y tombstonea las
   demás (mueren en toda la flota); (3) APP_SYNC_VERSION 908 para bloquear clientes
   viejos que aún re-siembran. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. los auto-seeds están MUERTOS ──
ok('el auto-seed de anticipos ya no existe', !/anticiposGlobales\.push\(\{ id:'ant-pdf-v355-' \+ Date\.now\(\)/.test(html));
ok('el auto-seed de pólizas ya no existe', !/polizasGlobales\.push\(\{\s*\n?\s*id: 'pol-pdf-v354-' \+ Date\.now\(\)/.test(html) && !/id: 'pol-pdf-v354-' \+ Date\.now\(\)/.test(html));
ok('el SEED de pólizas sigue expuesto para RESTAURAR DEL PDF (v381)', /window\.POLIZAS_PDF_SEED_V354 = SEED/.test(html));
ok('el verificador v383 conserva su copia', /window\.ANTICIPOS_PDF_VERIFY_V383 = \[/.test(html));

// ── 2. _dedupCatalogoSeeds: pura, colapsa por contenido, tombstonea, idempotente ──
const src = extractFn('_dedupCatalogoSeeds');
ok('_dedupCatalogoSeeds existe', !!src);
let fn = null;
try { fn = new Function('return (' + src + ')')(); } catch(e){}
ok('_dedupCatalogoSeeds evaluable', typeof fn === 'function');
if (typeof fn === 'function') {
  const keyAnt = a => [String(a.colaboradorNombre||'').trim().toUpperCase(), String(a.fecha||'').slice(0,10), Number(a.montoTotal||0).toFixed(2), String(a.desc||'').trim().toUpperCase()].join('|');
  const mk = (batch, i, extra) => Object.assign({ id:'ant-pdf-v355-'+batch+'-'+i, colaboradorNombre:'LUIS BARAN', fecha:'2026-01-13', montoTotal:320, desc:'Bota Country' }, extra||{});
  // triplicado del mismo contenido en 3 lotes -> queda el lote MÁS VIEJO
  let tomb = {};
  let r = fn([ mk(1784226328831,0), mk(1779561730034,0), mk(1784232913066,0) ], tomb, 'ant-pdf-v355-', keyAnt);
  ok('colapsa 3 lotes a 1', r.list.length === 1 && r.removed.length === 2);
  ok('conserva el lote más viejo (mayo)', r.list[0].id === 'ant-pdf-v355-1779561730034-0');
  ok('tombstonea los eliminados', !!tomb['ant-pdf-v355-1784226328831-0'] && !!tomb['ant-pdf-v355-1784232913066-0']);
  // idempotente
  const r2 = fn(r.list.slice(), {}, 'ant-pdf-v355-', keyAnt);
  ok('idempotente: segunda pasada no cambia nada', r2.removed.length === 0 && r2.list.length === 1);
  // entradas manuales (id sin prefijo) intactas aunque el contenido coincida
  const manual = { id:'ant-manual-1', colaboradorNombre:'LUIS BARAN', fecha:'2026-01-13', montoTotal:320, desc:'Bota Country' };
  const r3 = fn([ manual, mk(1779561730034,0), mk(1784226328831,0) ], {}, 'ant-pdf-v355-', keyAnt);
  ok('las entradas manuales no se tocan', r3.list.some(x=>x.id==='ant-manual-1') && r3.list.length === 2 && r3.removed.length === 1);
  // contenidos distintos del seed no se colapsan entre sí
  const r4 = fn([ mk(1779561730034,0), mk(1779561730034,1,{desc:'Escalera'}) ], {}, 'ant-pdf-v355-', keyAnt);
  ok('contenidos distintos sobreviven', r4.list.length === 2 && r4.removed.length === 0);
  ok('lista null no truena', fn(null, {}, 'ant-pdf-v355-', keyAnt).list.length === 0);
}

// ── 3. cableado en applyRemote tras el union-merge del catálogo ──
const iMerge = html.indexOf('merged.anticiposGlobales = _mAnt.list');
const post = iMerge > -1 ? html.slice(iMerge, iMerge + 2500) : '';
ok('applyRemote llama al self-heal para pólizas y anticipos', /_dedupCatalogoSeeds\([^)]*polizasGlobales/.test(post) && /_dedupCatalogoSeeds\([^)]*anticiposGlobales/.test(post));
ok('el self-heal marca needsResync al limpiar', /removed\.length[\s\S]{0,200}needsResync = true/.test(post));

// ── 4. kill-switch para clientes viejos ──
ok('APP_SYNC_VERSION subió a >= 908', (Number((html.match(/const APP_SYNC_VERSION = (\d+)/) || [])[1]) || 0) >= 908);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
