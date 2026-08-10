/* v1163 — LA FIRMA SALE NEGRA Y FIRME (v1160 la dejaba clara y "borrada")

   Antonio (10-ago, con la OC impresa): "Las firmas se ven muy claras. No puedes
   modificarlas para que se vean mas oscuras y que no se vean como borradas."

   POR QUÉ v1160 LAS ADELGAZÓ: el umbral de Otsu parte el histograma en dos, y en un trazo
   FINO la mayoría de sus píxeles son de BORDE (grises intermedios) — Otsu los manda al
   fondo y solo sobrevive el núcleo. Encima la banda de suavizado de ±14 niveles los dejaba
   semi-transparentes: el resultado es un trazo hilo y desvanecido.

   LOS TRES ARREGLOS:
   1. SESGO del umbral (+ ~18 niveles): la tinta gris de los bordes entra como trazo.
   2. DILATACIÓN 3×3 de una pasada: recupera el grosor real del lapicero.
   3. Alpha con CURVA (^0.55) y tinta #000: el borde ya no se desvanece — negro pleno.
   La banda de suavizado baja a 8 (antialias sí, desvanecido no).

   El cache se invalida (clave v2) para que las firmas ya procesadas con v1160 se
   re-procesen solas — si no, seguirían viéndose claras para siempre. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— el trazo se agarra completo —');
const zP = ex(code, 'function _firmaTintaProcesar(');
ok('el umbral lleva SESGO (los bordes grises entran como tinta)', /_SESGO|sesgo/.test(zP));
ok('la banda de suavizado se achicó (menos desvanecido)', !/banda = 14/.test(zP) && /banda = (6|7|8|9|10)/.test(zP));
ok('el alpha va con curva (el borde no se apaga)', /Math\.pow\(/.test(zP));
ok('la tinta es NEGRA plena', /d\[i\] = 0; d\[i \+ 1\] = 0; d\[i \+ 2\] = 0/.test(zP) || /= 0, 0, 0/.test(zP));

console.log('\n— el grosor real del lapicero —');
ok('hay una pasada de DILATACIÓN 3×3', /dilat|_dil/i.test(zP));
ok('la dilatación trabaja sobre una copia (no se auto-alimenta)', /slice\(\)|Uint8|from\(/.test(zP));

console.log('\n— el cache se invalida —');
ok('la clave subió a v2 (las firmas de v1160 se re-procesan)', /pr_firma_tinta_v2/.test(code) && !/pr_firma_tinta_v1/.test(code));

console.log('\n— lo que no cambia —');
ok('sigue siendo adaptativo por imagen (Otsu)', /hist|_hist/.test(zP) && /between/.test(zP));
ok('el fondo sigue TRANSPARENTE', /toDataURL\('image\/png'\)/.test(zP));
ok('las cinco firmas siguen cableadas', (code.match(/_firmaTintaSrc\(/g) || []).length >= 6);
ok('el warm-up sigue', /_firmaTintaWarmup/.test(code));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
