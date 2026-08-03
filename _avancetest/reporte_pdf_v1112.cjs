/* v1112 — VISTA PREVIA Y PDF DEL REPORTE SEMANAL (cierra v1108/v1109/v1110).
   Es la parte que Antonio ve y descarga. La vista previa NO es adorno: automatizar el reporte
   quita el filtro humano que hoy hace la persona que lo arma a mano, así que antes de mandarlo
   al cliente tiene que poder mirarlo. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. la puerta de entrada —');
ok('hay botón REPORTE SEMANAL en AVANCE FÍSICO', /_repAbrir\(\)/.test(html) && />REPORTE SEMANAL</.test(html));
/* el comentario que explica el botón va en medio, por eso la ventana es amplia */
ok('vive junto a las sub-pestañas de avance', /data-avancetab="cuadritos"[\s\S]{0,900}_repAbrir/.test(html));

console.log('\n— 2. propone la semana correcta —');
const zS = ex('window._repSemanaSugerida = function(');
ok('existe _repSemanaSugerida', zS.length > 80);
let sug = null; try { sug = new Function('REP_SEMANA_ANCLA', 'return (' + zS + ')')({ n:36, lunes:'2026-08-03' }); } catch(e){}
if (sug) {
  ok('sin reportes previos propone la del ancla (36)', sug({}) === 36);
  ok('con la 36 emitida propone la 37', sug({ reportesSemanales:[{semana:36}] }) === 37);
  ok('toma la MAYOR emitida, no la última del array',
    sug({ reportesSemanales:[{semana:38},{semana:36}] }) === 39);
  ok('sin proyecto no revienta', sug(null) === 36);
}

console.log('\n— 3. la vista previa muestra lo que importa —');
const zR = ex('window._repRender = function(');
ok('existe la vista previa', zR.length > 500);
ok('deja cambiar la semana', /_repSemanaSel/.test(zR));
ok('avisa si esa semana YA se emitió', /YA EMITIDA/.test(zR));
ok('separa avance nuevo de repetido', /CON AVANCE NUEVO/.test(zR) && /REPETIDAS/.test(zR));
ok('marca las que quedarían SIN FOTO', /SIN FOTO/.test(zR));
ok('agrupa por torre y nivel como el PDF', /f\.torre/.test(zR) && /f\.nivel/.test(zR));
ok('escapa lo que pinta', /_e\(/.test(zR));

console.log('\n— 4. el PDF —');
const zP = ex('window._repGenerarPDF = async function(');
ok('existe el generador', zP.length > 800);
ok('portada con REPORTE FOTOGRÁFICO y la semana', /REPORTE/.test(zP) && /FOTOGRÁFICO/.test(zP) && /SEMANA/.test(zP));
ok('una página por unidad', /addPage\(\)/.test(zP));
ok('mete las DOS fotos', /f\.fotos\[k\]/.test(zP) && /k < 2/.test(zP));
ok('reusa el cargador con fallback de CORS de Storage', /_amCargarImagen\(/.test(zP));
ok('respeta la proporción de la foto (no la deforma)', /Math\.min\(imgW/.test(zP));
ok('la tabla lleva las SEIS etapas', /ETAPAS\.forEach/.test(zP));
ok('la X sale de las marcas', /f\.marcas\[idx\]/.test(zP));
ok('tiene fila ENTREGADO', /ENTREGADO/.test(zP));
ok('avisa cuando la foto es repetida de la semana pasada', /SIN AVANCE ESTA SEMANA/.test(zP));
ok('muestra progreso (son más de cien imágenes)', /_prUploadShow/.test(zP));
ok('y lo apaga al terminar', /_prUploadHide/.test(zP));

console.log('\n— 5. el reporte se guarda SOLO si se generó —');
ok('guarda al final, no al abrir la vista previa', zP.indexOf('_repGuardar') > zP.indexOf('addPage'));
ok('si no hay filas no genera nada', /NO HAY NADA QUE REPORTAR/.test(zP));
ok('si falta el generador de PDF avisa', /NO CARGÓ EL GENERADOR/.test(zP));

console.log('\n— 6. el nombre del archivo lo identifica —');
ok('el archivo dice semana y obra', /Reporte Semana/.test(zP) && /p\.name/.test(zP));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
