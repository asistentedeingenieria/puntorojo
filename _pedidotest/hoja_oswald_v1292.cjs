/* v1292 (Antonio, 27-ago — eligió del muestrario visual: "La 4" = OSWALD): tras dos
   vueltas (v1286 letra de la app → no le gustó; v1291 Arimo gemela de Arial → "sigue
   estando igual"), quedó claro que quería una letra NUEVA y NOTORIA, unificada en
   TODOS los documentos de todos los proyectos. Se le mostró la misma hoja en 6 letras
   (artifact muestrario) y eligió OSWALD: condensada tipo rotulación industrial,
   inconfundible con un documento hecho en Word.
   El loader se renombra a _hojaFont (neutral — el próximo cambio de gusto no obliga a
   renombrar); baja Oswald variable de google/fonts, cachea en localStorage y LIMPIA la
   llave vieja de Arimo (260 KB muertos en los aparatos que ya la habían bajado).
   Fallback si no hay fuente cacheada: Arial pelada, como toda la vida. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zT = ex('function _hojaFontTag(');
ok('la hoja usa el loader neutral _hojaFont', /_hojaFont\b/.test(zT) && !/_hojaArimo|_pdfBarlow/.test(zT));
ok('el respaldo sigue siendo Arial', /,Arial,sans-serif/.test(zT));

const iL = html.indexOf('window._hojaFont = (function(){');
const zL = html.slice(iL, iL + 1800);
ok('loader propio con cache en localStorage', iL > 0 && /localStorage/.test(zL) && /pr_hoja_font_oswald/.test(zL));
ok('baja OSWALD del CDN de google/fonts', /ofl\/oswald/.test(zL));
ok('limpia la llave muerta de Arimo', /removeItem\('pr_hoja_arimo_v1'\)/.test(zL));
ok('prefetch al arrancar', /setTimeout/.test(zL) && /prefetch/.test(zL));
ok('no quedó ningún rastro del loader viejo', html.indexOf('_hojaArimo') < 0);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
