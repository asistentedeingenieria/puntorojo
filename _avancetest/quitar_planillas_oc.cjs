/* v867: quitar la sub-pestaña PLANILLAS OC (órdenes de cambio) de la vista PLANILLAS. El user va a
   rehacer las OC después, así que se ELIMINA el botón del tab (y injectPlanillaTabs oculta cualquier
   botón 'ocs' que venga del cache, mismo patrón que ajustes/excepciones en v345). El código OC
   (renderPlanillaOCs y demás) queda DORMIDO, no se borra. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// el botón de la sub-pestaña ya no existe
ok('no queda el onclick setPlanillaTab(\'ocs\') del botón', html.indexOf("setPlanillaTab('ocs')") < 0);
ok('no queda un tab con label PLANILLAS OC', !/>PLANILLAS OC<\/button>/.test(html));

// injectPlanillaTabs oculta cualquier botón 'ocs' viejo del cache (belt-and-suspenders)
ok('injectPlanillaTabs oculta el ocs viejo del cache', /querySelector\('\[data-plantab="ocs"\]'\)[\s\S]{0,80}display\s*=\s*'none'/.test(html));

// el código OC sigue DORMIDO (no se borró), para el rehacer
ok('renderPlanillaOCs sigue definido (dormido)', html.indexOf('window.renderPlanillaOCs = function') >= 0);
ok('el panel planilla-ocs sigue existiendo (oculto)', html.indexOf('id="planilla-ocs"') >= 0);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
