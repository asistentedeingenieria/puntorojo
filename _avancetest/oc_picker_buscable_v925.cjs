/* v925 (pedido de Antonio con 2 fotos del modal de OC):
   (1) El label "FECHA" pasa a "FECHA DE PEDIDO".
   (2) Los desplegables de PROVEEDOR (el rápido y el de cada material) se vuelven
       pickers BUSCABLES y compactos. El panel se cuelga del BODY con position:fixed
       (los combos custom dentro de modales se recortan — regla v795/lección v913).
       El picker rápido además gana la opción BODEGA CENTRAL que le faltaba (v921
       solo la agregó al select por material). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. label ──
ok('el label dice FECHA DE PEDIDO', /<label>FECHA DE PEDIDO<\/label>/.test(html));
ok('ya no existe el label FECHA pelado', !/<label>FECHA<\/label>/.test(html));

// ── 2. picker genérico a nivel body ──
const srcPicker = extractFn('_abrirPicker');
ok('_abrirPicker existe y se cuelga del body', /document\.body\.appendChild/.test(srcPicker));
ok('panel fijo con buscador', /position:fixed/.test(srcPicker) && /_prPickerBusca/.test(srcPicker));
ok('cierra al click afuera y al hacer scroll', !!extractFn('_cerrarPicker') && /scroll/.test(srcPicker));

// ── 3. items del picker de proveedores ──
const srcItems = extractFn('_provPickerItems');
ok('_provPickerItems existe con BODEGA CENTRAL', /_bodega/.test(srcItems) && /BODEGA CENTRAL/.test(srcItems));
if (srcItems) {
  const f = new Function('function _getProveedores(){ return [{id:"p1",nombre:"SISTEGUA"},{id:"p2",nombre:"NOVEX"}]; }\n' + srcItems + '\nreturn _provPickerItems;')();
  const items = f('— ASIGNAR —');
  ok('primera opción + bodega + proveedores', items[0].label === '— ASIGNAR —' && items[1].id === '_bodega' && items.length === 4 && items[3].label === 'NOVEX');
}

// ── 4. cableado: por material y el rápido ──
const srcRender = extractFn('renderOcItems');
ok('el select nativo por material desapareció', !/oc-provider-select/.test(srcRender));
ok('cada material abre el picker buscable', /_abrirPickerProveedor\(this, \$\{idx\}\)/.test(srcRender));
ok('_abrirPickerProveedor pica con updateOcItemProveedor', /updateOcItemProveedor\(idx, id\)/.test(extractFn('_abrirPickerProveedor')));
ok('el selector rápido es botón con picker', /id="ocProveedorBtn"/.test(html) && /_abrirPickerProveedorTodos/.test(html));
const srcTodos = extractFn('_abrirPickerProveedorTodos');
ok('el rápido ofrece NO APLICAR y llama applyOcProveedor', /NO APLICAR A TODOS/.test(srcTodos) && /applyOcProveedor\(id\)/.test(srcTodos));
ok('openOrdenCompra ya no arma options del select viejo', !/provSel\.innerHTML/.test(extractFn('openOrdenCompra')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
