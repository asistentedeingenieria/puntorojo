/* v1145 — PARTIR LA LÍNEA ENTRE BODEGA CENTRAL Y COMPRA

   Antonio (5-ago): "tengo algunos materiales en la bodega y algunos sí los tengo que comprar.
   La pasta tengo 2 en bodega central y una la tengo que comprar. ¿Cómo podemos mejorar esto?"
   Diseño confirmado por él: (1) la app pregunta AL ELEGIR BODEGA — si la existencia no cubre
   la cantidad, pregunta cuántas van de bodega proponiendo lo que hay, y parte la línea;
   (2) el resto se queda con el proveedor del catálogo que la línea YA tenía.

   HOY: elegir BODEGA CENTRAL con saldo insuficiente solo avisa "SE DESPACHA LO QUE HAYA" y
   manda la línea ENTERA a bodega. Para partir, compras tendría que editar el pedido a mano.

   EL FLUJO NUEVO (todo dentro del modal de la OC, sobre ocWorkingItems):
   · updateOcItemProveedor('_bodega') con 0 < saldo < qty ⇒ pregunta ANTES de mutar nada.
   · La pregunta propone el saldo; el valor viaja por oninput a una window var (v813:
     prConfirm destruye el modal antes del await).
   · Confirmada con 0 < n < qty: la línea se PARTE — n a bodega, (qty−n) con el proveedor y
     precio que la línea ya tenía. Las dos caen en ÓRDENES SEPARADAS solas (_ocGrupoKey v1133)
     y la recepción SUMA por sourceKey a través de las entregas (v996/v1036), así que la
     cobertura del pedido cierra: 2 de bodega + 1 comprada = 3.
   · n = 0 ⇒ no cambia nada (todo se compra). n ≥ qty ⇒ todo a bodega con el aviso de siempre.
   · Cancelar ⇒ no cambia nada.
   · La re-entrada usa {sinPreguntar:true} para no volver a preguntar en bucle.
   · _ocPartirLineaBodega es PURA: copia, no muta la línea original. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— la función que parte es PURA —');
const zP = ex(html, 'function _ocPartirLineaBodega(');
ok('existe _ocPartirLineaBodega', !!zP);
let partir = null;
try { partir = new Function('return (' + zP + ')')(); } catch(e){}
ok('la función evalúa', typeof partir === 'function');
if (partir) {
  const linea = { sourceKey:'k1', name:'PASTA REDIMIX', qty:3, precio:145, proveedorId:'pv9', autoAssigned:true, _provAuto:'pv9' };
  const r = partir(linea, 2);
  ok('parte 3 en 2 + 1', r && r.bodega.qty === 2 && r.resto.qty === 1);
  ok('el resto CONSERVA proveedor y precio del catálogo', r && r.resto.proveedorId === 'pv9' && r.resto.precio === 145);
  ok('el resto NO queda marcado como bodega', r && !r.resto.esBodega);
  ok('las dos partes comparten sourceKey (la recepción SUMA por clave)', r && r.bodega.sourceKey === 'k1' && r.resto.sourceKey === 'k1');
  ok('es PURA: la línea original no se toca', linea.qty === 3 && linea.proveedorId === 'pv9');
  ok('decimales: 2.5 con 1 de bodega deja 1.5', (function(){ const x = partir({ qty:2.5 }, 1); return x && Math.abs(x.resto.qty - 1.5) < 1e-9; })());
  ok('0 de bodega no parte nada', partir(linea, 0) === null);
  ok('todo de bodega no parte nada (n ≥ qty)', partir(linea, 3) === null && partir(linea, 5) === null);
  ok('basura no parte nada', partir(linea, NaN) === null && partir(linea, 'x') === null && partir(null, 1) === null);
}

console.log('\n— elegir bodega con saldo parcial PREGUNTA antes de mutar —');
const zU = ex(code, 'function updateOcItemProveedor(');
ok('el check vive en updateOcItemProveedor', /_ocPreguntarParticionBodega/.test(zU));
ok('solo con saldo POSITIVO que no cubre (saldo 0 sigue con el aviso de siempre)',
  /saldo > 0/.test(zU) && /_ocPreguntarParticionBodega\(idx/.test(zU));
ok('pregunta y RETORNA antes de tocar la línea',
  zU.indexOf('_ocPreguntarParticionBodega') < zU.indexOf("item.proveedorId = provId || ''"));
ok('la re-entrada puede saltarse la pregunta', /sinPreguntar/.test(zU));

console.log('\n— la pregunta y la partición —');
const zQ = ex(code, 'async function _ocPreguntarParticionBodega(');
ok('existe y es async (modal de por medio)', zQ.length > 400);
ok('propone lo que hay en bodega', /value="\$\{|value='\s*\+|saldo/.test(zQ));
ok('el valor viaja por oninput a una window var (v813)', /oninput="window\._ocPartForm/.test(zQ));
ok('re-lee la línea tras el await (el modal pudo cambiar el mundo)',
  zQ.indexOf('ocWorkingItems[idx]') !== zQ.lastIndexOf('ocWorkingItems[idx]'));
ok('cancelar no cambia nada', /if \(!ok\w*\) return/.test(zQ));
ok('con 0 no cambia nada (todo se compra)', /=== 0|<= 0/.test(zQ));
ok('con todo (n ≥ qty) va ENTERA a bodega por el camino de siempre', /sinPreguntar\s*:\s*true/.test(zQ));
ok('la partición inserta las DOS líneas donde estaba la una', /splice\(idx, 1,/.test(zQ));
ok('la parte de bodega se asigna por el camino NORMAL (adopta nombre y precio de bodega)',
  /updateOcItemProveedor\(idx, '_bodega', \{\s*sinPreguntar\s*:\s*true\s*\}\)/.test(zQ));
ok('avisa qué se partió', /showToast/.test(zQ));

console.log('\n— lo que no cambia —');
ok('cada parte cae en SU orden: _bodega es grupo propio (v1133)',
  /pid === '_bodega'[\s\S]{0,80}return pid/.test(ex(code, 'function _ocGrupoKey(')));
ok('la recepción SUMA lo recibido por clave a través de las entregas (v996)',
  /recetaRecibido\[k\] = \(Number\(recetaRecibido\[k\]\) \|\| 0\) \+/.test(html));
ok('el aviso viejo sigue para saldo CERO', /SE DESPACHA LO QUE HAYA/.test(zU));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
