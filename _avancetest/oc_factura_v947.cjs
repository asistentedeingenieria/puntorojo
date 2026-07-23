/* v947 (pedido de Antonio): en una OC AUTORIZADA, compras puede SUBIR LA FACTURA que
   genera el proveedor. Mismo patrón endurecido de anticipos v841:
   - archivo (foto/PDF) a Firebase Storage `oc-facturas/`, en la OC solo la URL + nombre
     + quién/cuándo (nada de base64 en el state — lección v880);
   - IRREVERSIBLE: subida una vez, solo un admin puede reemplazarla;
   - el modal lleva la clase pr-ant-modal → isUserBusy pospone applyRemote durante la
     subida (v841) + re-lectura del state vivo TRAS el await (regla v769/v940);
   - si otro dispositivo ganó la carrera, se respeta su factura y el archivo propio se
     borra best-effort. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. la tarjeta de OC autorizada ofrece la factura ──
const lst = extractFn('renderOrdenesList');
ok('botón SUBIR FACTURA en OCs autorizadas', /_ocAbrirSubirFactura\(/.test(lst) && /SUBIR FACTURA/.test(lst));
ok('con factura: link VER + reemplazo solo admin', /facturaUrl/.test(lst) && /REEMPLAZAR \(ADMIN\)/.test(lst));

// ── 2. modal de subida ──
const srcModal = extractFn('_ocAbrirSubirFactura');
ok('_ocAbrirSubirFactura existe con gate de compras/admin', /can\('compras\.autorizar'\)/.test(srcModal) && /can\('users\.manage'\)/.test(srcModal));
ok('el modal pospone el sync mientras está abierto (pr-ant-modal, v841)', /pr-ant-modal/.test(srcModal));
ok('acepta foto o PDF', /accept="image\/\*,application\/pdf"/.test(srcModal));
ok('avisa que es irreversible', /no se podrá modificar|solo un admin/i.test(srcModal));

// ── 3. subida endurecida ──
const srcSubir = extractFn('_ocSubirFactura');
ok('_ocSubirFactura existe', !!srcSubir);
ok('sube a Storage oc-facturas/ (solo URL en el state, lección v880)', /oc-facturas\//.test(srcSubir) && /getDownloadURL/.test(srcSubir));
ok('overlay de subida (patrón v842)', /_prUploadShow/.test(srcSubir) && /_prUploadHide/.test(srcSubir));
const iUrl = srcSubir.indexOf('getDownloadURL');
// v964: la re-lectura es GLOBAL (_bodegaFindOc: la OC puede vivir en el store de bodega)
ok('re-lee la OC del state vivo TRAS el await (regla v769/v940)', iUrl > -1 && srcSubir.indexOf('_bodegaFindOc(', iUrl) > iUrl);
ok('irreversible: con factura existente solo admin reemplaza', /facturaUrl/.test(srcSubir) && /users\.manage/.test(srcSubir));
ok('si otro ganó la carrera, borra el archivo propio best-effort', /refFromURL/.test(srcSubir));
ok('guarda quién y cuándo + sube al toque', /facturaSubidaPor/.test(srcSubir) && /forceUploadNow/.test(srcSubir));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
