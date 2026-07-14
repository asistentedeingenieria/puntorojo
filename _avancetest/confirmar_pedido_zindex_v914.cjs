/* v914 (reporte con fotos: al elegir un modo de pedido "no pasa nada" hasta tocar afuera):
   GENERAR PEDIDO AUTOMÁTICO (#modalConfirmarPedido, clase .modal-bg z-index:100) se abría
   DETRÁS del modal PEDIR DE RECETA (z 100070) y del menú de modos (z 100080).
   Fix: z-index inline 100090 en #modalConfirmarPedido (solo ese modal; el resto de
   .modal-bg queda igual). De paso: el aviso verde decía "datos directos del PDF" —
   la receta estándar viene de Excel → ahora dice "de la receta". */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const m = html.match(/<div class="modal-bg" id="modalConfirmarPedido"[^>]*>/);
ok('#modalConfirmarPedido existe', !!m);
if (m) {
  const z = m[0].match(/z-index:\s*(\d+)/);
  ok('z-index inline por encima del modal PEDIR DE RECETA (100070) y del menú (100080)', !!z && Number(z[1]) > 100080);
}
ok('el aviso ya no dice "del PDF"', !/datos directos del PDF/.test(html));
ok('el aviso dice "de la receta"', /datos directos de la receta/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
