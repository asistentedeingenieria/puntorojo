/* v931 (forense 14-jul: ESSENZA = 790 pagos/450KB, de los cuales 610 son marcadores
   PRE-APP de mayo — "pagado antes de usar la app", monto 0, autorizado, INMUTABLES = 297KB):
   los pagos CONGELADOS se mudan a su propio doc appState/pagosarch_<projId> (patrón
   receta v930). En memoria la app SIEMPRE ve todos los pagos (caliente ∪ congelado,
   re-unidos al ensamblar) — NINGÚN lector cambia (candado, anti-doble-pago, cuadritos,
   KPIs). Orden SEGURO: doc confirmado ANTES del strip; fallo = viajan embebidos.
   Anti-resurrección: caliente MANDA en duplicados por id + tombstones pagosEliminados
   también filtran lo congelado. Cambio de SYNC ⇒ APP_SYNC_VERSION 904 + minSyncVersion. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
function extractMethod(sig){ let m=html.indexOf(sig); if(m<0) return ''; let i=m+sig.length-1,d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. criterio de congelado en UN solo lugar ──
const srcPred = extractFn('_pagoCongelado');
ok('_pagoCongelado existe', !!srcPred);
let pred = null;
if (srcPred) {
  pred = new Function('return ' + srcPred)();
  ok('PRE-APP congela', pred({ _preApp:true, bruto:0 }) === true);
  ok('pago real NO congela', pred({ id:'plp-x', bruto:647.52, planillaId:'pln-1' }) === false);
  ok('null no truena', pred(null) === false);
}

// ── 2. helper puro _projSinPagosCongelados (forma canónica del proj_) ──
const srcHelper = extractFn('_projSinPagosCongelados');
ok('_projSinPagosCongelados existe', !!srcHelper);
const srcCtx = extractFn('_pagoCongCtx'); // v933: el helper ahora construye contexto (y usa la constante de días)
const mkCtx = srcCtx ? new Function('_PAGOS_CONG_DIAS', 'return ' + srcCtx)(60) : (() => ({ cerradas: {}, corte: 0 }));
if (srcHelper && srcPred) {
  const fn = new Function('_pagoCongelado', '_pagoCongCtx', 'return ' + srcHelper)(pred, mkCtx);
  const p = { id:'e', planilla:{ pagos:[ {id:'r1',bruto:10}, {id:'p1',_preApp:true} ], pagosEliminados:{}, planillasArmadas:[1] }, towers:[] };
  const s = fn(p);
  ok('filtra los congelados', s.planilla.pagos.length===1 && s.planilla.pagos[0].id==='r1');
  ok('conserva el resto de planilla', Array.isArray(s.planilla.planillasArmadas) && s.id==='e');
  ok('NO muta el original', p.planilla.pagos.length===2);
  const noFrozen = { id:'z', planilla:{ pagos:[{id:'r1'}] } };
  ok('sin congelados devuelve el mismo objeto', fn(noFrozen) === noFrozen);
}

// ── 3. subida: doc pagosarch_<id> confirmado ANTES del strip; fallo = siguen embebidos ──
const up = extractMethod('async uploadCurrent(){');
ok('uploadCurrent escribe appState/pagosarch_<id>', up.indexOf("doc('pagosarch_' + _gp.id).set({ pagos:") > -1);
ok('hash-skip propio (_pagosArchHashes)', /_pagosArchHashes/.test(up));
ok('fallo de escritura ⇒ viajan embebidos esta vez', /viajan embebidos/.test(up));
const iSet = up.indexOf("doc('pagosarch_' + _gp.id).set"), iStrip = up.indexOf('_projSinPagosCongelados(_gp'); // v933 le agregó el ctx compartido
ok('orden seguro: set del doc ANTES del strip del proj_', iSet > -1 && iStrip > iSet);
const iHashLoop = up.indexOf('const json = JSON.stringify(p);');
ok('strip ANTES del hash del proyecto', iStrip > -1 && iHashLoop > iStrip);
ok('docs congelados huérfanos se borran al eliminar el proyecto', up.indexOf("doc('pagosarch_' + id).delete()") > -1);

// ── 4. bajada: _assembleFromSnap re-une caliente ∪ congelado ──
const asm = extractMethod('_assembleFromSnap(snap){');
ok("reconoce doc.id 'pagosarch_*'", asm.indexOf("doc.id.indexOf('pagosarch_') === 0") > -1);
ok('expone _pagosArchDocOnly y _pagosArchEmbebidaIds', /_pagosArchDocOnly/.test(asm) && /_pagosArchEmbebidaIds/.test(asm));
if (asm && pred) {
  const fn = new Function('_pagoCongelado', '_pagoCongCtx', 'return function ' + asm)(pred, mkCtx);
  const mkSnap = docs => ({ forEach(cb){ docs.forEach(d => cb({ id:d.id, data:()=>d.data })); } });
  const core = { id:'core', data:{ _projectIds:['e','v'], personalGlobal:[] } };
  const out = fn(mkSnap([ core,
    // e: caliente trae 1 real + 1 congelado EMBEBIDO (id p1) · el doc arch trae p1 (dup), p2 (nuevo) y p3 (tombstoneado)
    { id:'proj_e', data:{ p:{ id:'e', planilla:{ pagos:[ {id:'r1',bruto:10}, {id:'p1',_preApp:true,tag:'EMB'} ], pagosEliminados:{ p3: 123 } } } } },
    { id:'pagosarch_e', data:{ pagos:[ {id:'p1',_preApp:true,tag:'DOC'}, {id:'p2',_preApp:true}, {id:'p3',_preApp:true} ] } },
    // v: caliente limpio (ya migrado), doc arch con p9
    { id:'proj_v', data:{ p:{ id:'v', planilla:{ pagos:[ {id:'r2',bruto:5} ] } } } },
    { id:'pagosarch_v', data:{ pagos:[ {id:'p9',_preApp:true} ] } },
  ]));
  const pe = out.projects.find(p=>p.id==='e'), pv = out.projects.find(p=>p.id==='v');
  const ids = pe ? pe.planilla.pagos.map(x=>x.id) : [];
  ok('re-une caliente ∪ congelado', ids.indexOf('r1')>-1 && ids.indexOf('p2')>-1);
  ok('el CALIENTE manda en duplicados por id', pe && pe.planilla.pagos.find(x=>x.id==='p1').tag==='EMB');
  ok('el tombstone también filtra lo congelado (no resucita)', ids.indexOf('p3')===-1);
  ok('proyecto migrado queda completo', pv && pv.planilla.pagos.map(x=>x.id).join(',')==='r2,p9');
  ok('_pagosArchEmbebidaIds marca SOLO los proj_ aún gordos', out._pagosArchEmbebidaIds.indexOf('e')>-1 && out._pagosArchEmbebidaIds.indexOf('v')===-1);
  ok('_pagosArchDocOnly trae lo que vino de docs', out._pagosArchDocOnly && Array.isArray(out._pagosArchDocOnly.e) && out._pagosArchDocOnly.e.length===3);
}

// ── 5. applyRemote: siembra + hash canónico + migración forzada ──
const ap = extractMethod('applyRemote(remoteData, opts = {}){');
ok('siembra _pagosArchHashes con lo BAJADO DE LOS DOCS', /_pagosArchDocOnly/.test(ap) && /this\._pagosArchHashes = /.test(ap));
/* v1168: esta aserción tenía CONGELADA la composición exacta de v931, así que al sumar la
   tercera partición (gastos importados) se puso roja sin que nada estuviera mal. Peor: si
   alguien la "arreglaba" pegando la nueva forma literal, volvería a romperse en la cuarta.
   Ahora verifica la PROPIEDAD que de verdad importa —el hash descuenta TODO lo que viaja en
   doc aparte, igual que uploadCurrent— y no el texto.
   ⚠️ TODA partición nueva (un doc propio para algún dato del proyecto) DEBE sumarse acá: si
   una punta hashea con el dato y la otra sin él, el proj_ se reescribe entero para siempre y
   satura la cola de escrituras. Eso fue el incidente del 11-ago (v1166 → v1168). */
const _hashLinea = (ap.match(/_nh\[pp\.id\] = JSON\.stringify\(([\s\S]*?)\);/) || ['',''])[1];
ok('hash canónico: descuenta la receta (v930)', /_projSinReceta\(\s*pp\s*\)/.test(_hashLinea));
ok('hash canónico: descuenta los pagos congelados (v931)', /_projSinPagosCongelados\(/.test(_hashLinea));
ok('hash canónico: descuenta los gastos importados (v1166/v1168)', /_projSinGastosImp\(/.test(_hashLinea));
ok('proj_ sin migrar quedan FUERA del hash-skip', /\(merged\._pagosArchEmbebidaIds \|\| \[\]\)\.forEach/.test(ap));
ok('llaves transitorias no llegan al cache', /delete merged\._pagosArchDocOnly/.test(ap) && /delete merged\._pagosArchEmbebidaIds/.test(ap));

// ── 6. ritual de sync ──
const _asv = (html.match(/const APP_SYNC_VERSION = (\d+)/) || [])[1];
ok('APP_SYNC_VERSION >= 904 (v931 subió a 904; versiones posteriores no rompen este test)', Number(_asv) >= 904);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
