/* v920 (pedido de Antonio con print de la hoja de pedido): en las hojas impresas de
   PEDIDO y de ORDEN DE COMPRA, en vez del texto "PUNTO ROJO" va el LOGO.
   Como esas hojas se abren en una ventana about:blank (sin base URL ni cache del SW),
   el logo va INCRUSTADO como data-URI (const _LOGO_PR, generado de logo.png). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. el logo incrustado ──
const m = html.match(/const _LOGO_PR = 'data:image\/png;base64,([A-Za-z0-9+/=]+)'/);
ok('const _LOGO_PR existe como data-URI', !!m);
if (m) {
  ok('el base64 es un PNG real (magic number)', m[1].startsWith('iVBOR'));
  const bytes = Buffer.from(m[1], 'base64');
  const disk = fs.readFileSync(path.join(__dirname, '..', 'logo.png'));
  ok('el data-URI es EXACTAMENTE logo.png del repo', bytes.equals(disk));
}

// ── 2. hoja de PEDIDO: logo en vez del texto ──
const srcPed = extractFn('_solicitudDocHTML') /* v980: el doc vive en el builder */;
ok('printPedido ya no dice PUNTO ROJO en texto', !/PUNTO<br>ROJO/.test(srcPed));
/* v1236 (Antonio): el logo SALIO de los pedidos — solo la OC lo conserva */
ok('v1236: la solicitud va SIN logo', !/_LOGO_PR/.test(srcPed));

// ── 3. ORDEN DE COMPRA: logo en el encabezado (impresión y borrador comparten plantilla) ──
const srcOc = extractFn('printOrdenCompra');
ok('printOrdenCompra usa el logo incrustado', /\$\{_LOGO_PR\}/.test(srcOc));
ok('el logo va en el encabezado de la OC (columna izquierda del oc-hd)', /oc-hd[\s\S]{0,200}_LOGO_PR/.test(srcOc));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
