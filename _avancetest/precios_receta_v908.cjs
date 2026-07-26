/* v908 (reporte 13-jul "¿por qué no tienen precios?"):
   (1) PRECIOS: la receta matchea contra el catálogo de proveedores solo por el nombre CORTO
       (l.m). El formato estándar trae NOMBRE REAL DE COMPRA (l.nc) — que es como los
       proveedores nombran sus productos. Fix: precioDeProductoReceta acepta un 3er arg
       nombreCompra como fallback; renderRecetaV2 y el modal PRECIOS lo pasan.
   (2) BUG LATENTE v906: openPedidoDetalle / printPedido / buildPedidoOcItems hacían
       `const [cat, name] = key.split('::')` — las claves de la receta estándar no llevan
       '::' → name quedaba undefined y la OC salía con items "undefined". Fix:
       _pedidoKeyParts(key) → {cat:'RECETA', name:key} para claves planas. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. precioDeProductoReceta con fallback por nombre real de compra ──
const deps = extractFn('normProducto') + '\n' + extractFn('matchKeyProducto') + '\n';
const srcPrecio = extractFn('precioDeProductoReceta');
ok('precioDeProductoReceta existe', !!srcPrecio);
if (srcPrecio) {
  const f = new Function(deps + srcPrecio + '\nreturn precioDeProductoReceta;')();
  const provs = [
    { id:'pr1', nombre:'INMESA', productos:[
      { nombre:"POSTE DE 2½\" X 10' (0.35) CAL. 26", precio: 24.5, unidad:'U' }
    ]},
    { id:'pr2', nombre:'SISTEGUA', productos:[
      { nombre:'CANAL REAL', precio: 9, unidad:'U', rendimiento: 1 }
    ]}
  ];
  ok('nombre corto solo NO matchea (comportamiento base)', f(provs, 'Poste de 2 1/2" cal 26') === null);
  const conNc = f(provs, 'Poste de 2 1/2" cal 26', "POSTE DE 2½\" X 10' (0.35) CAL. 26");
  ok('fallback por nombre real de compra matchea', !!conNc && conNc.precio === 24.5 && conNc.proveedor === 'INMESA');
  const provs2 = [{ id:'pr3', nombre:'Z', productos:[{ nombre:'CANAL CORTO', precio: 5 }] }].concat(provs);
  ok('el nombre corto GANA si existe en el catálogo', f(provs2, 'Canal corto', 'CANAL REAL').precio === 5);
  ok('compat: 2 args sigue funcionando', f(provs, 'CANAL REAL').precio === 9);
  ok('sin match con ambos nombres → null', f(provs, 'Nada', 'Tampoco') === null);
}

// ── 2. _pedidoKeyParts: claves planas de la receta estándar ──
const srcParts = extractFn('_pedidoKeyParts');
ok('_pedidoKeyParts existe', !!srcParts);
if (srcParts) {
  const g = new Function(srcParts + '\nreturn _pedidoKeyParts;')();
  const plain = g('TABLAYESO 12.7MM X 1.22 X 2.44');
  ok('clave plana → name = clave completa', plain.name === 'TABLAYESO 12.7MM X 1.22 X 2.44');
  ok('clave plana → cat RECETA', plain.cat === 'RECETA');
  const cn = g('PLANCHAS::Plancha 1/2');
  ok('clave con :: se parte igual que antes', cn.cat === 'PLANCHAS' && cn.name === 'Plancha 1/2');
  ok(':: múltiple conserva el resto en name', g('A::B::C').name === 'B::C');
}

// ── 3. buildPedidoOcItems ya no produce "undefined" ──
const srcOc = extractFn('buildPedidoOcItems');
if (srcOc && srcParts) {
  // v968: buildPedidoOcItems consulta _ncDeCompra (nombre de compra) — stub neutro acá
  const h = new Function(srcParts + '\nfunction _ncDeCompra(){ return null; }\n' + srcOc + '\nreturn buildPedidoOcItems;')();
  const pd = { items: { "POSTE DE 2½\" X 9.19' (0.35) CAL. 26 (MEDIDA ESPECIAL 2.8 m)": 424, 'PLANCHAS::Plancha 1/2': 10 }, specs: {} };
  const arr = h(pd);
  const poste = arr.find(x => /POSTE/.test(x.name));
  ok('OC: item de receta estándar conserva su nombre real', !!poste && poste.qty === 424 && !/undefined/.test(poste.name));
  const plancha = arr.find(x => x.cat === 'PLANCHAS');
  ok('OC: item clásico CAT::NAME intacto', !!plancha && plancha.name === 'Plancha 1/2');
} else { ok('buildPedidoOcItems extraída', false); }

// ── 4. cableado ──
ok('renderRecetaV2 pasa l.nc al precio', /precioDeProductoReceta\(_getProveedores\(\), l\.m, l\.nc\)/.test(html));
ok('modal PRECIOS pasa el nombre real', /precioDeProductoReceta\(_getProveedores\(\), x\.nombre, x\.nc\)/.test(html));
const srcPrint = extractFn('_solicitudDocHTML') /* v980: el doc vive en el builder */;
ok('el doc de la solicitud usa _pedidoKeyParts', /_pedidoKeyParts\(/.test(srcPrint));
const srcDet = extractFn('openPedidoDetalle');
ok('openPedidoDetalle usa _pedidoKeyParts', /_pedidoKeyParts\(/.test(srcDet));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
