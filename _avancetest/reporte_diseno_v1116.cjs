/* v1116 — DOS PEDIDOS DE ANTONIO:

   (A) "quiero que lo adaptes para que vea las 6 pero quiero que esté ya con el mismo diseño
   que manejamos". El PDF se rediseña con la paleta y la estructura REALES del PowerPoint que
   manda hoy (Semana 07), medidas del archivo: rojo C00000 de acento, BFBFBF para las líneas,
   A5A5A5 para el texto secundario, sobre fondo BLANCO. Antes lo había hecho azul oscuro, que
   no es lo que el cliente recibe. La estructura también: portada, HOJA SEPARADORA POR TORRE, y
   una hoja por unidad con el número grande + la palabra APARTAMENTO debajo.
   La tabla lleva las SEIS etapas (no las cuatro del PPT) porque Antonio lo pidió explícito.

   (B) "quiero poder seleccionar a la persona que va a poder subir comprobantes de
   transferencias, porque esto no lo puede hacer la de compras". Permiso propio
   anticipos.transferir: el comprobante del banco lo sube quien maneja la plata, no compras. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zP = ex('window._repGenerarPDF = async function(');
ok('existe el generador del PDF', zP.length > 800);

console.log('\n— A1. la paleta real del PowerPoint —');
ok('rojo C00000 (192,0,0) como acento', /var ROJO = \[192,0,0\]/.test(zP));
ok('gris BFBFBF (191) para las líneas', /GRIS = \[191,191,191\]/.test(zP));
ok('gris A5A5A5 (165) para texto secundario', /GRIS2 = \[165,165,165\]/.test(zP));
ok('ya NO usa el azul oscuro de antes en la portada', !/setFillColor\(15,23,42\); doc\.rect\(0,0,W,H/.test(zP));

console.log('\n— A2. la estructura del PPT —');
ok('portada con REPORTE / FOTOGRÁFICO', /'REPORTE'/.test(zP) && /'FOTOGRÁFICO'/.test(zP));
ok('la semana con dos dígitos, como el PPT (SEMANA 07)', /padStart\(2,'0'\)/.test(zP));
ok('HOJA SEPARADORA por torre', /torreImpresa/.test(zP));
ok('la separadora solo sale cuando cambia la torre', /f\.torre !== torreImpresa/.test(zP));
/* v1117: el cuerpo pasó a las medidas reales del PPT (960x540) y el número quedó en 34pt */
ok('el número de unidad va grande y APARTAMENTO debajo', /'APARTAMENTO'/.test(zP) && /setFontSize\(34\)/.test(zP));
ok('el pasillo no dice APARTAMENTO', /PASILLO/i.test(zP) && /ÁREA COMÚN/.test(zP));

console.log('\n— A3. la tabla: SEIS etapas con el diseño del PPT —');
ok('encabezado Actividad / Avance', /'Actividad'/.test(zP) && /'Avance'/.test(zP));
ok('recorre las 6 etapas de la app', /ETAPAS\.forEach/.test(zP));
ok('la X va en rojo', /setTextColor\(ROJO\[0\],ROJO\[1\],ROJO\[2\]\);[\s\S]{0,80}text\('X'/.test(zP));
ok('fila Entregado', /'Entregado'/.test(zP));
ok('los recuadros de foto usan el gris del PPT, sin esquinas redondeadas', /setDrawColor\(GRIS\[0\]/.test(zP) && !/roundedRect\(x, y0/.test(zP));

console.log('\n— B. el comprobante lo sube quien Antonio elija —');
ok('existe el permiso anticipos.transferir', /key: 'anticipos\.transferir'/.test(html));
ok('está en el grupo de permisos de personal', /anticipos\.transferir'[\s\S]{0,140}EDICIÓN PERSONAL/.test(html));
ok('el botón de comprobante está gateado', /_puedeSubirDoc/.test(html));
ok('el gate SOLO aplica al efectivo (la factura normal no cambia)',
  /_esEf \? \(_antSolicPerm\('anticipos\.transferir'\) \|\| _antEsAdmin\(\)\) : true/.test(html));
ok('el admin siempre puede', /_antEsAdmin\(\)\) : true/.test(html));
ok('si no tiene permiso, ve que se está esperando el comprobante', /ESPERANDO EL COMPROBANTE/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
