/* v934 (pedido de Antonio con el print del borrador de OC):
   (1) La firma digital se registra subiendo una FOTO o un PDF (se toma la primera
       página) — se ELIMINA el canvas de dibujo (decisión: "Solo foto o PDF").
       El archivo se recorta al trazo (_firmaRecortarBlanco), se escala (_firmaEscala,
       pura) y se comprime a JPEG con tope de tamaño (firmasUsuarios viaja en el CORE
       — lección v880: nada de dataURLs gordos).
   (2) UNA ÚNICA VEZ: registrada la firma, el usuario ya no puede cambiarla; solo un
       admin (users.manage) la borra desde USUARIOS para que la vuelva a subir.
   (3) En la hoja impresa la firma sale MÁS GRANDE (38px -> 52px) siempre sobre su
       línea (la línea es elemento propio desde v929, no se invade). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. _firmaEscala (pura): ajuste con aspecto, sin agrandar ──
const srcEsc = extractFn('_firmaEscala');
ok('_firmaEscala existe', !!srcEsc);
if (srcEsc) {
  const fn = new Function('return ' + srcEsc)();
  ok('reduce manteniendo aspecto', JSON.stringify(fn(1400, 440, 700, 220)) === JSON.stringify({ w: 700, h: 220 }));
  ok('limita por el lado que toque', JSON.stringify(fn(4000, 1000, 700, 220)) === JSON.stringify({ w: 700, h: 175 }));
  ok('NO agranda una imagen chica', JSON.stringify(fn(300, 100, 700, 220)) === JSON.stringify({ w: 300, h: 100 }));
}

// ── 2. pipeline foto/PDF ──
const srcProc = extractFn('_firmaProcesarArchivo');
ok('_firmaProcesarArchivo existe', !!srcProc);
ok('PDF: primera página vía pdf.js perezoso', /_cargarPdfJs\(\)/.test(srcProc) && /getDocument/.test(srcProc) && /getPage\(1\)/.test(srcProc));
ok('foto: se carga como imagen', /new Image\(\)/.test(srcProc) && /createObjectURL/.test(srcProc));
ok('recorta el blanco alrededor del trazo', /_firmaRecortarBlanco\(/.test(srcProc));
ok('escala con la función pura', /_firmaEscala\(/.test(srcProc));
ok('comprime a JPEG con tope de tamaño (lección v880)', /toDataURL\('image\/jpeg'/.test(srcProc) && /length > 2\d{5}/.test(srcProc));
const srcRec = extractFn('_firmaRecortarBlanco');
ok('_firmaRecortarBlanco escanea píxeles (getImageData)', /getImageData/.test(srcRec));

// ── 3. modal: subir archivo, sin canvas de dibujo, única vez ──
const srcModal = extractFn('_abrirFirmaModal');
ok('el modal acepta foto o PDF', /accept="image\/\*,application\/pdf"/.test(srcModal));
ok('ya NO hay canvas de dibujo', srcModal.indexOf('_firmaCanvas') === -1 && html.indexOf('_firmaTrazo') === -1);
ok('con firma registrada muestra aviso y NO deja subir otra', /YA ESTÁ REGISTRADA/.test(srcModal));
const srcGuardar = extractFn('_firmaGuardar');
ok('_firmaGuardar guarda lo procesado del archivo', /_firmaDataLista/.test(srcGuardar));
ok('guard duro de ÚNICA VEZ en el guardado', /YA ESTÁ REGISTRADA/.test(srcGuardar));

// ── 4. admin borra desde USUARIOS ──
const srcUsers = extractFn('renderUsersList');
ok('fila de usuario ofrece BORRAR FIRMA', /_adminBorrarFirma\(/.test(srcUsers) && /BORRAR FIRMA/.test(srcUsers));
const srcBorrar = extractFn('_adminBorrarFirma');
ok('_adminBorrarFirma existe y está gateada a admin', /can\('users\.manage'\)/.test(srcBorrar));
ok('pide confirmación y borra del state', /prConfirm/.test(srcBorrar) && /delete state\.firmasUsuarios\[/.test(srcBorrar));
ok('sube al toque (plata/documentos: forceUploadNow)', /forceUploadNow/.test(srcBorrar));

// ── 5. firma más grande en la hoja, respetando la línea ──
const srcPrint = extractFn('printOrdenCompra');
ok('firma más grande que la v929 (38px) en ambas columnas', (srcPrint.match(/height:\d+px;max-width:2\d\dpx;object-fit:contain/g) || []).length >= 2);
ok('ya no queda la de 38px', srcPrint.indexOf('height:38px') === -1);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
