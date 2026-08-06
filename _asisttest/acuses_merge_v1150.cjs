/* v1150 (1/2) — LOS ACUSES FIRMADOS YA NO SE PIERDEN AL SINCRONIZAR

   Hallazgo de la auditoría del 4-ago, CONFIRMADO vigente el 6-ago con verificación
   adversarial: a.acuseRecepciones vive dentro del árbol de torres, que viaja LWW PURO
   (applyRemote: merged = clon del remoto entero → state = merged). Los blindajes por apto
   (_mergeFotosApto v897, _mergeEtapasApto v900) NO tocan los acuses. Escenario real:
   el dispositivo A firma el acuse (QR o portal) → B, con copia vieja del proyecto, sube
   cualquier cambio → la nube pierde el slot ENTERO (foto evidencia + firma del receptor)
   → A recibe el snapshot y lo pierde también. Es EVIDENCIA LEGAL de entrega al cliente.

   Es la MISMA clase de mordida que fotos (v897), facturas (v1039), sello de planilla
   (v1064) y catálogo (v1070) — la SEXTA. El arreglo sigue el patrón v897/v900: unión por
   slot dentro de _mergeFotosProyecto (que ya recorre los pares de aptos), y esta vez CON
   tombstones (acusesEliminados a nivel proyecto) porque el borrado del admin es un acto
   formal que debe propagarse — y una RE-FIRMA posterior al borrado lo revive (ts mayor).

   REGLAS del slot ganador: la FIRMA gana a la foto sola; más fotos gana a menos; empate
   → el sello más nuevo; empate total → el remoto (estabilidad). Cambio de lógica de SYNC
   ⇒ APP_SYNC_VERSION sube a 926 (esta versión). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* ══ 1. _mergeAcusesApto — la unión por slot ══ */
console.log('— la unión por slot —');
const zM = ex(html, 'function _mergeAcusesApto(');
const zT = ex(html, 'function _acuseSlotTs(');
const zS = ex(html, 'function _acuseSlotScore(');
ok('existen las tres piezas', !!zM && !!zT && !!zS);
let merge = null;
try {
  const mk = new Function('return (function(){ ' + zT + '\n' + zS + '\n' + zM + '\nreturn _mergeAcusesApto; })()');
  merge = mk();
} catch(e){}
ok('evalúan juntas', typeof merge === 'function');
if (merge) {
  const firmado = { url:'https://x/f.jpg', urls:['u0','u1'], ts:100, receptorSignatureUrl:'https://x/sig.png', receptorNombre:'ING. SSO', signatureTs:150, type:'digital' };
  const soloFoto = { url:'https://x/f.jpg', ts:120, photoTs:120 };

  /* el caso del hallazgo: A firmó, B trae copia vieja SIN el slot */
  let la = { id:'a1', acuseRecepciones: { '2': JSON.parse(JSON.stringify(firmado)) } };
  let ra = { id:'a1', acuseRecepciones: {} };
  ok('el acuse firmado local SOBREVIVE al snapshot viejo', merge(la, ra, {}, 'a1') === true && !!ra.acuseRecepciones['2'] && ra.acuseRecepciones['2'].receptorSignatureUrl === 'https://x/sig.png');
  ok('segunda pasada idempotente (v856: sin bucle)', merge(la, ra, {}, 'a1') === false);

  /* el remoto trae un slot que lo local no tiene: se queda */
  la = { id:'a1', acuseRecepciones: {} };
  ra = { id:'a1', acuseRecepciones: { '3': JSON.parse(JSON.stringify(soloFoto)) } };
  ok('el slot solo-remoto se queda quieto', merge(la, ra, {}, 'a1') === false && !!ra.acuseRecepciones['3']);

  /* conflicto: la FIRMA gana a la foto sola aunque la foto sea más nueva */
  la = { id:'a1', acuseRecepciones: { '2': JSON.parse(JSON.stringify(firmado)) } };
  ra = { id:'a1', acuseRecepciones: { '2': JSON.parse(JSON.stringify(soloFoto)) } };
  merge(la, ra, {}, 'a1');
  ok('la firma GANA a la foto sola', ra.acuseRecepciones['2'].type === 'digital');

  /* empate de score: gana el sello más nuevo */
  la = { id:'a1', acuseRecepciones: { '1': { url:'x', ts: 200 } } };
  ra = { id:'a1', acuseRecepciones: { '1': { url:'y', ts: 100 } } };
  merge(la, ra, {}, 'a1');
  ok('a igual contenido gana el sello más nuevo', ra.acuseRecepciones['1'].url === 'x');

  /* tombstone: el borrado del admin se propaga y NO revive con copias viejas */
  la = { id:'a1', acuseRecepciones: { '2': JSON.parse(JSON.stringify(firmado)) } };   // copia vieja: aún tiene el slot
  ra = { id:'a1', acuseRecepciones: { '2': JSON.parse(JSON.stringify(firmado)) } };
  ok('el tombstone BORRA el slot en el resultado', merge(la, ra, { 'a1|2': 500 }, 'a1') === true && !ra.acuseRecepciones['2']);
  /* re-firma POSTERIOR al borrado: revive (ts mayor que el tombstone) */
  la = { id:'a1', acuseRecepciones: { '2': Object.assign({}, firmado, { ts: 900, signatureTs: 900 }) } };
  ra = { id:'a1', acuseRecepciones: {} };
  merge(la, ra, { 'a1|2': 500 }, 'a1');
  ok('la RE-FIRMA posterior al borrado revive', !!ra.acuseRecepciones['2'] && ra.acuseRecepciones['2'].ts === 900);

  /* no toca lo que no es suyo */
  la = { id:'a1', photos:{ '1':['p'] }, stages:[true], acuseRecepciones:{} };
  ra = { id:'a1', photos:{}, stages:[false], acuseRecepciones:{} };
  merge(la, ra, {}, 'a1');
  ok('no toca photos ni stages', Object.keys(ra.photos).length === 0 && ra.stages[0] === false);
}

/* ══ 2. el cableado ══ */
console.log('\n— el cableado en el blindaje por apto (patrón v897/v900) —');
const zP = ex(code, 'function _mergeFotosProyecto(');
ok('_mergeFotosProyecto llama la unión de acuses por apto', /_mergeAcusesApto\(/.test(zP));
ok('y une los tombstones del proyecto con el ts MAYOR', /acusesEliminados/.test(zP));

console.log('\n— el borrado del admin deja tombstone y se propaga YA —');
const zD = ex(code, 'async function deleteAcuseRecepcion(');
ok('escribe el tombstone aptoId|slot', /acusesEliminados\[[^\]]*\|/.test(zD) || /acusesEliminados\[a\.id \+ '\|' \+ slotKey\]/.test(zD));
ok('sube de inmediato (documento legal)', /forceUploadNow/.test(zD));

console.log('\n— la firma también sube de inmediato —');
ok('la firma QR hace forceUploadNow tras guardar', /Acuse digital firmado[\s\S]{0,400}forceUploadNow|forceUploadNow[\s\S]{0,600}Acuse digital firmado/.test(code));

console.log('\n— el ritual de sync —');
ok('APP_SYNC_VERSION subió a 926', /APP_SYNC_VERSION = 926/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
