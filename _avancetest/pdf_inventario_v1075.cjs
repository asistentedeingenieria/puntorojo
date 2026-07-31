/* v1075 — PDF DE INVENTARIO (Antonio, 30-jul, con las 3 fotos del PDF de TORELO):
   1. "si una hoja se llena quiero que la próxima hoja sea el comienzo de lo que sigue y NO
      como lo tienes ahorita que tienes que poner dos títulos, uno al final de otra hoja y
      el otro al principio" → la tabla que no cabe arranca en la hoja siguiente, entera.
   2. "la firma se vea mejor y no tan apachada" → más aire alrededor del bloque de firma.
   3. "los totales tengan más lógica... talvez quitamos ese total y solo dejamos un total
      general" (decisión confirmada) → fuera la fila TOTAL NIVEL; cada tabla ya muestra su
      total en el encabezado y al final va UN solo TOTAL GENERAL. Así bodega y torres
      quedan parejas (bodega nunca tuvo total por nivel: no tiene niveles). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const z = ex('function _invReporteDoc(') || ex('function _invReportePDF(') || ex('function _invReporte(');
ok('se encuentra el generador del PDF', z.length > 1500 && /autoTable/.test(z));

console.log('\n— 1. una tabla no se parte dejando el título huérfano —');
/* v1088: el salto lo decide _invSaltoTabla segun el alto REAL (Antonio: 'no el comienzo y
   la hoja en blanco') — corta salta junta, larga fluye. */
ok('la tabla de BODEGA usa el salto condicional', /content: 'BODEGA'[\s\S]{0,1200}pageBreak: _invSaltoTabla\(/.test(z));
/* v1079: el nombre de la torre pasa por _invEncCorto (espacio duro: "TORRE 3" en una línea) */
ok('la tabla de cada TORRE también', /content: _invEncCorto\(T\.nombre\)[\s\S]{0,1200}pageBreak: _invSaltoTabla\(/.test(z));
ok('y ninguna fila se corta a la mitad', (z.match(/rowPageBreak: 'avoid'/g) || []).length >= 2);

console.log('\n— 2. la fila TOTAL NIVEL se fue: un solo TOTAL GENERAL —');
ok('ya no se dibuja la fila TOTAL NIVEL', !/'TOTAL NIVEL'/.test(z));
ok('el body de la torre son solo los materiales', /body: filas,/.test(z) && !/filas\.concat\(\[totalFila\]\)/.test(z));
ok('cada tabla sigue mostrando su total en el encabezado', /content: money\(subB\)/.test(z) && /content: money\(subT\)/.test(z));
ok('el TOTAL GENERAL sigue ahí', /TOTAL GENERAL/.test(z) && /money\(totalGeneral\)/.test(z));

console.log('\n— 3. la firma con aire —');
const iF = z.indexOf('toma.cerradoFirma');
const zF = iF > -1 ? z.slice(iF - 200, iF + 700) : '';
ok('el bloque de firma arranca más abajo', /var yF = y \+ (1[1-9]\d|[2-9]\d\d)/.test(zF));
ok('la firma es más grande y deja espacio antes de la línea', /addImage\(toma\.cerradoFirma, 'JPEG', M, yF, 1[5-9]\d, (4[8-9]|[5-9]\d)/.test(zF) && /yF \+= (5[5-9]|6\d)/.test(zF));
ok('el nombre y el rol respiran bajo la línea', /yF \+ 1[4-9]\)/.test(zF) && /yF \+ 2[6-9]\)/.test(zF));
ok('el guard de página nueva creció con el bloque', /y \+ (19\d|2\d\d) > H/.test(z));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
