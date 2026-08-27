/* v1297 (Antonio, 27-ago, dos mordidas del generador de OC):
   1. "cuando eliminamos ese que dice 1 SE ELIMINAN AMBOS — eso NO debe pasar NUNCA":
      _ocQuitarItem (v1153) quitaba TODAS las líneas que compartían sourceKey. Pero una
      línea PARTIDA (v1145: 4 de bodega + 1 pendiente) comparte sourceKey a propósito —
      quitar la parte pendiente se llevaba también la de bodega. FIX: se quita SOLO el
      renglón apachado (por identidad de objeto, no por llave); en un material de una
      sola línea el comportamiento es idéntico al de siempre. Guard v1145: si la lista
      cambió durante el modal, avisa y no toca nada.
   2. "en bodega me marca que NO tengo [ESPIGAS] cuando SÍ tengo [ESPIGA POLARIZADA…]":
      _bodegaCandidatosParecidos (v1017) comparaba palabras por IGUALDAD EXACTA —
      ESPIGAS ≠ ESPIGA y no ofrecía nada. FIX: comparación tolerante _rentaTokIgual
      (v1285: igual, o prefijo real ≥4 letras — singular≈plural) — el picker de
      parecidos ahora los ofrece y Antonio elige (nunca automático, v1017/v1198);
      su respuesta queda declarada como equivalencia como siempre. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* ── 1. el ✕ quita SOLO el renglón apachado ── */
const zQ = ex('window._ocQuitarItem = async function');
ok('_ocQuitarItem existe', zQ.length > 500);
ok('quita por IDENTIDAD del renglón, no por sourceKey', /!== item\b/.test(zQ.slice(zQ.indexOf('ocWorkingItems = ocWorkingItems.filter'))) || /indexOf\(item\)/.test(zQ));
ok('ya NO barre todas las líneas de la llave', !/\(it2\.sourceKey \|\| ''\) !== \(item\.sourceKey \|\| ''\)/.test(zQ));
ok('si la lista cambió durante el modal, avisa y no toca nada', /LA LISTA CAMBIÓ/.test(zQ));

/* ── 2. parecidos de bodega con singular≈plural ── */
const zC = ex('function _bodegaCandidatosParecidos(');
ok('usa el comparador tolerante v1285', /_rentaTokIgual/.test(zC));
if (zC.length > 200) {
  try {
    const zTokIgual = ex('function _rentaTokIgual(');
    const f = new Function('window', 'state', '_precioEntradaBodega', zTokIgual + '\n' + zC + '\nreturn _bodegaCandidatosParecidos;');
    const cands = (nombre) => f(
      { _bodegaSaldos: function(){ return { k1: { name: 'ESPIGA POLARIZADA 15A 125V METAL EAGLE', saldo: 2 }, k2: { name: 'CLAVO CON ROLDANA 1"', saldo: 100 } }; } },
      {}, function(){ return 0; }
    )(nombre);
    ok('ESPIGAS encuentra la ESPIGA POLARIZADA con existencia', (function(){ const r = cands('ESPIGAS'); return r.length === 1 && /ESPIGA POLARIZADA/.test(r[0].name); })());
    ok('un nombre sin parentesco no ofrece nada', cands('CEMENTO GRIS').length === 0);
    ok('la palabra exacta sigue matcheando como siempre', (function(){ const r = cands('CLAVO 1"'); return r.length === 1 && /CLAVO/.test(r[0].name); })());
  } catch(e){ ok('parecidos evaluable', false); console.log('  ' + e.message); }
}

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
