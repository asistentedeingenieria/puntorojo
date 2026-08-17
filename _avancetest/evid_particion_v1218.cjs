/* v1218 — PARTICIÓN DE EVIDENCIA (fotos + acuses de avance) · APP_SYNC 939→940.

   El techo real de una obra son las FOTOS (auditoría 13 agentes, 11-ago): VDC 100%%
   documentada ≈ 2.8 MB contra 1 MB por documento. La evidencia se muda a UN DOC POR NIVEL
   (evid_<obra>__<nivel>, ~65 KB aun con el nivel completo) en la MISMA colección appState:
   el onSnapshot único los trae solos, _assembleFromSnap los re-adjunta con los mergers del
   blindaje v897 y NINGÚN lector cambia (en memoria la app siempre ve todo).

   LAS DOS TRAMPAS (que las 4 particiones anteriores no tenían):
   1. Los hashes se siembran SOLO desde _evidDocOnly (lo bajado de los docs) — NUNCA del
      árbol mergeado: una foto rescatada por _mergeFotosApto igualaría el hash, no se
      subiría nunca y moriría al recargar (v897 silencioso).
   2. El fallback NUNCA re-embebe si el proyecto está al borde del techo — re-embeber 2.8 MB
      tumba el batch COMPLETO de todos los proyectos. El doc viejo queda y se reintenta. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const APTO = () => ({ id:'a1', name:'6D', stages:{0:true}, stagesTs:{0:111},
  photos:{ '0':['u1','u2'] }, photoTs:{ '0':[1,2] }, photoHashes:{ '0':['h1','h2'] }, photoPHashes:{ '0':['p1','p2'] },
  fotosEliminadas:{ 'uX': 99 }, acuseRecepciones:{ '0': { urls:['a1u'], ts: 5, receptorNombre:'R' } } });

console.log('— 1. las puras: strip, payload y detección —');
const zK = /var _EVID_KEYS = \['photos','photoTs','photoHashes','photoPHashes','fotosEliminadas','acuseRecepcion','acuseRecepciones'\]/.test(code);
ok('_EVID_KEYS es la lista única de claves de evidencia', zK);
const zS = ex(code, 'function _projSinEvidencia(');
const zN = ex(code, 'function _evidDeNivel(');
const zA2 = ex(code, 'function _aptoTieneEvidencia(');
ok('existen las tres', !!zS && !!zN && !!zA2);
try {
  const KEYS = ['photos','photoTs','photoHashes','photoPHashes','fotosEliminadas','acuseRecepcion','acuseRecepciones'];
  const mk = src => new Function('_EVID_KEYS', '_aptoTieneEvidencia', '_evidDeApto', 'return (' + src + ')');
  const fTiene = new Function('_EVID_KEYS', 'return (' + zA2 + ')')(KEYS);
  const zDA = ex(code, 'function _evidDeApto(');
  const fDeApto = new Function('_EVID_KEYS', 'return (' + zDA + ')')(KEYS);
  const fNivel = mk(zN)(KEYS, fTiene, fDeApto);
  const fStrip = mk(zS)(KEYS, fTiene, fDeApto);

  const p0 = { id:'vdc', towers:[{ id:'t1', levels:[{ id:'l1', aptos:[APTO(), { id:'a2', stages:{} }] }] }] };
  const s0 = fStrip(p0);
  ok('el strip quita las 7 claves y conserva stages/stagesTs',
    !s0.towers[0].levels[0].aptos[0].photos && !s0.towers[0].levels[0].aptos[0].acuseRecepciones
    && s0.towers[0].levels[0].aptos[0].stages && s0.towers[0].levels[0].aptos[0].stagesTs);
  ok('el strip es PURO (no muta el proyecto recibido)', !!p0.towers[0].levels[0].aptos[0].photos);
  const p1 = { id:'x', towers:[{ id:'t', levels:[{ id:'l', aptos:[{ id:'a', stages:{} }] }] }] };
  ok('sin evidencia devuelve el MISMO objeto (hash-skip barato)', fStrip(p1) === p1);
  const ev = fNivel(p0.towers[0].levels[0]);
  ok('el payload del nivel trae SOLO los aptos con evidencia', !!ev && !!ev.aptos.a1 && !ev.aptos.a2);
  ok('nivel sin evidencia da null (no nace doc vacío)', fNivel({ id:'l', aptos:[{ id:'a' }] }) === null);

  console.log('\n— 2. el viaje redondo: strip → doc → re-adjunte por merger = mismas fotos —');
  const zM = ex(code, 'function _mergeFotosApto(');
  const fM = new Function('return (' + zM + ')')();
  const hot = { id:'a1' };                                   // proj_ ya adelgazado (sin evidencia)
  const doc = JSON.parse(JSON.stringify(ev.aptos.a1));        // lo que bajó del doc evid_
  fM(hot, doc);                                               // unión hot ∪ doc (hot vacío)
  ok('las fotos del doc quedan íntegras tras el merger', JSON.stringify(doc.photos) === JSON.stringify(APTO().photos)
    && JSON.stringify(doc.photoTs) === JSON.stringify(APTO().photoTs));
  const hot2 = { id:'a1', photos:{ '0':['u3'] }, photoTs:{ '0':[9] }, photoHashes:{ '0':['h3'] }, photoPHashes:{ '0':['p3'] } };
  const doc2 = JSON.parse(JSON.stringify(ev.aptos.a1));
  fM(hot2, doc2);
  ok('una foto embebida en el proj_ viejo (migración) se RESCATA en la unión',
    doc2.photos['0'].indexOf('u3') >= 0 && doc2.photos['0'].indexOf('u1') >= 0);
} catch(e){ ok('las puras evalúan', false); console.log('  ' + e.message); }

console.log('\n— 3. SUBIDA: doc por nivel, confirmar-antes-de-adelgazar, trampa 2 —');
ok('escribe evid_<obra>__<nivel> con hash-skip propio',
  /doc\('evid_' \+ _vk\)\.set\(\{ ev: _ev, _lastUpdate: stamp \}\); this\._evidHashes\[_vk\] = _vjson;/.test(code));
ok('solo adelgaza el proj_ si TODOS sus niveles confirmaron',
  /if \(!_falloNivel\) \{ projects\[_vi\] = _projSinEvidencia\(_vp\); continue; \}/.test(code));
ok('TRAMPA 2: al borde del techo NO se re-embebe (el doc viejo queda y se reintenta)',
  /NO se re-embebe/.test(html) && /if \(JSON\.stringify\(_vp\)\.length > 900000\) \{[\s\S]{0,300}projects\[_vi\] = _projSinEvidencia\(_vp\);/.test(code));
ok('el nivel que se queda sin evidencia borra su doc', /doc\('evid_' \+ _vk\)\.delete\(\); delete this\._evidHashes\[_vk\];/.test(code));
ok('los docs de proyectos eliminados se limpian', /doc\('evid_' \+ k\)\.delete\(\)/.test(code));

console.log('\n— 4. BAJADA: clasificación, re-adjunte con mergers, las DOS piezas —');
ok('el snap clasifica evid_', /doc\.id\.indexOf\('evid_'\) === 0/.test(code));
ok('re-adjunta usando LOS MISMOS mergers del blindaje v897',
  /_mergeFotosApto\(a, _doc\)/.test(code) && /_mergeAcusesApto\(a, _doc, \(p\.acusesEliminados \|\| \{\}\), a\.id\)/.test(code));
ok('deja las DOS piezas del patrón v1168', /data\._evidDocOnly = evidByKey;/.test(code) && /data\._evidEmbebidaIds = _evEmbIds;/.test(code));

console.log('\n— 5. TRAMPA 1: los hashes SIEMPRE desde lo bajado, nunca del árbol mergeado —');
ok('applyRemote siembra _evidHashes desde _evidDocOnly',
  /const _vdo = merged\._evidDocOnly \|\| \{\};[\s\S]{0,200}this\._evidHashes = _vh;/.test(code) && /delete merged\._evidDocOnly/.test(code));
ok('el flush del snapshot también (patrón v1202, sobrevive al pendingWrite-skip)',
  /d\._evidDocOnly[\s\S]{0,260}this\._evidHashes/.test(ex(code, 'this._snapCoalesce = setTimeout(')));
ok('la forma canónica del proj_ incluye el strip de evidencia (v1168: LAS DOS PUNTAS IGUALES)',
  /_projSinEvidencia\(_projSinGastosImp\(_projSinPagosCongelados\(_projSinReceta\(pp\)\)\)\)/.test(code));
ok('los proj_ con evidencia embebida quedan fuera del hash-skip (migración automática)',
  /\(merged\._evidEmbebidaIds \|\| \[\]\)\.forEach\(id => \{ delete _nh\[id\]; \}\)/.test(code) && /delete merged\._evidEmbebidaIds/.test(code));

console.log('\n— 6. el candado —');
ok('APP_SYNC_VERSION subió a 940', /const APP_SYNC_VERSION = 940;/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
