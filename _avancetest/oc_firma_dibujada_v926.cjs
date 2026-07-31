/* v926 (4 pedidos de Antonio sobre el PDF de la OC):
   (1) "APP" al lado derecho del logo, centrado vertical, tamaño moderado.
   (2) Logo un poco más grande (48→62px).
   (3) El No. de arriba a la derecha ordenado en 3 líneas: proyecto / pedido / OC
       (_ocNumeroPartes, PURA).
   (4) FIRMA DIGITAL DIBUJADA: cada usuario dibuja su firma UNA vez (canvas, mouse o
       dedo) y queda en state.firmasUsuarios[username]; la usan el GENERADOR y el
       AUTORIZADOR en el PDF (fallback al texto cursivo si no la ha registrado).
       Botón MI FIRMA DIGITAL en el modal de OC + oferta automática al generar y
       al autorizar si falta (_pedirFirmaSiFalta). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('async function '+name+'('); if(m<0) m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const srcPrint = extractFn('printOrdenCompra');

// ── 1+2: encabezado ── (v948: el "APP" se movió al bloque del No.; el logo quedó solo)
ok('logo más grande (62px, flex centrado)', /display:flex;align-items:center[^>]*>\s*<img src="\$\{_LOGO_PR\}" style="height:62px/.test(srcPrint));

// ── 3: número en 3 líneas ──
const srcPartes = extractFn('_ocNumeroPartes');
ok('_ocNumeroPartes existe', !!srcPartes);
if (srcPartes) {
  // v997: _ocNumeroPartes limpia los ceros con _numLimpio — se inyecta la implementación real
  const f = new Function(extractFn('_numLimpio') + '\n' + srcPartes + '\nreturn _ocNumeroPartes;')();
  const r = f({ numero: 'VICINIA LAS AMÉRICAS – 00003 - OC01' });
  ok('separa proyecto / pedido / OC (v997: sin ceros)', r.proyecto === 'VICINIA LAS AMÉRICAS' && r.pedido === '3' && r.oc === 'OC 1');
  const d = f({ numero: 'VICINIA LAS AMÉRICAS – 00002 - DESP01' });
  ok('también para despachos (v997: sin ceros)', d.oc === 'DESP 1' && d.pedido === '2');
  const s = f({ numero: 'ALGO SIN FORMATO', proyecto: 'X' });
  ok('sin formato no revienta', typeof s.proyecto === 'string' && s.oc === '');
}
ok('el PDF usa las 3 líneas ordenadas', /_ocNumeroPartes\(oc\)/.test(srcPrint) || /_np\.proyecto/.test(srcPrint));

// ── 4: firma dibujada ──
const srcModal = extractFn('_abrirFirmaModal');
ok('modal de firma permite registrarla (v934: subiendo foto o PDF, ya sin canvas)', /accept="image\/\*,application\/pdf"/.test(srcModal));
const srcGuardar = extractFn('_firmaGuardar');
ok('la firma se guarda por usuario y sube a la nube', /firmasUsuarios/.test(srcGuardar) && /forceUploadNow/.test(srcGuardar));
const srcMi = extractFn('_miFirmaImg');
ok('_miFirmaImg existe', !!srcMi);
if (srcMi) {
  const f2 = new Function('var state={firmasUsuarios:{"ana":"data:image/png;base64,AAA"}};'
    + 'function getCurrentUser(){ return { username: "ANA" }; }\n' + srcMi + '\nreturn _miFirmaImg;')();
  ok('busca la firma por username (case-insensitive)', f2('ANA') === 'data:image/png;base64,AAA' && f2() === 'data:image/png;base64,AAA' && f2('otro') === '');
}
ok('botón MI FIRMA DIGITAL en el modal de OC', /MI FIRMA DIGITAL/.test(html) && /_abrirFirmaModal\(\)/.test(html));
ok('al generar ofrece registrar la firma si falta', /_pedirFirmaSiFalta\(\)/.test(extractFn('generarOrdenCompra')));
const srcAut = extractFn('autorizarOrden');
ok('al autorizar ofrece la firma y guarda el username', /_pedirFirmaSiFalta\(\)/.test(srcAut) && /autorizadoPorUsername/.test(srcAut));
ok('el PDF estampa la firma dibujada del generador (con fallback)', /_miFirmaImg\(oc\.generadoPorUsername\)/.test(srcPrint) && /firma-script/.test(srcPrint));
/* v1089: la resolución del username pasó a _firmaUsernameAutoriza (rescata los documentos
   viejos sin autorizadoPorUsername, sin poner nunca la firma de otra persona) */
ok('el PDF estampa la firma dibujada del autorizador (con fallback)', /_miFirmaImg\(_firmaUsernameAutoriza\(oc\)\)/.test(srcPrint));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
