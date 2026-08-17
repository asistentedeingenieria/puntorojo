/* v1160 — LAS FIRMAS SE BINARIZAN CON CANVAS: SIEMPRE perfectas, en TODOS los documentos

   Antonio (10-ago, con la OC impresa): "Las firmas YA NO se estan viendo bien... en TODAS
   las firmas de la app... que SIEMPRE se vean perfectamente y que NO se vea el fondo."

   POR QUÉ EL FILTRO v1154 NO ALCANZÓ: era FIJO (brightness 1.35 / contrast 2.4) — perfecto
   para trazo grueso oscuro (Claudia), pero LAVA los trazos finos/claros (Susana, Erlin):
   el contraste que blanquea el papel también desvanece la tinta débil. Un filtro no puede
   adaptarse a cada foto.

   LA SOLUCIÓN: binarización ADAPTATIVA por imagen (umbral de OTSU sobre el histograma de
   luminancia) en canvas → PNG con fondo TRANSPARENTE y trazo re-tintado a negro pleno,
   con banda de suavizado alrededor del umbral (antialias). Independiente de la calidad de
   la foto: trazo claro queda NEGRO, papel gris desaparece.

   ARQUITECTURA:
   · _firmaTintaProcesar(src) async → dataURL PNG transparente (Otsu + banda); las firmas
     de usuarios son BASE64 (state.firmasUsuarios) — sin CORS; la del receptor del acuse
     es URL de Storage → crossOrigin='anonymous' y si el canvas se ensucia, null (queda el
     filtro CSS v1154 de fallback).
   · Cache en memoria + espejo localStorage (pr_firma_tinta_v1, con tope) — se procesa UNA
     vez por firma, para siempre.
   · _firmaTintaSrc(src) SYNC para los templates: cache hit → procesada; miss → devuelve
     la original (fallback CSS) y dispara el proceso en background.
   · WARM-UP al arrancar: procesa todas las firmas registradas — la primera impresión del
     día ya sale limpia. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— el procesador adaptativo —');
const zP = ex(code, 'function _firmaTintaProcesar(');
ok('existe y procesa en canvas', zP.length > 600 && /createElement\('canvas'\)/.test(zP) && /getImageData/.test(zP));
ok('umbral ADAPTATIVO por histograma (Otsu — no un número fijo)', /hist|_hist/.test(zP) && /256/.test(zP));
ok('el fondo queda TRANSPARENTE (alpha 0) y el trazo re-tintado', /putImageData/.test(zP) && /toDataURL\('image\/png'\)/.test(zP));
ok('banda de suavizado alrededor del umbral (antialias, no bordes duros)', /banda|_suav|suave/i.test(zP));
ok('la URL remota del acuse va con crossOrigin (y si se ensucia, null)', /crossOrigin/.test(zP));
ok('resultado acotado (no procesar gigante)', /600|500|MAX/i.test(zP));

console.log('\n— el cache: una vez por firma, para siempre —');
ok('cache en memoria + espejo localStorage con clave propia', /pr_firma_tinta/.test(code) && /_firmaTintaCache/.test(code));
const zS = ex(code, 'function _firmaTintaSrc(');
ok('_firmaTintaSrc es SYNC para los templates (hit → procesada, miss → original + proceso en background)',
  zS.length > 100 && /_firmaTintaCache/.test(zS) && /_firmaTintaProcesar/.test(zS));

console.log('\n— aplicada en los documentos con firma —');
/* v1238 (Antonio): la firma del SOLICITANTE salió de la hoja del pedido — la confirmación
   del QR (verificar.html) la muestra en trazo caligráfico. Quedan CUATRO firmas de imagen:
   OC ×2, recibo, acuse. La propiedad v1160 (todas pasan por el procesador) se conserva. */
const usos = (code.match(/_firmaTintaSrc\(/g) || []).length;
ok('las cuatro firmas pasan por el procesador (OC ×2, recibo, acuse) + definición', usos >= 5);
ok('v1238: la hoja del pedido ya no incrusta firma', !/_firmaTintaSrc\(_miFirmaImg\(pd\.solicitanteUsername\)\)/.test(code));
ok('las dos de la OC', /_firmaTintaSrc\(_miFirmaImg\(oc\.generadoPorUsername\)\)/.test(code) && /_firmaTintaSrc\(_miFirmaImg\(_firmaUsernameAutoriza\(oc\)\)\)/.test(code));
ok('la del recibo y la del acuse', /_firmaTintaSrc\(firma\)/.test(code) && /_firmaTintaSrc\(firmaUrl\)/.test(code));
ok('el filtro CSS v1154 queda de FALLBACK mientras el proceso corre', /_FIRMA_TINTA/.test(code));

console.log('\n— el warm-up al arrancar —');
ok('procesa todas las firmas registradas al arrancar (idle)',
  /_firmaTintaWarmup/.test(code) && /firmasUsuarios/.test(ex(code, 'function _firmaTintaWarmup(')));
ok('el warm-up se dispara en el boot', (code.match(/_firmaTintaWarmup\(\)/g) || []).length >= 1);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
