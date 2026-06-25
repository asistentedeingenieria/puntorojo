/* v826: arreglos de la auditoría mobile.
   #1 (HIGH) ÓRDENES DE COMPRA: .oc-list-item era grid de 5 cols sin colapso -> en celular la
      columna de acciones (AUTORIZAR/IMPRIMIR) se salía de pantalla. Ahora se apila en móvil.
   #2 (MED) RECETA DE MATERIAL: la <table> no tenía class="tbl" (el observer v824 no la envolvía)
      -> se envuelve en .tbl-scroll con min-width para que haga scroll y no se aplaste.
   #3 (LOW) modal PRESENTES POR OBRA: 3 KPIs en 1fr 1fr 1fr -> auto-fit para que no se parta el label. */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// #1 OC list colapsa en móvil + acciones visibles
ok('#1 .oc-list-item se apila en móvil (grid-template-areas)', /\.oc-list-item\{grid-template-columns:1fr auto;grid-template-areas/.test(html));
ok('#1 acciones (AUTORIZAR/IMPRIMIR) full-width y visibles en móvil', /\.oc-list-actions\{grid-area:actions;justify-content:flex-start!important;max-width:none!important/.test(html));
ok('#1 dentro de un @media de celular', /@media \(max-width:640px\)\{[\s\S]{0,260}\.oc-list-item\{grid-template-columns:1fr auto/.test(html));

// #2 tabla receta envuelta en .tbl-scroll
ok('#2 tabla RECETA envuelta en .tbl-scroll con min-width', /<div class="tbl-scroll"><table style="width:100%;min-width:520px/.test(html));
ok('#2 la tabla envuelta se cierra bien (</table></div>)', /<\/tbody><\/table><\/div>/.test(html));

// #3 modal PRESENTES POR OBRA auto-fit
ok('#3 modal PRESENTES POR OBRA en auto-fit (no se parte el label)', /grid-template-columns:repeat\(auto-fit,minmax\(95px,1fr\)\)/.test(html));

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
