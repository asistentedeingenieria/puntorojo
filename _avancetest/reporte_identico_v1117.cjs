/* v1117 — EL PDF CON LAS MEDIDAS REALES DEL POWERPOINT (Antonio: "CREO QUE NO ME ENTIENDES.
   Necesito que el reporte sea TOTALMENTE IGUAL al que yo te compartí. Debe tener todo igual,
   con el mismo estilo y FOTOS DE FONDO").

   Tenía razón: yo venía aproximando en A4 vertical con las fotos metidas en recuadros chicos.
   Se midió la geometría REAL del archivo (Semana 07), convirtiendo EMU a puntos (1 pt = 12700):
     diapositiva  → 12192000 x 6858000 EMU = 960 x 540 pt (16:9 apaisado, NO A4 vertical)
     portada      → foto x=0 y=0 w=523 h=540  (a sangre, media hoja) + títulos a la derecha
     hoja torre   → foto x=0 y=0 w=960 h=494  (a sangre casi completa) + nombre encima
     hoja unidad  → texto x=0..312 · foto1 x=276 w=304 h=540 · foto2 x=585 w=304 h=540
   O sea: las fotos van DE BORDE A BORDE en altura y el texto vive en una franja blanca. Eso es
   lo que Antonio llamaba "fotos de fondo". */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const z = ex('window._repGenerarPDF = async function(');
ok('existe el generador', z.length > 1000);

console.log('\n— 1. el formato es el de la diapositiva, no A4 —');
ok('960 x 540 puntos', /format:\[960,540\]/.test(z));
ok('apaisado', /orientation:'landscape'/.test(z));
ok('cada página nueva mantiene el formato', /addPage\(\[960,540\],'landscape'\)/.test(z));
ok('ya NO es A4', !/format:'a4'/.test(z));

console.log('\n— 2. FOTOS DE FONDO, no recuadros —');
ok('la portada lleva foto a sangre de 523 de ancho por 540 de alto', /_cover\(primeraFoto, 523, 540\)/.test(z));
ok('la hoja de torre lleva foto a sangre 960x494', /_cover\(ft, 960, 494\)/.test(z));
ok('cada unidad lleva DOS fotos de 304 x 540 (altura completa)', /_cover\(url, 304, 540\)/.test(z));
ok('en las posiciones del PPT (276 y 585)', /\(k === 0\) \? 276 : 585/.test(z));
ok('las fotos se dibujan desde y=0 (borde superior)', /addImage\(cc, 'JPEG', fx, 0, 304, 540\)/.test(z));
ok('ya no hay recuadros con borde alrededor de la foto', !/roundedRect\(x, y0/.test(z) && !/rect\(x, y0, imgW, imgH, 'S'\)/.test(z));

console.log('\n— 3. la foto LLENA sin deformarse —');
ok('existe el recorte tipo cover', /function _cover\(/.test(z) || /async function _cover/.test(z));
ok('escala por el MAYOR de los dos lados (llena, no encaja)', /Math\.max\(wPt \/ iw, hPt \/ ih\)/.test(z));
ok('centra el recorte', /\(cw - dw\) \/ 2, \(ch - dh\) \/ 2/.test(z));
ok('renderiza al doble para que no se pixele', /wPt \* 2/.test(z) && /hPt \* 2/.test(z));
ok('exporta como JPEG comprimido (el PDF pesa menos)', /toDataURL\('image\/jpeg', 0\.82\)/.test(z));
ok('si una foto falla no rompe el reporte', /catch\(e\)\{ console\.warn\('\[reporte\] no se pudo recortar/.test(z));

console.log('\n— 4. lo que ya estaba bien se conserva —');
ok('las SEIS etapas', /ETAPAS\.forEach/.test(z));
ok('la X en rojo del PPT', /ROJO\[0\],ROJO\[1\],ROJO\[2\]\);[\s\S]{0,60}text\('X'/.test(z));
ok('hoja separadora por torre', /torreImpresa/.test(z));
ok('el pasillo dice ÁREA COMÚN', /ÁREA COMÚN/.test(z));
ok('barra de progreso', /_prUploadShow/.test(z));
ok('guarda el reporte al final', /_repGuardar\(p, rep\)/.test(z));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
