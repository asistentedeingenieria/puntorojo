/* v1051 — REGRESIÓN DE v1047: los SUPERVISORES de varias obras y los ENCARGADOS
   desaparecieron del kiosko.

   Antonio (producción, 29-jul): "las personas que tengo seleccionadas como VARIAS OBRAS, para
   supervisores que en un día van a muchas obras, necesito que sigan pudiendo registrar su
   entrada y su salida en una obra, y después su entrada y salida en otra obra, y así" ·
   "los encargados no se están logrando escanear su asistencia con el rostro ellos mismos".

   CAUSA RAÍZ (mía, v1047): _personaEnObraUsuario — el filtro del roster del kiosko — pasa
   `p.multiObra || p.obraAsignada === o` y NUNCA contempló `p.multiSesion` (el modo "VARIAS
   OBRAS (MARCA POR OBRA)" de los supervisores, v653). Antes eso quedaba tapado para el ADMIN
   porque _getUserObraAsignada() devolvía '' y el filtro se rendía con `if (!o) return true`.
   v1047 hizo que el admin TAMBIÉN caiga a la obra activa → los multiSesion dejaron de pasar
   en TODAS las obras, para todo el mundo. La maquinaria multi-sesión en sí está intacta
   (_kioskMarcar 27129-27133 + computeAsistenciaMarkMulti): el supervisor nunca llegaba a ella.

   Segundo agujero, independiente: quien escanea tampoco se veía a SÍ MISMO si su ficha no
   estaba fija en esa obra. El vínculo usuario↔ficha es user.colaboradorId. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. quién se puede ESCANEAR en la obra activa —');
const zP = ex('function _personaEnObraUsuario(');
let f = null;
try {
  f = (persona, obraActiva, miFichaId) => new Function('_obraFiltroAsist', 'getCurrentUser',
    'return (' + zP + ')')(() => obraActiva, () => ({ colaboradorId: miFichaId || '' }))(persona);
} catch(e){}
ok('evaluable', !!f);
if (f) {
  ok('el fijo de esta obra, sí', f({ id:'a', obraAsignada:'p1' }, 'p1') === true);
  ok('el fijo de OTRA obra, no', f({ id:'b', obraAsignada:'p2' }, 'p1') === false);
  ok('VARIAS OBRAS (multiObra) sigue pasando', f({ id:'c', multiObra:true }, 'p1') === true);
  /* ⚠️ EL BUG DE ANTONIO: el supervisor que marca POR OBRA quedaba fuera de todos los kioskos */
  ok('VARIAS OBRAS POR MARCA (multiSesion) pasa', f({ id:'d', multiSesion:true }, 'p1') === true);
  ok('y aunque su ficha apunte a otra obra', f({ id:'e', multiSesion:true, obraAsignada:'p9' }, 'p1') === true);
  /* ⚠️ EL SEGUNDO BUG: el encargado escaneándose a sí mismo */
  ok('yo mismo SIEMPRE me puedo escanear', f({ id:'yo', obraAsignada:'p9' }, 'p1', 'yo') === true);
  ok('yo mismo aunque sea de OFICINA sin obra', f({ id:'yo' }, 'p1', 'yo') === true);
  ok('sin obra activa pasa cualquiera (como antes)', f({ id:'x', obraAsignada:'p9' }, '') === true);
  ok('sin persona, no', f(null, 'p1') === false);
}

console.log('\n— 2. el REGISTRO de cara alcanza a los mismos —');
/* si no puede registrar su cara, tampoco puede escanearse después */
const zR = ex('function _kioskAbrirRegistro(');
ok('el registro usa el mismo criterio', /_personaEnObraUsuario\(/.test(zR));
ok('ya no filtra a mano por obraAsignada', !/p\.obraAsignada===_o/.test(zR));

console.log('\n— 3. la maquinaria multi-sesión sigue INTACTA —');
const zK = ex('function _kioskMarcar(');
ok('sin sesión abierta pregunta la obra (ENTRADA)', /_kioskPedirObra\(personaId\)/.test(zK));
ok('con sesión abierta cierra en ESA obra (SALIDA)', /_asistSesionAbierta\(_recMS\)/.test(zK) && /_recMS&&_recMS\.obraId/.test(zK));
const zM = ex('function computeAsistenciaMarkMulti(');
ok('cada sesión guarda su propia obra', /obraId:obraId\|\|''/.test(zM));
ok('la salida cierra la sesión abierta', /salida:hhmm/.test(zM));
ok('y se pueden apilar varias en el día', /sessions\.push\(/.test(zM));
/* el auto-marcado ya estaba permitido por permiso — que no se rompa */
ok('marcarse a sí mismo no exige permiso de asistencia', /colaboradorId===personaId/.test(ex('function _marcarAsistenciaFacial(')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
