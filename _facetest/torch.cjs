/* TDD: la linterna del kiosko fallaba en algunos Android porque getCapabilities().torch
   NO anuncia el torch aunque applyConstraints SÍ lo soporta (WebView que no lista la
   capacidad). El fix es ser OPTIMISTA en la cámara trasera: tratar el track como candidato
   a linterna e intentar aplicar el torch igual; solo marcar "no disponible" si el intento
   real falla. Estas dos funciones puras encapsulan esa decisión. */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const mCand = html.match(/function _kioskTorchCandidato\([\s\S]*?\n\}/);
const mBtn  = html.match(/function _kioskLuzBtnState\([\s\S]*?\n\}/);
const mMsg  = html.match(/function _kioskTorchFailMsg\([\s\S]*?\n\}/);
if(!mCand){ console.log('NO _kioskTorchCandidato FOUND'); process.exit(2); }
if(!mBtn){ console.log('NO _kioskLuzBtnState FOUND'); process.exit(2); }
if(!mMsg){ console.log('NO _kioskTorchFailMsg FOUND'); process.exit(2); }
const cand = new Function(mCand[0] + '\nreturn _kioskTorchCandidato;')();
const btn  = new Function(mBtn[0]  + '\nreturn _kioskLuzBtnState;')();
const fmsg = new Function(mMsg[0]  + '\nreturn _kioskTorchFailMsg;')();

let pass=0, fail=0;
const ok=(name,cond)=>cond?pass++:(fail++,console.log('FAIL '+name));
const T={id:'track'};

// _kioskTorchCandidato: optimista en trasera (sin gatear por capabilities); nada en selfie.
ok('trasera con track => candidato (aunque caps no anuncie torch)', cand(T,'environment')===T);
ok('selfie (user) => NO candidato (no hay flash adelante)', cand(T,'user')===null);
ok('sin track en trasera => null', cand(null,'environment')===null);
ok('sin track en selfie => null', cand(null,'user')===null);

// _kioskLuzBtnState(hasTrack, facing, unsupported, on)
ok('trasera + track + off => DISPONIBLE', (s=>s.avail===true && s.opacity==='1' && s.label==='LUZ')(btn(true,'environment',false,false)));
ok('encendida => label "LUZ ✓" + fondo ámbar', (s=>s.label==='LUZ ✓' && /251,191,36/.test(s.bg))(btn(true,'environment',false,true)));
ok('selfie => NO disponible (gris .4)', (s=>s.avail===false && s.opacity==='.4')(btn(true,'user',false,false)));
ok('sin track => NO disponible', (s=>s.avail===false)(btn(false,'environment',false,false)));
ok('unsupported (applyConstraints falló) => NO disponible', (s=>s.avail===false)(btn(true,'environment',true,false)));

// _kioskTorchFailMsg: para el día a día, el aviso DEBE ser claro y accionable
// (apuntar a usar una luz externa); el motivo técnico va a consola, no al usuario.
ok('mensaje sugiere usar luz externa (accionable)', /LUZ EXTERNA/i.test(fmsg('OverConstrainedError')));
ok('mensaje no rompe con motivo vacío', typeof fmsg('')==='string' && fmsg('').length>0);
ok('mensaje no muestra jerga técnica al usuario', !/OverConstrainedError|NotSupportedError/i.test(fmsg('OverConstrainedError')));

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
