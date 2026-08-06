/* v1063 — OBRAS PEQUEÑAS EN ADMINISTRACIÓN>PERSONAL (Antonio, 29/30-jul):
   "quiero que se pueda también ver las personas que están en obras pequeñas que son otras
   de las que NO tenemos… cuando se le registra la asistencia SÍ o SÍ se tiene que poner el
   nombre de la obra pequeña". Decisiones de Antonio: el nombre es TEXTO LIBRE al marcar
   (eligió esa opción) y esas personas YA están en COLABORADORES.

   Diseño mínimo SIN cambio de sync: la app ya tiene el concepto (kiosko '+ OTRA OBRA' →
   obraId centinela 'OTRA' + obraDesc obligatorio; _mergeAsistencia lo transporta entero).
   Lo nuevo: filtro OBRAS PEQUEÑAS (__PEQ__) en el selector del panel ADMIN, marcado manual
   _marcarObraPequena (atómico: presente+obraId+obraDesc+_ts juntos — regla objeto-entero),
   chip/botón en la fila (botón solo en el panel), y los agrupadores del día muestran cada
   obra pequeña CON SU NOMBRE en vez de fundirlas en 'OTRA'. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. el filtro OBRAS PEQUEÑAS del panel ADMINISTRACIÓN —');
const zSel = ex('function _adminSelectorHTML(');
ok('la opción existe con su centinela', /__PEQ__/.test(zSel) && />OBRAS PEQUEÑAS</.test(zSel));
ok('solo en el modo con TODAS (PERSONAL)', /conTodas \?/.test(zSel));

console.log('\n— 2. el filtro de la lista (función pura) —');
const zF = ex('function _personaEnListaObra(');
ok('tiene la rama __PEQ__', /__PEQ__/.test(zF));
let enLista = null;
try {
  const hoy = '2026-07-30';
  const marcas = { 'p-otra': { presente: true, obraId: 'OTRA', obraDesc: 'REPARACIÓN ZONA 15' },
                   'p-multi': { presente: true, multiSesion: true, sessions: [{ obraId: 'OTRA', obraDesc: 'CASA LA CUMBRE' }] },
                   'p-obra': { presente: true, obraId: 'proj1' } };
  /* v1149: la función lee por _getAsistenciaDia (el shim caliente→archivo) — se inyecta
     con la misma semántica sobre el fixture */
  enLista = new Function('_getUserObraAsignada','_getAsistencia','_asistFechaActual','_getAsistenciaDia', 'return (' + zF + ')')(
    () => '', () => ({ [hoy]: marcas }), () => hoy, (f) => (f === hoy ? marcas : {}));
} catch(e){ console.log('extract err', e.message); }
ok('extraíble', typeof enLista === 'function');
if (enLista) {
  ok('pasa quien marcó HOY en obra pequeña', enLista({ id: 'p-otra' }, '__PEQ__') === true);
  ok('pasa la sesión OTRA del supervisor multiSesion', enLista({ id: 'p-multi' }, '__PEQ__') === true);
  ok('NO pasa quien marcó en un proyecto de la app', enLista({ id: 'p-obra' }, '__PEQ__') === false);
  ok('NO pasa quien no marcó', enLista({ id: 'p-nada' }, '__PEQ__') === false);
  ok('los filtros de proyecto siguen igual', enLista({ id: 'p-obra', obraAsignada: 'proj1' }, 'proj1') === true);
}

console.log('\n— 3. el marcado manual con nombre OBLIGATORIO —');
const zM = ex('async function _marcarObraPequena(');
ok('existe', zM.length > 600);
ok('permiso de asistencia (o admin)', /can\('personal\.asistencia'\)/.test(zM));
ok('multiSesion marca por escaneo, no acá', /multiSesion/.test(zM) && /ESCANEO/.test(zM));
ok('el nombre es OBLIGATORIO', /OBLIGATORIO/.test(zM) && /required:\s*true/.test(zM) && /if \(!desc\) return/.test(zM));
ok('re-lee el state tras el await (regla v769/v940)', /re-leer tras el await/i.test(zM) && (zM.match(/_getAsistencia\(\)/g) || []).length >= 2);
/* la marca se escribe ATÓMICA: presente + obraId + obraDesc + _ts en UNA asignación
   (editar por partes es el patrón objeto-entero que ya mordió 3 veces) */
ok('escritura atómica con el centinela del kiosko', /=\{presente:true,obraId:'OTRA',obraDesc:desc,[^}]*_ts:Date\.now\(\)\}/.test(zM));
ok('sella pendiente y limpia lápida (patrón v902)', /_asistPendingAdd/.test(zM) && /_asistTombClear/.test(zM));
ok('guarda por el canal liviano de asistencia', /saveAsistencia\(\)/.test(zM));

console.log('\n— 4. la fila: chip con la obra de HOY y botón solo en el panel —');
ok('el chip existe', /_peqChip/.test(html) && /Marcado hoy en esta obra pequeña/.test(html));
/* v1098 — ESTA ASERCIÓN SE DIO VUELTA A PROPÓSITO. Antonio: "elimina la opción que agregaste
   de obra pequeña, no tiene sentido eso". El BOTÓN de marcar sale de la fila del colaborador;
   el chip de quien ya quedó marcado se queda (se quita la opción, no el historial). La función
   _marcarObraPequena sigue en el código y no se borró: si algún día vuelve a hacer falta, se
   re-expone con una línea. */
ok('YA NO se ofrece marcar obra pequeña desde la fila del colaborador', !/>OBRA PEQUEÑA<\/button>/.test(html));
ok('el chip informativo del que ya está marcado sigue', /_peqChip/.test(html));
ok('y solo se ve dentro de ADMINISTRACIÓN', /\.pr-btn-peq\{display:none\}/.test(html) && /#_adminPanelModal \.pr-btn-peq\{display:inline-block\}/.test(html));

console.log('\n— 5. los agrupadores del día ya no funden las obras pequeñas —');
ok('el modal PRESENTES POR OBRA saca cada una con su nombre', /k='OTRA: '\+String\(r\.obraDesc\)\.toUpperCase\(\)/.test(ex('window._v644ResumenPresentesPorObra = function')));
const iKpi = html.indexOf('// v644: agrupar por nombre en MAYÚSCULAS');
ok('el KPI de presentes igual', /OTRA: /.test(html.slice(iKpi, iKpi + 500)));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
