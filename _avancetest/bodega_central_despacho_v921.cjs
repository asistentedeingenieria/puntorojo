/* v921 (materiales que salen de la oficina/bodega central — decisiones de Antonio):
   (1) BODEGA CENTRAL como origen en la pantalla de OC (id reservado '_bodega', no vive
       en el catálogo de proveedores): los materiales asignados ahí salen como
       ORDEN DE DESPACHO (numero "- DESP##", oc.esDespacho=true) en vez de OC.
       El despacho SÍ pasa por el revisor (visto bueno + firma) como cualquier OC.
       La memoria v916/v918 recuerda '_bodega' y lo pre-asigna la próxima vez.
   (2) El PDF del despacho: título ORDEN DE DESPACHO, sin precios/IVA/total en letras/
       forma de pago (solo producto y cantidad); firmas y sello igual que la OC.
   (3) Compra AL POR MAYOR: en + NUEVO PEDIDO, destino "OFICINA CENTRAL — ABASTECIMIENTO"
       (sin torre/nivel/apto); su OC va al proveedor real y ENTREGAR A auto-selecciona
       la dirección de oficina. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('async function '+name+'('); if(m<0) m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. BODEGA CENTRAL como origen en la OC ──
const srcOpts = extractFn('buildOcProviderOptions');
ok('el select por material ofrece BODEGA CENTRAL', /_bodega/.test(srcOpts) && /BODEGA CENTRAL/.test(srcOpts));
const srcApply = extractFn('applyOcProveedor');
ok('el selector rápido soporta BODEGA CENTRAL', /_bodega/.test(srcApply) && /ORDEN DE DESPACHO/.test(srcApply));
const srcAuto = extractFn('autoAssignOcProviders');
ok('la memoria pre-asigna _bodega sin buscarlo en el catálogo', /_provId === '_bodega'/.test(srcAuto));
ok('renderOcItems agrupa como BODEGA CENTRAL', /_bodega/.test(extractFn('renderOcItems')));

// ── 2. generar: grupo _bodega → ORDEN DE DESPACHO ──
const srcGen = extractFn('generarOrdenCompra');
ok('el grupo _bodega NO se salta (proveedor sintético)', /esBodega/.test(srcGen) && /BODEGA CENTRAL/.test(srcGen));
ok('el despacho se numera DESP##', /DESP/.test(srcGen));
ok('la orden queda marcada esDespacho', /esDespacho: esBodega/.test(srcGen));
ok('items de bodega no exigen precio', /it\.proveedorId !== '_bodega'/.test(srcGen));

// ── 3. PDF de despacho sin dinero ──
const srcPrint = extractFn('printOrdenCompra');
ok('printOrdenCompra distingue despachos', /esDespacho/.test(srcPrint));
ok('título ORDEN DE DESPACHO', /ORDEN DE DESPACHO/.test(srcPrint));
ok('sin columnas de dinero en despacho', /esDespacho \? ''/.test(srcPrint) || /\$\{esDespacho \?/.test(srcPrint));

// ── 4. pedido AL POR MAYOR a OFICINA CENTRAL ──
ok('opción OFICINA CENTRAL en el form de pedido', /<option value="OFICINA">OFICINA CENTRAL — ABASTECIMIENTO<\/option>/.test(html));
const srcToggle = extractFn('togglePedidoProyectoManual');
ok('OFICINA oculta torre/nivel/apto', /OFICINA/.test(srcToggle));
const srcSubmit = extractFn('submitPedido');
ok('el pedido queda a nombre de OFICINA CENTRAL', /proyectoTipo === 'OFICINA'/.test(srcSubmit) && /OFICINA CENTRAL — ABASTECIMIENTO/.test(srcSubmit));
const srcOpen = extractFn('openOrdenCompra');
ok('ENTREGAR A: pedido de oficina matchea la dirección de OFICINA', /_esOficina/.test(srcOpen));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
