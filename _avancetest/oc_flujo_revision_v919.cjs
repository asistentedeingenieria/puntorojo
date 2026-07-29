/* v919 (flujo de revisión de OC — decisiones de Antonio):
   COMPRAS genera la OC (permiso compras.autorizar, relabel "generar y gestionar") →
   el REVISOR (permiso NUEVO compras.revisar) recibe aviso, revisa y AUTORIZA con
   SELLO DIGITAL automático (nombre + fecha/hora, sin prompt de texto) → a COMPRAS
   le llega el aviso de que ya puede imprimirla y pasarla al proveedor.
   SEPARACIÓN: quien generó la OC no puede autorizarla (admin exento) —
   generadoPorUsername real (muere el hardcode SUSANA MONROY). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('async function '+name+'('); if(m<0) m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. permiso nuevo + relabel ──
ok('permiso compras.revisar existe', /key: 'compras\.revisar'/.test(html));
ok('compras.autorizar relabeleado a generar/gestionar', /key: 'compras\.autorizar',\s*label: 'Generar y gestionar/.test(html));

// ── 2. la pestaña OC la ven compras Y el revisor ──
ok('applyPermissions soporta data-perm con | (cualquiera)', /split\('\|'\)/.test(extractFn('applyPermissions')));
/* v1040: la pestaña salió de la obra — el gate (compras.autorizar|compras.revisar|
   materiales.bodega) vive ahora en la barra de secciones de COMPRAS */
ok('tab ÓRDENES DE COMPRA visible para ambos', /compras\.autorizar'\)\s*\|\|\s*can\('compras\.revisar/.test((function(){ let m=html.indexOf('function _comprasBarraHTML('); let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; })()));

// ── 3. generar: usuario real + aviso al revisor ──
const srcGen = extractFn('generarOrdenCompra');
ok('generadoPor ya no es SUSANA MONROY hardcodeada', !/generadoPor: 'SUSANA MONROY'/.test(srcGen));
ok('la OC guarda quién la generó (username)', /generadoPorUsername/.test(srcGen));
ok('al generar avisa al REVISOR (compras.revisar)', /prAddNotif\(\{[\s\S]{0,80}toPerms: \['compras\.revisar'\]/.test(srcGen));

// ── 4. autorizar: gate nuevo + separación + sello + aviso a compras ──
const srcAut = extractFn('autorizarOrden');
ok('autorizar exige compras.revisar (o admin)', /can\('compras\.revisar'\)/.test(srcAut));
ok('quien generó NO puede autorizar la suya', /generadoPorUsername/.test(srcAut) && /OTRA PERSONA/.test(srcAut));
ok('el admin queda exento de la separación', /!can\('users\.manage'\)[\s\S]{0,200}generadoPorUsername/.test(srcAut));
ok('sello digital automático (sin prompt de texto)', !/prPrompt/.test(srcAut) && /selloDigital/.test(srcAut) && /AUTORIZADO DIGITALMENTE POR/.test(srcAut));
ok('el sello lleva fecha y hora', /getHours\(\)/.test(srcAut) && /getMinutes\(\)/.test(srcAut));
ok('al autorizar avisa a COMPRAS que la pase al proveedor', /prAddNotif\(\{[\s\S]{0,80}toPerms: \['compras\.autorizar'\]/.test(srcAut) && /proveedor/i.test(srcAut));

// ── 5. lista de OCs: botón AUTORIZAR solo para el revisor y nunca en OC propia ──
const srcList = extractFn('renderOrdenesList');
ok('canAuthorize usa el permiso del revisor', /canAuthorize = can\('compras\.revisar'\)/.test(srcList));
ok('OC propia bloquea el botón AUTORIZAR', /_ocPropia/.test(srcList) && /LA DEBE AUTORIZAR OTRA PERSONA|la debe autorizar otra persona/i.test(srcList));

// ── 6. el PDF muestra firmas reales + sello ──
const srcPrint = extractFn('printOrdenCompra');
ok('firma de compras = quien generó (no Susana hardcodeada)', !/<div class="firma-script">Susana Monroy<\/div>/.test(srcPrint) && /oc\.generadoPor/.test(srcPrint));
ok('firma del revisor = quien autorizó (no Erlin hardcodeada)', !/<div class="nombre">ERLIN KARINA TRIGUEROS<\/div>/.test(srcPrint));
ok('el PDF estampa el sello digital', /oc\.selloDigital/.test(srcPrint));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
