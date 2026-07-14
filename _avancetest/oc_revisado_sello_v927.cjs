/* v927 (pedido de Antonio con foto del sello físico de la empresa):
   (1) Al autorizar, el PDF estampa un SELLO ROJO "REVISADO" con la fecha (formato
       corto d-m-yy como el sello real) encima de la firma dibujada del revisor.
       Reemplaza al sello ✓AUTORIZADO de abajo.
   (2) Etiquetas de totales (OCs con IVA incluido): SUBTOTAL SIN IVA / IVA 12% /
       GRAN TOTAL (CON IVA).
   (3) Un pedido que YA tiene sus OC generadas NO genera más: el botón desaparece
       del detalle y openOrdenCompra bloquea duro (se eliminó el confirm de
       "OC adicionales"). Si se eliminan las OCs, el botón vuelve. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('async function '+name+'('); if(m<0) m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. sello REVISADO ──
const srcFecha = extractFn('_fechaSelloCorta');
ok('_fechaSelloCorta existe', !!srcFecha);
if (srcFecha) {
  const f = new Function(srcFecha + '\nreturn _fechaSelloCorta;')();
  ok('formato corto d-m-yy (13-7-26)', f(new Date(2026, 6, 13).getTime()) === '13-7-26');
}
const srcPrint = extractFn('printOrdenCompra');
ok('sello rojo REVISADO con fecha en el PDF', />REVISADO</.test(srcPrint) && /Fecha:/.test(srcPrint) && /_fechaSelloCorta\(oc\.autorizadoTs\)/.test(srcPrint));
ok('el sello viejo ✓AUTORIZADO de abajo se fue', !/<div class="oc-auth-seal-bottom">/.test(srcPrint));

// ── 2. etiquetas de totales ──
ok('SUBTOTAL SIN IVA (sin paréntesis)', /SUBTOTAL\$\{oc\.ivaIncluido \? ' SIN IVA' : ''\}/.test(srcPrint));
ok('IVA 12% sin sufijo', !/IVA 12%\$\{oc\.ivaIncluido \? ' \(INCLUIDO\)'/.test(srcPrint));
ok('GRAN TOTAL (CON IVA)', /GRAN TOTAL \(CON IVA\)/.test(srcPrint));

// ── 3. no más OCs cuando ya están generadas ──
const srcDet = extractFn('openPedidoDetalle');
ok('el botón GENERAR OC se oculta si ya hay OCs', /_yaTieneOcs/.test(srcDet) && /getPedidoOrdenes/.test(srcDet));
const srcOpen = extractFn('openOrdenCompra');
ok('openOrdenCompra bloquea duro con OCs existentes', /YA TIENE SUS ÓRDENES GENERADAS/.test(srcOpen));
ok('se eliminó el confirm de OC adicionales', !/_okOcAdd/.test(srcOpen));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
