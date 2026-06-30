/* v863: DESBLOQUEO TEMPORAL de etapas para tomar fotos en cualquier orden.
   El user pidió poder tomar fotos en TODAS las etapas del avance físico sin el candado
   secuencial ("por el momento"). _fotosEtapasLibres() es el interruptor: default ON, se apaga
   poniendo window._PR_ETAPAS_LIBRES = false (per-dispositivo) o revirtiendo las 2 líneas v863.
   NO toca las reglas de MARCAR una etapa como completa, solo la TOMA de fotos. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── funcional: el interruptor ──
const src = extractFn('_fotosEtapasLibres');
ok('_fotosEtapasLibres existe', !!src);
if (src) {
  // default: sin window → libre (true)
  const fn = new Function(src + '\nreturn _fotosEtapasLibres;')();
  ok('por defecto está LIBRE (true)', fn() === true);
  // kill-flag explícito = false → bloquea
  const fnOff = new Function('var window={_PR_ETAPAS_LIBRES:false};' + src + '\nreturn _fotosEtapasLibres;')();
  ok('window._PR_ETAPAS_LIBRES=false → bloqueado (false)', fnOff() === false);
  // flag true → libre
  const fnOn = new Function('var window={_PR_ETAPAS_LIBRES:true};' + src + '\nreturn _fotosEtapasLibres;')();
  ok('window._PR_ETAPAS_LIBRES=true → libre (true)', fnOn() === true);
  // flag ausente (objeto window vacío) → libre por defecto
  const fnUndef = new Function('var window={};' + src + '\nreturn _fotosEtapasLibres;')();
  ok('flag ausente → libre por defecto (true)', fnUndef() === true);
}

// ── estructural: los DOS candados de fotos respetan el desbloqueo ──
ok('render fuerza prevDone cuando está libre', html.indexOf('if (_fotosEtapasLibres()) prevDone = true;') >= 0);
ok('tomarFotoAvance respeta el desbloqueo', html.indexOf('!_prevDone && !_fotosEtapasLibres()') >= 0);

// ── seguridad de alcance: NO se tocó el guard de 2 fotos para tomarFotoAvance (sigue existiendo
//    la verificación; solo se condiciona al candado secuencial, no se elimina) ──
ok('el guard secuencial sigue presente (no borrado)', html.indexOf('PRIMERO TERMINAR LAS ETAPAS PREVIAS') >= 0);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
