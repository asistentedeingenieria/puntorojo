/* v997 (pedido de Antonio 27-jul): hizo un pedido manual con "SELLADOR MULTIFUNCIONAL" y la
   OC salió con ese nombre genérico. En el Excel DATOS_COMPRAS ese material son CUATRO
   productos distintos con precios distintos:
     SELLADOR MULTIFUNCIONAL 2000 BLANCO CUBETA        Q 475.00
     SELLADOR MULTIFUNCIONAL 4000 BLANCO CUBETA        Q 550.00
     SELLADOR MULTIFUNCIONAL 4000 ENTINTADO P2 CUBETA  Q 550.00
     SELLADOR MULTIFUNCIONAL 4000 MATE BLANCO          Q 672.10

   _ncDeCompra solo renombra cuando el grupo tiene UNA sola compra (v968), así que con
   variantes la OC se le mandaba al proveedor con la descripción genérica y un precio que
   podía no corresponder al producto real.

   FIX: cuando el material tiene varias variantes, la OC deja ELEGIRLA (como el proveedor).
   Al elegir se corrige el nombre Y el precio, y la elección se recuerda para la próxima. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
function grab(name){ const i=html.indexOf('const '+name+' = ['); if(i<0) return null; let d=0,j=html.indexOf('[',i);
  for(let k=j;k<html.length;k++){ if(html[k]==='[')d++; else if(html[k]===']'){ d--; if(!d) return html.slice(j,k+1); } } return null; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── el catálogo del Excel sigue teniendo las variantes ──
let CC = null;
try { CC = eval(grab('CATALOGO_COMPRAS')); } catch(e){}
ok('CATALOGO_COMPRAS cargado', Array.isArray(CC) && CC.length > 100);
const sell = (CC || []).find(g => /^SELLADOR MULTIFUNCIONAL$/i.test(g.interno || ''));
ok('el sellador tiene sus 4 variantes', sell && (sell.compras || []).length === 4);

// ── _variantesDeCompra (PURA) ──
const zV = ex('function _variantesDeCompra(');
ok('existe _variantesDeCompra', !!zV);
let fV = null;
try {
  fV = new Function('CATALOGO_COMPRAS', '_ocItemMemKey', 'return (' + zV + ')')(
    CC,
    n => String(n || '').toUpperCase().replace(/\s+/g, ' ').trim()
  );
} catch(e){}
if (fV) {
  const vs = fV('SELLADOR MULTIFUNCIONAL');
  ok('devuelve las 4 variantes del sellador', vs.length === 4 && vs[0] === 'SELLADOR MULTIFUNCIONAL 2000 BLANCO CUBETA');
  ok('un material con una sola compra NO ofrece variantes', fV('CANAL DE 2 ½" X 10\' (0.35) CAL. 26').length === 0);
  ok('un material que no está en el Excel tampoco', fV('MATERIAL QUE NO EXISTE').length === 0);
  ok('nombre vacío no rompe', fV('').length === 0 && fV(null).length === 0);
}

// ── las variantes llegan al modal de la OC ──
const zB = ex('function buildPedidoOcItems(');
ok('el ítem lleva sus variantes', /variantes/.test(zB));
ok('el selector de variante se pinta en la fila', /data-ocvar=/.test(html));
ok('solo aparece cuando hay más de una', /it\.variantes && it\.variantes\.length > 1/.test(html));

// ── al elegir, cambia nombre Y precio ──
const zU = ex('window.updateOcItemVariante = function');
ok('existe updateOcItemVariante', !!zU);
ok('cambia el nombre del ítem', /\.name = /.test(zU));
ok('re-resuelve el precio con el nombre elegido', /findBestProviderForItem\(/.test(zU));
ok('repinta la lista de items', /renderOcItems\(\)|_ocRenderItems\(\)/.test(zU));

// ── avisa si se va a generar sin elegir ──
const zG = ex('async function generarOrdenCompra(');
ok('avisa cuando falta elegir la presentación', /FALTA ELEGIR LA PRESENTACIÓN/.test(zG));
ok('el aviso no bloquea (se puede generar igual)', /GENERAR IGUAL/.test(zG) && /if \(!_okSinVar\) return;/.test(zG));
ok('el chequeo mira solo los que tienen varias y ninguna elegida', /it\.variantes && it\.variantes\.length > 1 && !it\.variante/.test(zG));

// ── se recuerda la elección ──
ok('la variante elegida se guarda para la próxima', /ocVariantePorItem/.test(html));
ok('y se aplica al armar los items', /ocVariantePorItem/.test(zB) || /_varianteRecordada/.test(zB));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
