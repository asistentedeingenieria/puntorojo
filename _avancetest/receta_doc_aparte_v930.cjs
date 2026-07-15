/* v930 (aviso ESSENZA 879.5 KB / límite 1 MB — pagos 449.7 KB + recetaV2 154 KB):
   la RECETA de cada proyecto se muda a su propio doc appState/receta_<projId> (patrón
   caras v633 / asistencia v649). Diseño SEGURO: el doc de receta se confirma en la nube
   ANTES de quitar la copia embebida del proj_; si falla (reglas/red) la receta sigue
   viajando embebida y nadie la pierde. Hash canónico del proj_ = proyecto SIN la clave
   recetaV2 en AMBOS lados (subida y applyRemote) para no crear churn de escrituras.
   Cambio de SYNC ⇒ APP_SYNC_VERSION 903 + minSyncVersion (ritual v892). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
function extractMethod(sig){ let m=html.indexOf(sig); if(m<0) return ''; let i=m+sig.length-1,d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; } // arranca en la ÚLTIMA { de la firma (opts = {} rompería el conteo)
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. helper puro _projSinReceta (forma canónica del doc proj_) ──
const srcHelper = extractFn('_projSinReceta');
ok('_projSinReceta existe', !!srcHelper);
if (srcHelper) {
  const fn = new Function('return ' + srcHelper)();
  const p = { id:'x', name:'X', materiales:{ recetaV2:{version:3}, precios:{a:1} }, towers:[] };
  const s = fn(p);
  ok('quita recetaV2', !!s.materiales && !('recetaV2' in s.materiales));
  ok('conserva el resto', s.materiales.precios && s.materiales.precios.a===1 && s.id==='x');
  ok('NO muta el original', !!p.materiales.recetaV2);
  ok('recetaV2:null también se quita (la CLAVE sale del doc)', !('recetaV2' in fn({id:'y',materiales:{recetaV2:null}}).materiales));
  const noKey = { id:'z', materiales:{ precios:{} } };
  ok('sin la clave devuelve el mismo objeto', fn(noKey) === noKey);
}

// ── 2. subida: doc receta_<id> confirmado ANTES del strip; fallo = sigue embebida ──
const up = extractMethod('async uploadCurrent(){');
ok('uploadCurrent escribe appState/receta_<id>', up.indexOf("doc('receta_' + _rp.id).set({ recetaV2:") > -1);
ok('hash-skip propio (_recetaHashes)', /_recetaHashes/.test(up));
ok('fallo de escritura ⇒ la receta viaja embebida esta vez', /viaja embebida/.test(up));
const iSet = up.indexOf("doc('receta_' + _rp.id).set"), iStrip = up.indexOf('_projSinReceta(_rp)');
ok('orden seguro: set del doc ANTES del strip del proj_', iSet > -1 && iStrip > iSet);
const iHashLoop = up.indexOf('const json = JSON.stringify(p);');
ok('strip ANTES del hash del proyecto', iStrip > -1 && iHashLoop > iStrip);
ok('docs de receta huérfanos se borran al eliminar el proyecto', up.indexOf("doc('receta_' + id).delete()") > -1);

// ── 3. bajada: _assembleFromSnap reconoce y re-adjunta ──
const asm = extractMethod('_assembleFromSnap(snap){');
ok("reconoce doc.id 'receta_*'", asm.indexOf("doc.id.indexOf('receta_') === 0") > -1);
ok('expone _recetaDocOnly y _recetaEmbebidaIds', /_recetaDocOnly/.test(asm) && /_recetaEmbebidaIds/.test(asm));
if (asm) {
  // v931/v933 agregaron _pagoCongelado/_pagoCongCtx dentro de _assembleFromSnap — el arnés los inyecta (lección v916)
  const fn = new Function('_pagoCongelado', '_pagoCongCtx', 'return function ' + asm)(pg => !!(pg && pg._preApp === true), () => ({ cerradas: {}, corte: 0 }));
  const mkSnap = docs => ({ forEach(cb){ docs.forEach(d => cb({ id:d.id, data:()=>d.data })); } });
  const core = { id:'core', data:{ _projectIds:['e','v'], personalGlobal:[] } };
  // e: proj_ con receta EMBEBIDA y ADEMÁS doc receta_ (el doc manda) · v: solo embebida (sin migrar)
  const out = fn(mkSnap([ core,
    { id:'proj_e', data:{ p:{ id:'e', materiales:{ recetaV2:{version:3, tag:'EMBEBIDA'} } } } },
    { id:'receta_e', data:{ recetaV2:{version:3, tag:'DOC'} } },
    { id:'proj_v', data:{ p:{ id:'v', materiales:{ recetaV2:{version:3, tag:'V-EMB'} } } } },
  ]));
  const pe = out.projects.find(p=>p.id==='e'), pv = out.projects.find(p=>p.id==='v');
  ok('el doc MANDA sobre la copia embebida', pe && pe.materiales.recetaV2.tag==='DOC');
  ok('sin doc, la embebida se conserva (transición)', pv && pv.materiales.recetaV2.tag==='V-EMB');
  ok('_recetaDocOnly trae SOLO lo que vino de docs', out._recetaDocOnly && out._recetaDocOnly.e && out._recetaDocOnly.e.tag==='DOC' && !out._recetaDocOnly.v);
  ok('_recetaEmbebidaIds marca los proj_ aún gordos', Array.isArray(out._recetaEmbebidaIds) && out._recetaEmbebidaIds.indexOf('e')>-1 && out._recetaEmbebidaIds.indexOf('v')>-1);
}

// ── 4. applyRemote: siembra + hash canónico + migración forzada ──
const ap = extractMethod('applyRemote(remoteData, opts = {}){');
ok('siembra _recetaHashes con lo BAJADO DE LOS DOCS', /_recetaDocOnly/.test(ap) && /this\._recetaHashes = /.test(ap));
ok('hash de proyectos usa _projSinReceta (canónico, sin churn; v931 compone encima)', ap.indexOf('_projSinReceta(pp)') > -1 && /_nh\[pp\.id\] = JSON\.stringify\(.*_projSinReceta\(pp\)\)/.test(ap));
ok('proj_ sin migrar quedan FUERA del hash-skip', /\(merged\._recetaEmbebidaIds \|\| \[\]\)\.forEach/.test(ap));
ok('llaves transitorias no llegan al cache', /delete merged\._recetaDocOnly/.test(ap) && /delete merged\._recetaEmbebidaIds/.test(ap));

// ── 5. ritual de sync ──
const _asv = (html.match(/const APP_SYNC_VERSION = (\d+)/) || [])[1];
ok('APP_SYNC_VERSION >= 903 (v930 subió a 903; versiones posteriores no rompen este test)', Number(_asv) >= 903);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
