/* v1039 — LAS FACTURAS DE LAS OC NO SE PIERDEN + la producción NO se factura.
   Antonio (29-jul, con fotos): "a la hora de subir las facturas de las ordenes de compra no
   se estan guardando y se eliminan" · "si aun es una orden de produccion NO debe de pedir
   subir factura. Solo a las ordenes de compra."

   CAUSA RAÍZ de la pérdida (misma clase que el incidente de COBRO del 18-jul, v953 — hasta
   las palabras del reporte son las mismas: "facturas subidas desaparecían al rato"):
   _mergeById gana por OBJETO ENTERO con el _ts más nuevo. Erlin sube la factura (sella _ts);
   otro dispositivo que AÚN no recibió esa factura toca la misma OC (marcar recibida,
   imprimir…) y sella un _ts más nuevo en su copia SIN factura → esa copia gana el merge
   completo y la factura desaparece de toda la flota. La subida en sí siempre estuvo bien.

   EL ESCUDO: la factura se sube UNA vez y no se modifica (solo un admin la reemplaza), así
   que "quien la tiene, gana" es seguro e idempotente (regla v856): tras cada merge de
   órdenes, si al ganador le falta facturaUrl y la otra copia la tiene, se le re-pega. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. el escudo, como función PURA —');
const zS = ex('function _ocFacturaShield(');
let shield = null;
try { shield = new Function('return (' + zS + ')')(); } catch(e){}
ok('existe', typeof shield === 'function');
if (shield) {
  const F = { facturaUrl:'https://x/f1.pdf', facturaNombre:'f1.pdf', facturaSubidaPor:'ERLIN', facturaSubidaEn:'29/07/2026' };
  /* el escenario del reporte: la copia SIN factura ganó el merge por _ts */
  const ganadorSin = { id:'oc1', _ts: 200 };
  const localCon = Object.assign({ id:'oc1', _ts: 100 }, F);
  ok('re-pega la factura local perdida', shield([ganadorSin], [localCon], []) === true && ganadorSin.facturaUrl === F.facturaUrl && ganadorSin.facturaSubidaPor === 'ERLIN');
  const ganadorSin2 = { id:'oc1', _ts: 200 };
  ok('también si la tenía la copia remota', shield([ganadorSin2], [], [localCon]) === true && ganadorSin2.facturaUrl === F.facturaUrl);
  /* reemplazo de admin: el ganador YA trae SU factura (más nueva) — no se le pisa con la vieja */
  const ganadorCon = { id:'oc1', _ts: 300, facturaUrl:'https://x/f2.pdf', facturaNombre:'f2.pdf' };
  ok('si el ganador ya tiene factura, se respeta la suya', shield([ganadorCon], [localCon], []) === false && ganadorCon.facturaUrl === 'https://x/f2.pdf');
  ok('sin factura en ningún lado, no inventa nada', shield([{ id:'oc2', _ts: 10 }], [{ id:'oc2', _ts: 5 }], []) === false);
  const dosVeces = { id:'oc1', _ts: 200 };
  shield([dosVeces], [localCon], []);
  ok('idempotente (regla v856): correrlo dos veces no cambia nada', shield([dosVeces], [localCon], []) === false);
} else { ['local','remota','respeta','no inventa','idempotente'].forEach(n => ok(n, false)); }

console.log('\n— 2. cablado en el merge de los TRES contenedores —');
/* proyecto (p.materiales.ordenes), bodega (state.bodegaMat) y varios (state.variosMat) */
ok('se aplica tras cada merge de órdenes', (html.match(/_ocFacturaShield\(/g) || []).length >= 4); // 3 llamadas + la definición
ok('en el de proyecto', /_ocFacturaShield\(_moc\.list/.test(html));
ok('en el de bodega', /_ocFacturaShield\(_mBo\.list/.test(html));
ok('en el de varios', /_ocFacturaShield\(_mVo\.list/.test(html));
ok('y marca resync para re-subir el rescate', /_ocFacturaShield\(_moc\.list[^)]*\)\) needsResync = true/.test(html) || /_ocFacturaShield\(_moc\.list[\s\S]{0,120}?needsResync = true/.test(html));

console.log('\n— 3. la producción NO se factura —');
/* la OP es un aviso al proveedor para fabricar — la factura va en la OC que nace de ella */
const zBtn = ex('function renderOrdenesList(');
/* v1068: el DPP tampoco se factura — la factura del pre-pago vive en la OC madre (mismo
   argumento que la OP: el documento que respalda el gasto real es otro) */
/* v1183: facturaBtn quedó envuelto en paréntesis (+ saldoBtn viaja pegado); la condición que
   importa —ni OP ni DPP— es la misma. Se ancla la CONDICIÓN, no el formato de la línea. */
ok('el botón SUBIR FACTURA no sale en las OP ni en los DPP', /facturaBtn = \(\(isAuth && canFactura && !oc\.facturaUrl && _ocSerieDe\(oc\) !== 'OP' && _ocSerieDe\(oc\) !== 'DPP'\)/.test(zBtn));
ok('abrir el modal en una OP se rechaza', /_ocSerieDe\(oc\) === 'OP'\) return showToast\('LA FACTURA VA EN LA ORDEN DE COMPRA/.test(ex('function _ocAbrirSubirFactura(')));
ok('y el subidor también (cinturón)', /_ocSerieDe\(oc\) === 'OP'/.test(ex('async function _ocSubirFactura(')));
/* si alguien alcanzó a subirle factura a una OP durante la ventana del bug, al derivar la OC
   la factura VIAJA con ella (Object.assign copia facturaUrl y nadie la pisa) */
const zDer = ex('window._ocDerivarDeOp = async function');
ok('derivar la OC rescata la factura de la OP', !/facturaUrl: null|facturaUrl: ''/.test(zDer) && /facturaUrl/.test(zDer));

console.log('\n— 4. la tarjeta de la OP, como la pidió Antonio —');
/* "lo que dice ESPERANDO PROVEEDOR quiero que esté en otro lado" → va con el estado (badge),
   no flotando junto al total; el botón queda en la columna de acciones, arriba de la ✕ */
ok('el estado de la OP vive junto al badge', /\$\{statusBadge\}\$\{autorizInfo\}\$\{_opEstado\}/.test(zBtn) || /_opEstado[\s\S]{0,200}?statusBadge|statusBadge\}[^`]{0,80}\$\{_opEstado\}/.test(zBtn));
ok('el botón quedó separado del rótulo', /_opBtn/.test(zBtn));
ok('en la columna: botón y abajo la ✕', /\$\{_opBtn\}\s*\$\{canDeleteOC/.test(zBtn));
ok('ya no está el bloque mezclado', !/\$\{_opBloque\}/.test(zBtn));

console.log('\n— 5. clientes viejos —');
/* el escudo vive en applyRemote: un cliente viejo sin él re-abre la ventana de pérdida */
/* v1058: la versión siguió subiendo (920 = blindaje de tomas) — lo que este test fija es
   que el escudo de factura exigió AL MENOS la 919, no el número exacto */
ok('APP_SYNC_VERSION subió a 919+', (parseInt((html.match(/APP_SYNC_VERSION = (\d+)/)||[])[1],10)||0) >= 919);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
