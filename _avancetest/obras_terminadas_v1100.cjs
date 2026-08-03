/* v1100 — OBRAS TERMINADAS (Antonio): "agregame una opción de obras terminadas. Esto solo yo
   lo puedo marcar cuando ya se terminaron. Por el momento poneme LAS CUMBRES - JADE como obra
   terminada. Quiero que esté hasta abajo en una línea de despliegue donde esté escondido y si
   se apacha ya muestra las obras."
   El selector de obras se llena de obras muertas y la que importa queda perdida entre ellas.
   FLAG, no borrado: p.terminada solo cambia DÓNDE se lista. La obra sigue entera y se puede
   entrar igual (hay que consultar planillas y cobros de obras cerradas). Reversible. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. el selector separa activas de terminadas —');
const zP = ex('window._abrirPantallaObra = function(');
ok('_abrirPantallaObra existe', zP.length > 400);
ok('las terminadas no van en la grilla de arriba', /\.terminada/.test(zP));
/* `proys` pasa a ser SOLO las activas y las terminadas van aparte en _obrasTerm */
ok('la grilla principal pinta solo las activas',
  /const proys = _todasProys\.filter\(p => !p\.terminada\)/.test(zP) && /proys\.map\(tarjeta\)/.test(zP));

console.log('\n— 2. el bloque escondido abajo —');
const zB = ex('function _bloqueTerminadasHTML(');
ok('existe el bloque de terminadas', zB.length > 150);
ok('arranca colapsado', /_termOpen/.test(html));
ok('dice cuántas hay', /OBRAS TERMINADAS/.test(zB));
ok('se puede entrar a una obra terminada (no se esconde el dato)', /_elegirObraYEntrar/.test(zB));
/* Antonio: "que esté HASTA ABAJO" — va de último, después del bloque de empresa */
ok('el bloque va hasta abajo del todo',
  zP.indexOf('_bloqueTerminadasHTML(') > zP.indexOf('_bloqueEmpresaHTML()'));

console.log('\n— 3. marcar/reabrir: SOLO el admin —');
const zT = ex('window._toggleObraTerminada = async function(');
ok('existe el toggle', zT.length > 150);
ok('exige admin', /users\.manage/.test(zT));
ok('sella _ts (el proyecto viaja sincronizado)', /_ts/.test(zT));
ok('sube al instante', /forceUploadNow/.test(zT));
ok('el control de marcar solo se le muestra al admin', /users\.manage/.test(zB));

console.log('\n— 4. no se pierde nada —');
ok('es un flag, no un borrado', !/splice|delete state\.projects/.test(zT));
ok('no toca la lista de proyectos', !/state\.projects\s*=/.test(zT));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
