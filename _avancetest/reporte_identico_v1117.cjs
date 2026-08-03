/* v1119 — EL LAYOUT DEL REPORTE, CORREGIDO CONTRA EL ORIGINAL REAL.

   Historia de este archivo: en v1117 lo escribí fijando que las fotos iban A SANGRE (recorte
   "cover", 304x540, pegadas al borde). Estaba MAL. Antonio mandó capturas lado a lado de su
   reporte contra el generado y la diferencia era evidente:
     · sus fotos van CON MÁRGENES y separadas, completas y sin recortar
     · el título va ARRIBA (NIVEL X grande, y debajo PASILLO/APARTAMENTO), los dos en rojo
     · la tabla va DEBAJO del título y su encabezado es una barra ROJA SÓLIDA con texto blanco
     · todas las hojas llevan un pie con el correo y la web
   Las medidas EMU que extraje del PPTX correspondían a otro slide del archivo, no al de los
   apartamentos; por eso "medir" tampoco alcanzó: había que comparar el resultado.

   Este test fija el layout CORRECTO para que no se vuelva atrás. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const z = ex('window._repGenerarPDF = async function(');
ok('existe el generador', z.length > 1000);

console.log('\n— 1. la hoja sigue siendo 16:9 (esto sí estaba bien) —');
ok('960 x 540 puntos', /format:\[960,540\]/.test(z));
ok('apaisado', /orientation:'landscape'/.test(z));
ok('cada página mantiene el formato', /addPage\(\[960,540\],'landscape'\)/.test(z));

console.log('\n— 2. LAS FOTOS: completas y con márgenes, NO a sangre —');
ok('la foto entra COMPLETA (contain), no recortada', /Math\.min\(maxW \/ iw, maxH \/ ih\)/.test(z));
ok('ya NO se usa el recorte cover que las destrozaba', !/Math\.max\(wPt \/ iw, hPt \/ ih\)/.test(z));
ok('cada foto vive en una caja con margen', /boxW = 300, boxH = 380, boxY = 80/.test(z));
ok('hay separación entre las dos fotos', /gap = 24/.test(z));
ok('la foto se centra dentro de su caja', /\(boxW - im2\.w\)\/2/.test(z) && /\(boxH - im2\.h\)\/2/.test(z));
ok('no arrancan pegadas al borde izquierdo', /x0 = 320/.test(z));

console.log('\n— 3. EL TÍTULO va arriba, en dos líneas y en rojo —');
ok('NIVEL arriba', /f\.nivel[\s\S]{0,60}150/.test(z));
ok('la unidad debajo', /f\.apto[\s\S]{0,60}180/.test(z));
ok('los dos en rojo', /setTextColor\(ROJO\[0\],ROJO\[1\],ROJO\[2\]\);[\s\S]{0,120}f\.nivel/.test(z));
ok('centrados en la franja izquierda', /cxi = 150/.test(z) && /align:'center'/.test(z));

console.log('\n— 4. LA TABLA con encabezado rojo sólido —');
ok('el encabezado es una barra roja rellena', /setFillColor\(ROJO\[0\],ROJO\[1\],ROJO\[2\]\);[\s\S]{0,60}rect\(tx, ty, tw, rowH, 'F'\)/.test(z));
ok('con el texto en blanco', /setTextColor\(255,255,255\);[\s\S]{0,80}'Actividad'/.test(z));
ok('va DEBAJO del título', /ty = 230/.test(z));
ok('cada fila tiene su recuadro', /rect\(tx, ry, tw, rowH, 'S'\)/.test(z));
ok('las SEIS etapas', /ETAPAS\.forEach/.test(z));
ok('la X en rojo', /ROJO\[0\],ROJO\[1\],ROJO\[2\]\);[\s\S]{0,60}text\('X'/.test(z));
ok('fila Entregado', /'Entregado'/.test(z));

console.log('\n— 5. el pie en todas las hojas —');
ok('existe el pie', /function _pie\(\)/.test(z));
ok('lleva correo y web', /puntorojosa\.com/.test(z) && /puntorojo\.com\.gt/.test(z));
ok('se pinta en la portada, en la torre y en cada unidad', (z.match(/_pie\(\);/g) || []).length >= 3);

console.log('\n— 6. la portada y la hoja de torre —');
ok('la portada lleva la franja de fechas en recuadros', /celdas = \['Del'/.test(z));
ok('SEMANA en rojo con dos dígitos', /padStart\(2,'0'\)/.test(z));
ok('el nombre de la torre va en BLANCO sobre la foto', /setTextColor\(255,255,255\); doc\.setFontSize\(40\)/.test(z));
ok('sin el recuadro blanco que le puse antes', !/rect\(596, 292, 348, 58, 'F'\)/.test(z));

console.log('\n— 7. lo que no cambia —');
ok('barra de progreso', /_prUploadShow/.test(z));
ok('guarda el reporte al final', /_repGuardar\(p, rep\)/.test(z));
ok('avisa cuando la foto es repetida', /SIN AVANCE ESTA SEMANA/.test(z));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
