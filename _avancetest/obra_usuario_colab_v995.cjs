/* v995 (reporte de Antonio 27-jul): puso a JULIO CHARVAC CASAP como encargado de VICINIA
   LAS AMÉRICAS y la ASISTENCIA lo seguía mostrando en ESSENZA FASE 2.

   CAUSA: la obra de una persona vive en DOS registros distintos y cada pantalla lee el suyo:
     · doc del USUARIO (u.obraAsignada, _asignarObraUsuario) → qué ve y escanea en el kiosko
     · ficha del COLABORADOR (p.obraAsignada, _asignarObraColaborador) → dónde sale en ASISTENCIA
   Cambiar uno no tocaba el otro, así que la persona quedaba en dos obras a la vez.

   FIX: se propaga entre los dos, pero SOLO cuando el nombre identifica a UNA sola persona
   (con homónimos no se adivina: se deja como está). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── el emparejador es PURO y exige match único ──
const zV = ex('function _personaPorNombreUnica(');
ok('existe _personaPorNombreUnica', !!zV);
let f = null;
try { f = new Function('return (' + zV + ')')(); } catch(e){}
if (f) {
  const P = [
    { id:'p1', nombre:'JULIO CHARVAC CASAP', obraAsignada:'essenza' },
    { id:'p2', nombre:'MARIA LOPEZ', obraAsignada:'vla' },
    { id:'p3', nombre:'MARIA LOPEZ', obraAsignada:'essenza' },
    { id:'p4', nombre:'JOSÉ PÉREZ', obraAsignada:'' , baja:true }
  ];
  ok('encuentra a la persona por nombre', (f('JULIO CHARVAC CASAP', P) || {}).id === 'p1');
  ok('ignora tildes, mayúsculas y espacios de más', (f('  julio   charvac casap ', P) || {}).id === 'p1');
  ok('matchea con tilde contra sin tilde', (f('JOSE PEREZ', P) || {}).id === 'p4');
  ok('con HOMÓNIMOS no adivina', f('MARIA LOPEZ', P) === null);
  ok('sin coincidencia devuelve null', f('PEDRO GOMEZ', P) === null);
  ok('nombre vacío devuelve null', f('', P) === null && f(null, P) === null);
}

// ── propagación en los dos sentidos ──
const zU = ex('async function _asignarObraUsuario(');
ok('asignar obra al USUARIO propaga a su ficha de colaborador', /_personaPorNombreUnica\(/.test(zU) && /obraAsignada/.test(zU));
ok('la propagación sella _ts (merge de personal, v673)', /_ts = Date\.now\(\)/.test(zU));
ok('y guarda el state', /saveState\(\)/.test(zU));
const zC = ex('function _asignarObraColaborador(');
ok('asignar obra al COLABORADOR propaga al doc del usuario', /_usuarioPorNombreUnico\(|saveUserDoc\(/.test(zC));
// una obra concreta manda; "varias obras" no se propaga como obra fija
ok('multi-obra no arrastra una obra fija al usuario', /multiObra \|\| p\.multiSesion|!p\.multiObra && !p\.multiSesion/.test(zC));
ok('no le impone obra al ADMIN (ve todo)', /_esAdminU/.test(zC) || /users\.manage/.test(zC));

// ── el modal de encargados muestra la divergencia y deja igualarla ──
ok('avisa cuándo la asistencia lo tiene en otra obra', /EN ASISTENCIA ESTÁ EN/.test(html));
ok('existe el botón IGUALAR', /_igualarObraColaborador\(/.test(html));
const zIg = ex('async function _igualarObraColaborador(');
ok('igualar exige permiso y reusa la propagación', /users\.manage/.test(zIg) && /_asignarObraUsuario\(/.test(zIg));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
