/* v1047 — FASE 2: la ASISTENCIA es de la OBRA ACTIVA, sin desplegable TODAS LAS OBRAS.
   Antonio: "ya no quiero eso de buscar por proyecto — quiero que se pueda ver con base al
   proyecto que está seleccionado" · decisión AskUserQuestion: para TODOS, admin incluido; los
   PDF multi-obra por naturaleza (ESTADO DE FUERZA, SEMANAL, MENSUAL) siguen igual.

   HALLAZGO del mapeo que lo hace seguro: TODO el circuito matchea por ID de proyecto
   (persona.obraAsignada = pr.id, marca.obraId, user.obraAsignada) — renombrar obras no rompe
   nada, y NINGÚN dato se toca: solo cambia de dónde sale el filtro. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. el filtro sale de la OBRA ACTIVA, no del DOM —');
const zF = ex('function _obraFiltroAsist(');
let filtro = null;
try {
  /* el document falso EXPLOTA si alguien pide el select viejo: prueba de que ya no se lee */
  filtro = (enc, activaId) => {
    /* si el código todavía lee el select viejo, el document falso explota y esto REPRUEBA
       (en vez de tumbar la corrida) */
    try {
      return new Function('_getUserObraAsignada', 'activeProj', 'document',
        'return (' + zF + ')')(
          () => enc,
          () => activaId ? { id: activaId } : null,
          { getElementById: function(id){ if (id === 'asistObraPdf') throw new Error('leyó el select viejo'); return null; } })();
    } catch(e){ return '__LEYO_EL_DOM__'; }
  };
} catch(e){}
ok('evaluable', !!filtro && zF.length > 100);
if (filtro) {
  ok('admin: devuelve la obra activa', filtro('', 'p7') === 'p7');
  ok('ya NO consulta el select viejo', (function(){ try { return filtro('', 'p1') === 'p1'; } catch(e){ return false; } })());
  /* el encargado sigue clavado a SU obra (invariante v634: su obra activa ES la asignada) */
  ok('el encargado gana sobre la activa', filtro('enc1', 'p2') === 'enc1');
  ok('sin obra activa no revienta', filtro('', null) === '');
}

console.log('\n— 2. el desplegable se fue —');
ok('el select ya no está en el HTML', !/id="asistObraPdf"/.test(html));
ok('nadie lo repuebla en renderPersonal', !/_obraSel=document\.getElementById\('asistObraPdf'\)/.test(html));
ok('el reset v648 de setActiveProject se fue con él', !/getElementById\('asistObraPdf'\); if\(_s\) _s\.value/.test(html));

console.log('\n— 3. el kiosko ofrece la gente de la obra activa —');
const zP = ex('function _personaEnObraUsuario(');
ok('el roster escaneable usa el filtro nuevo', /_obraFiltroAsist\(\)/.test(zP));
/* la regla multiObra-siempre-pasa es DELIBERADA (rota entre obras) y se conserva */
ok('multiObra sigue pasando siempre', /p\.multiObra/.test(zP));
ok('el registro de caras también', /_obraFiltroAsist/.test(ex('function _kioskAbrirRegistro(')));

console.log('\n— 4. los PDF: el del día es de la obra; los multi-obra quedan intactos —');
ok('PRESENTES DEL DÍA sigue a la obra activa', /_obraFiltroAsist\(\)/.test(ex('function descargarPdfDiaPresentes(')));
/* ⚠️ LA TRAMPA CENTRAL del mapeo: los callers de SEMANAL/MENSUAL pasaban _obraFiltroAsist()
   con explicit=true, donde '' = TODAS LAS OBRAS. Con el filtro nuevo ya nunca habría '' y el
   admin perdería el modo TODAS en silencio. Pasan _getUserObraAsignada: admin '' = TODAS. */
ok('SEMANAL conserva TODAS para el admin', !/_generarPdfSemanal\([^)]*_obraFiltroAsist/.test(html) && (html.match(/_generarPdfSemanal\([^)]*_getUserObraAsignada/g) || []).length >= 2);
ok('MENSUAL igual', !/_generarPdfMensual\([^)]*_obraFiltroAsist/.test(html) && (html.match(/_generarPdfMensual\([^)]*_getUserObraAsignada/g) || []).length >= 2);
const zEf = ex('function _efTargetObra(');
ok('ESTADO DE FUERZA: admin todas las obras, encargado la suya', /_getUserObraAsignada/.test(zEf) && !/asistObraPdf/.test(zEf));

console.log('\n— 5. la marca manual no queda sin obra —');
const zT = ex('function toggleAsistenciaGlobal(');
/* un fijo sin registro previo quedaba presente con obraId:'' y no contaba en el KPI */
ok('estampa la obra asignada del fijo', /obraId:cur\.obraId\|\|\(\(_pms&&_pms\.obraAsignada\)\|\|''\)/.test(zT));

console.log('\n— 6. el KPI ya no dice "por obra (prom.)" —');
ok('la etiqueta es PRESENTES (ya se está en UNA obra)', !/Presentes por obra \(prom\.\)/.test(html));

console.log('\n— 7. GASTOS salió de la barra de la obra (patrón v1040) —');
ok('el botón ya no está', !/data-mattab="gastos" onclick/.test(html));
ok('el contenedor QUEDA (es la casa de COMPRAS)', /<div id="mat-gastos"/.test(html));
ok('COMPRAS lo sigue despachando', /setMatTab\('gastos'\)/.test(ex('function _comprasSetTab(')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
