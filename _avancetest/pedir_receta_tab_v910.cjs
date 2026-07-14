/* v910 (pedido de Antonio 13-jul, con foto de la sección METAL A MEDIDA):
   (1) Los pedidos de receta se hacen desde la pestaña PEDIDOS DE MATERIAL: sub-pestaña
       nueva "PEDIR DE RECETA" (data-pedtab="receta", gate pedidos.create) que contiene la
       tarjeta con #recetaPedirContent, MOVIDA desde la pestaña RECETA DE MATERIAL.
       setPedidoTab('receta') muestra #pedido-receta y llama renderRecetaPedir().
   (2) La sección "METAL A MEDIDA · FABRICACIÓN ESPECIAL" del formulario de NUEVO PEDIDO
       se ELIMINA (la reemplazó SOLO POSTES A MEDIDA de v909). Regla v829: se quita la UI
       pero la lógica queda viva (renderMetalMedida con guard, pedidos históricos con
       metalMedida se siguen mostrando en detalle/OC, exclusión metalMedidaPedida intacta). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. la tarjeta vive en mat-pedidos (no en mat-receta) ──
const iPed = html.indexOf('id="mat-pedidos"');
const iOrd = html.indexOf('id="mat-ordenes"');
const iRec = html.indexOf('id="mat-receta"');
const iCont = html.indexOf('id="recetaPedirContent"');
ok('recetaPedirContent existe una sola vez en el HTML', iCont > 0 && html.indexOf('id="recetaPedirContent"', iCont + 1) === -1);
ok('la tarjeta está DENTRO de mat-pedidos', iPed > 0 && iOrd > iPed && iCont > iPed && iCont < iOrd);
ok('mat-receta ya no tiene la tarjeta', iRec > 0 && !(iCont > iRec));
ok('sub-pestaña PEDIR DE RECETA con gate pedidos.create',
  /data-pedtab="receta"[^>]*data-perm="pedidos\.create"[^>]*>PEDIR DE RECETA</.test(html)
  || /data-pedtab="receta"[^>]*>PEDIR DE RECETA</.test(html) && /data-pedtab="receta"[^>]*data-perm="pedidos\.create"/.test(html));
ok('contenedor #pedido-receta existe', /id="pedido-receta"/.test(html));

// ── 2. setPedidoTab maneja la sub-pestaña nueva ──
const srcTab = extractFn('setPedidoTab');
ok('setPedidoTab muestra/oculta pedido-receta', /pedido-receta/.test(srcTab));
ok("setPedidoTab('receta') renderiza la grilla", /tab === 'receta'[\s\S]{0,120}renderRecetaPedir\(\)/.test(srcTab));

// ── 3. la sección METAL A MEDIDA del formulario se eliminó ──
ok('sin card METAL A MEDIDA · FABRICACIÓN ESPECIAL en el form', !/<h3>METAL A MEDIDA · FABRICACIÓN ESPECIAL<\/h3>/.test(html));
ok('sin botón AGREGAR FABRICACIÓN A MEDIDA', html.indexOf('+ AGREGAR FABRICACIÓN A MEDIDA') === -1);
ok('sin contenedor metalMedidaList en el HTML', !/id="metalMedidaList"/.test(html));

// ── 4. la lógica histórica queda viva (regla v829) ──
const srcRmm = extractFn('renderMetalMedida');
ok('renderMetalMedida sigue existiendo con guard', /getElementById\('metalMedidaList'\)/.test(srcRmm) && /if \(!list\) return;/.test(srcRmm));
ok('el detalle de pedidos viejos sigue mostrando METAL A MEDIDA', /⚙ METAL A MEDIDA · FABRICACIÓN ESPECIAL/.test(html));
ok('buildPedidoOcItems sigue procesando pd.metalMedida', /pd\.metalMedida \|\| \[\]/.test(extractFn('buildPedidoOcItems')));
ok('la exclusión metalMedidaPedida sigue viva', /metalMedidaPedida/.test(extractFn('_etapaItemsParaPedir')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
