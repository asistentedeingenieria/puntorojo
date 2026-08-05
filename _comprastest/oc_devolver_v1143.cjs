/* v1143 — FINANZAS DEVUELVE LA ORDEN A COMPRAS, CON OBSERVACIÓN OBLIGATORIA

   Antonio (5-ago, con la captura de compras: "acá no me di cuenta que no le cambié que es
   despacho de bodega y no al proveedor"):
   "Necesito que la persona que autoriza las órdenes de compra de finanzas tenga la opción de
    devolverle a la de compras la orden si hay algo que está mal... pero que OBLIGUE a la
    persona de finanzas poner una observación para que la de compras sepa qué es lo que tiene
    que cambiar."

   HOY finanzas solo puede autorizar o dejar la orden en el limbo: no hay forma de decirle a
   compras "esto está mal, corregilo" dentro de la app — se avisan por WhatsApp (la captura).

   EL FLUJO NUEVO:
     PENDIENTE_AUTORIZACION --[DEVOLVER + motivo obligatorio]--> DEVUELTA
     DEVUELTA --[compras EDITA y re-genera]--> PENDIENTE_AUTORIZACION (ciclo completo)
   · La observación es OBLIGATORIA: sin texto no se devuelve nada y se avisa en rojo.
   · La devuelta NO se puede autorizar (ni por carrera): guard en autorizarOrden, en los DOS
     lados del await — hoy solo corta si ya está AUTORIZADA, una DEVUELTA pasaría.
   · Compras la ve ARRIBA con aviso rojo y el MOTIVO visible, y puede corregirla con el mismo
     botón EDITAR de siempre (_ocEditarBorrador acepta DEVUELTA además de PENDIENTE).
   · Se notifica a compras por la campanita (prAddNotif, regla v1070) con el motivo.
   · Es plata/documentos: sella _ts (union-merge v972) y sube con forceUploadNow. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— la acción de devolver —');
const zD = ex(code, 'window._ocDevolver = async function(');
ok('existe la acción', zD.length > 500);
ok('el gate es el de finanzas (quien autoriza, devuelve)', /compras\.revisar/.test(zD) && /users\.manage/.test(zD));
ok('solo una PENDIENTE se puede devolver', /PENDIENTE_AUTORIZACION/.test(zD));

console.log('\n— la observación es OBLIGATORIA —');
ok('el modal trae el campo del motivo', /textarea|_ocDevForm\.motivo/.test(zD));
ok('capturado por oninput (prConfirm destruye el modal antes del await)', /_ocDevForm\.motivo = this\.value/.test(zD));
ok('sin motivo NO se devuelve y se avisa en rojo',
  /ESCRIBÍ LA OBSERVACIÓN[\s\S]{0,60}'red'[\s\S]{0,40}return|return[\s\S]{0,120}ESCRIBÍ LA OBSERVACIÓN/.test(zD)
  || /!_motivo[\s\S]{0,200}'red'\);\s*return/.test(zD) || /!_motivo[\s\S]{0,220}return/.test(zD));

console.log('\n— lo que escribe —');
ok('re-lee del state vivo tras el modal (patrón v769/v940)',
  zD.indexOf('_bodegaFindOc') !== zD.lastIndexOf('_bodegaFindOc'));
ok('el estado queda DEVUELTA', /status = 'DEVUELTA'/.test(zD));
ok('guarda motivo, quién y cuándo', /devolucion\s*=\s*\{/.test(zD) && /motivo/.test(zD) && /por:/.test(zD) && /ts:/.test(zD));
ok('sella _ts (union-merge v972)', /const _t = Date\.now\(\)/.test(zD) && /\._ts = _t/.test(zD));
ok('sube de inmediato (es el circuito de plata)', /forceUploadNow/.test(zD));
ok('notifica a compras por la campanita con el motivo', /prAddNotif/.test(zD) && /compras\.autorizar/.test(zD));
ok('deja rastro en el log', /logActivity/.test(zD));

console.log('\n— la devuelta NO se puede autorizar (ni por carrera) —');
const zA = ex(code, 'async function autorizarOrden(');
ok('autorizarOrden corta con una DEVUELTA', (zA.match(/DEVUELTA/g) || []).length >= 2);
ok('con aviso, no en silencio', /DEVUELTA A COMPRAS|FUE DEVUELTA/.test(zA));

console.log('\n— compras la ve y la corrige —');
const zR = ex(code, 'function renderOrdenesList(');
ok('el botón DEVOLVER está junto a AUTORIZAR (mismo gate)', /_ocDevolver\(/.test(zR));
ok('la fila marca DEVUELTA con su propio aviso', /DEVUELTA/.test(zR));
ok('el motivo se pinta en la fila', /devolucion[\s\S]{0,200}motivo/.test(zR));
ok('la devuelta va ARRIBA, no al historial',
  /(PENDIENTE_AUTORIZACION|DEVUELTA)[^\n]*\|\|[^\n]*(DEVUELTA|PENDIENTE_AUTORIZACION)[\s\S]{0,120}_ocPend/.test(zR));

const zE = ex(code, 'window._ocEditarBorrador = async function(');
ok('EDITAR acepta la devuelta (antes del modal)', (zE.match(/DEVUELTA/g) || []).length >= 2);
ok('y muestra el motivo a compras al corregir', /devolucion[\s\S]{0,220}motivo/.test(zE));

console.log('\n— lo que no cambia —');
ok('la orden re-generada nace PENDIENTE (el ciclo se cierra solo)', /status: 'PENDIENTE_AUTORIZACION'/.test(code));
ok('una CANCELADA sigue siendo otra cosa', /CANCELADA/.test(code));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
