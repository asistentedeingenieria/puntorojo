/* v978 (pedidos de Antonio 26-jul, fotos del modal de OCs):
   1. CANDADO DE PROVEEDORES en pedidos DE RECETA: compras NO cambia el proveedor
      (viene del catálogo) — lo ÚNICO permitido es mandar el material a BODEGA CENTRAL
      (despacho). Admin (users.manage) conserva la mano. Ítems SIN match de catálogo
      sí dejan elegir (si no, la OC se traba).
   2. El "+" de crear proveedor NUEVO sale del modal — proveedores solo en el catálogo.
   3. PROVEEDOR RÁPIDO PARA ASIGNAR A TODOS: en pedidos de receta queda como leyenda
      "PROVEEDORES SELECCIONADOS AUTOMÁTICAMENTE" y NO abre lista.
   4. NUMERACIÓN EN ORDEN: el número de la OC es su FOLIO (correlativo del proyecto),
      no el índice dentro del pedido — ya no sale "OC01" en la segunda OC del proyecto
      ni se lee el número del pedido como si fuera el de la OC. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 2. sin "+" de proveedor nuevo en el modal ──
const iModal = html.indexOf('PROVEEDOR RÁPIDO PARA ASIGNAR A TODOS');
const zModal = html.slice(iModal - 200, iModal + 1200);
ok('el modal ya NO tiene el + de crear proveedor', !/openAddProveedor/.test(zModal));

// ── 1/3. el candado ──
// v992: el candado aplica a TODOS los pedidos (pedido de Antonio); el admin conserva la mano por ítem
ok('_ocProvLocked respeta al admin', /_ocProvLocked = !can\('users\.manage'\)/.test(html));
ok('con candado, el botón TODOS dice PROVEEDORES SELECCIONADOS AUTOMÁTICAMENTE', /PROVEEDORES SELECCIONADOS AUTOMÁTICAMENTE/.test(html));
const zTodos = ex('function _abrirPickerProveedorTodos(');
// v984: el candado del TODOS aplica a TODOS (admin incluido) en pedidos de receta
ok('el picker de TODOS no abre con candado', /_ocProvLocked \|\| window\._ocProvLockedTodos\) return/.test(zTodos.replace(/\n/g,' ')));
const zItem = ex('function _abrirPickerProveedor(btn, idx)');
ok('el picker por ítem solo ofrece AUTO ↔ BODEGA con candado', /_ocProvLocked/.test(zItem) && /_provAuto/.test(zItem) && /BODEGA CENTRAL \(DESPACHO\)/.test(zItem));
ok('ítem SIN match de catálogo sigue eligiendo libre (no traba la OC)', /sin proveedor auto/i.test(zItem));
const zUpd = ex('function updateOcItemProveedor(');
ok('updateOcItemProveedor blinda el candado (defensa de frontera)', /_ocProvLocked/.test(zUpd) && /_bodega/.test(zUpd));

// ── 4. numeración en orden ──
// v982: el prefijo ahora también distingue OP (orden de producción)
ok('el número de la OC nueva es su FOLIO correlativo (5 dígitos)', html.includes("- ${serie} ${String(folio).padStart(5, '0')}")); // v993: prefijo por serie
ok('el campo del modal muestra OC nnnnn · DEL PEDIDO (sin OC01/SIG. FOLIO)', /· DEL PEDIDO \$\{pd\.numero\}/.test(html) && !/OC\$\{String\(existingOcs\.length \+ 1\)\.padStart\(2,'0'\)\} \/ SIG\. FOLIO/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
