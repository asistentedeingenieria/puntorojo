/* v1019 — EL DESPACHO DE BODEGA SALÍA EN Q 0 (reporte de Antonio con foto).
   El match de nombre ya funcionaba (el item adoptaba "AGUA PURIFICADA GARRAFON", el nombre
   real de la bodega) pero el precio salía "—" y el total Q 0.00.

   CAUSA: _bodegaMov NUNCA guardó un campo precio. Los movimientos de ENTRADA solo llevan el
   ocId de la orden con que entró el material. Así que _precioEntradaBodega, que buscaba
   mov.precio, no encontraba nada NUNCA — ni con los movimientos históricos ni con los nuevos.
   Todo despacho valía 0, y un despacho en 0 falsea el gasto de la obra igual que una orden
   de compra en 0 (lo que ya se cerró en v1013). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. de ahora en adelante, la entrada sella su precio —');
const zE = ex('window._bodegaMovsEntradaDeOc = function');
/* v1161: el precio se DES-CONVIERTE cuando la línea vino en presentación (CIENTO/CAJA) —
   sin factor sigue siendo el de la línea, tal como fijó v1019. */
ok('la entrada guarda el precio de la línea (des-convertido si hay presentación)',
  /_mov\.precio = _fp > 1 \? \(\(Number\(it\.precio\) \|\| 0\) \/ _fp\) : \(Number\(it\.precio\) \|\| 0\)/.test(zE));

console.log('\n— 2. y para lo que ya entró, se busca en cascada —');
const zP = ex('function _precioEntradaBodega(');
ok('1) el precio sellado en el movimiento', /m\.precio/.test(zP));
ok('2) el de la orden con que entró', /ref && m\.ref\.ocId/.test(zP) && /_bodegaFindOc/.test(zP));
ok('3) el del catálogo como última aproximación', /_provsDelProducto/.test(zP));
ok('si nada da, devuelve 0 (no inventa un número)', /return 0;/.test(zP));
ok('toma la entrada MÁS RECIENTE', /sort\(/.test(zP));

let fP = null;
try {
  const MOVS = [
    { id:'m1', tipo:'ENTRADA', k:'AGUA', name:'AGUA', qty:10, ts:1, ref:{ ocId:'oc1' } },   // vieja, sin precio
    { id:'m2', tipo:'ENTRADA', k:'CLAVO', name:'CLAVO', qty:5, ts:2, precio:7.5, ref:{} },  // nueva, sellada
    { id:'m3', tipo:'ENTRADA', k:'SOLO', name:'SOLO EN CATALOGO', qty:1, ts:3, ref:{} },
  ];
  const OC1 = { id:'oc1', items:[{ name:'AGUA', qty:10, precio:21.4 }] };
  const ctx = {
    state: { bodegaMovs: MOVS },
    _bodegaFindOc: id => (id === 'oc1' ? { oc: OC1 } : null),
    _ocItemMemKey: s => String(s||'').toUpperCase().trim(),
    _provsDelProducto: n => (/SOLO/.test(n) ? [{ id:'p1', nombre:'X', precio: 99 }] : []),
  };
  fP = new Function(...Object.keys(ctx), 'return (' + zP + ')')(...Object.values(ctx));
} catch(e){ console.log('   (no evaluable: ' + e.message + ')'); }
if (fP) {
  ok('el sellado se usa tal cual', fP('CLAVO') === 7.5);
  ok('el histórico saca el precio de su orden de compra', fP('AGUA') === 21.4);
  ok('y si no hay orden, cae al catálogo', fP('SOLO') === 99);
  ok('un material que no está en bodega da 0', fP('NO EXISTE') === 0);
}

console.log('\n— 3. y se puede escribir a mano —');
/* si los movimientos viejos no tienen precio y la orden ya no existe, tiene que haber salida
   manual o el despacho sale en Q 0 igual */
const zU = ex('function updateOcPrecio(');
ok('el precio de un item de bodega es editable', /proveedorId !== '_bodega'/.test(zU));
ok('el input no nace bloqueado para bodega', /it\.proveedorId === '_bodega'/.test(html));
ok('lo del catálogo sigue con su candado (v923)', /PEDÍ EL CAMBIO POR SOLICITUD/.test(zU));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
