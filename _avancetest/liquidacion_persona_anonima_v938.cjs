/* v938 (pedido de Antonio con print del PDF de LIQUIDACIÓN POR PERSONA):
   el reporte que se le manda AL TRABAJADOR ya no debe traer EN NINGÚN MOMENTO el
   nombre del supervisor ni el del proyecto — solo "LIQUIDACIÓN TABLAYESO" y abajo
   la fecha. Aplica a TODOS los proyectos (la rama opts.porPersona de
   _generarYDescargarExcel es genérica). "En ningún momento" incluye el NOMBRE DEL
   ARCHIVO (viajaba con el proyecto al reenviarlo por WhatsApp). El PDF COMPLETO de
   la planilla (interno, para gerencia/PM) conserva proyecto+supervisor. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const src = extractFn('_generarYDescargarExcel');
ok('el builder existe', !!src);

// aislar la rama POR PERSONA (v792) del resto del builder
const iBranch = src.indexOf('opts.porPersona){');
const iBranchEnd = src.indexOf('POR PERSONA', iBranch); // el toast final de la rama
const branch = (iBranch > -1 && iBranchEnd > iBranch) ? src.slice(iBranch, iBranchEnd) : '';
ok('la rama por persona existe', !!branch);

// ── 1. título fijo, sin proyecto ni torres ──
ok("título fijo 'LIQUIDACIÓN TABLAYESO' (sin proyecto)", /_titHd = 'LIQUIDACIÓN TABLAYESO'/.test(branch));
ok('la rama ya no concatena data.proyecto en el título', !/_titHd = \('LIQUIDACIÓN TABLAYESO - '/.test(branch));

// ── 2. sin línea de supervisor; la fecha queda ──
ok('sin supervisor en la rama por persona', branch.indexOf('supervisorNombre') === -1 && branch.indexOf('_supHd') === -1);
ok('la fecha sigue debajo del título', /_fSabHd/.test(branch));

// ── 3. el NOMBRE DEL ARCHIVO tampoco lleva proyecto ──
ok('archivo sin proyecto (Liquidación NOMBRE_fecha.pdf)', /'Liquidación ' \+ _nomCl \+ '_' \+ _sab \+ '\.pdf'/.test(branch));
ok('la rama no usa el proyecto para el archivo', branch.indexOf('_projCl') === -1);

// ── 4. el PDF COMPLETO (interno) conserva su encabezado ──
ok('el PDF completo SIGUE con proyecto en el título', src.indexOf("_tituloHd = ('LIQUIDACIÓN TABLAYESO - ' + (data.proyecto||'')") > -1);
ok('el PDF completo SIGUE con supervisor', /_supervisorHd = String\(data\.supervisorNombre/.test(src));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
