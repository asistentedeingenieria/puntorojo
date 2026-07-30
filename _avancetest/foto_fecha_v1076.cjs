/* v1076 — DÍA Y HORA DE CADA FOTO DEL AVANCE FÍSICO (Antonio, 30-jul):
   "necesito ver en el avance físico el día y la hora en que se tomó y subió la foto en cada
   etapa... que funcione para las fotos nuevas y para las que ya se subieron".
   La app YA sella a.photoTs[etapa][slot] = Date.now() al subir (v903+, 3 rutas de subida).
   Lo que faltaba: MOSTRARLO, y conseguir la fecha de las fotos anteriores a ese sello.
   Decisión de Antonio (AskUserQuestion): las viejas se resuelven CONTRA EL SERVIDOR al
   abrirlas (timeCreated de Storage) y quedan selladas para siempre; se muestra en el visor
   grande y en cada cuadrito. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. de dónde sale la fecha de una foto (cascada pura) —');
const zR = ex('function _fotoTs(');
let f = null;
try { f = new Function('return (' + zR + ')')(); } catch(e){}
ok('existe _fotoTs y es pura', !!f && zR.length > 150);
if (f) {
  const a1 = { photos: { 0: ['u1'] }, photoTs: { 0: [1750000000000] } };
  ok('el sello guardado manda', f(a1, 0, 0) === 1750000000000);
  /* fotos "push": el epoch va en el propio nombre del archivo (n{idx}_{Date.now()}) */
  const a2 = { photos: { 1: ['https://x/o/photos%2Fapto%2F1%2Fn0_1749999999999.jpg?alt=media'] }, photoTs: {} };
  ok('sin sello, se lee el epoch del nombre del archivo', f(a2, 1, 0) === 1749999999999);
  const a3 = { photos: { 0: ['https://x/o/photos%2Fapto%2F0%2F1?alt=media'] }, photoTs: { 0: [0] } };
  ok('foto vieja de slot (sin fecha en ningún lado) → 0', f(a3, 0, 0) === 0);
  ok('no revienta con apto vacío', f(null, 0, 0) === 0 && f({}, 5, 3) === 0);
  ok('un sello inválido no se toma por bueno', f({ photos:{0:['u']}, photoTs: { 0: [-5] } }, 0, 0) === 0);
}
const zF = ex('function _fotoFechaTxt(');
ok('existe el formateador día + hora', zF.length > 80 && /getHours|toLocaleString|padStart/.test(zF));
let ff = null;
try { ff = new Function('return (' + zF + ')')(); } catch(e){}
if (ff) {
  const t = new Date(2026, 6, 30, 14, 35).getTime();
  ok('formatea DD/MM/AAAA y hora', /30\/07\/2026/.test(ff(t)) && /14:35/.test(ff(t)));
  ok('sin fecha devuelve vacío (no inventa)', ff(0) === '' && ff(null) === '');
}

console.log('\n— 2. rescate desde el servidor para las fotos viejas —');
const zS = ex('window._fotoTsRescatar = async function') || ex('async function _fotoTsRescatar(');
ok('existe el rescate contra Storage', zS.length > 200);
ok('usa la fecha real del archivo (timeCreated)', /getMetadata\(\)/.test(zS) && /timeCreated/.test(zS));
ok('la sella en photoTs para no volver a preguntar', /photoTs/.test(zS) && /saveState\(\)/.test(zS));
ok('no pregunta si ya tiene fecha', /_fotoTs\(/.test(zS));
ok('si falla no rompe nada', /catch/.test(zS));

console.log('\n— 3. dónde se ve —');
const zT = ex('function renderPhotosModal(');
ok('cada cuadrito muestra su fecha', /_fotoFechaTxt\(/.test(zT) && /photo-slot-fecha|_fotoTs\(/.test(zT));
ok('al abrir la cuadrícula se rescatan las que no la tienen', /_fotoTsRescatar/.test(zT));
const zV = ex('function showPhotoAtIndex(');
ok('el visor grande la muestra bajo la imagen', /_fotoFechaTxt\(/.test(zV));
ok('el visor la trae del servidor si falta y repinta', /_fotoTsRescatar/.test(ex('window.viewPhoto = function') || ex('function viewPhoto(')) || /_fotoTsRescatar/.test(zV));
ok('la lista del visor arrastra el ts de cada foto', /ts: _fotoTs\(/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
