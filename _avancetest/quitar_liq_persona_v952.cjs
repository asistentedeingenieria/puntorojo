/* v952 (pedido de Antonio 17-jul): la sub-pestaña LIQUIDACIÓN POR PERSONA (v792/v938)
   YA NO debe existir. Se quita el botón, el panel, el switch, el hook de render y el
   permiso planilla.porPersona del catálogo de USUARIOS. El GENERADOR
   (renderPlanillaPorPersona + rama porPersona del PDF) queda DORMIDO en el código:
   nada lo llama, pero el test v938 del PDF anónimo sigue válido y se puede recablear. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── la pestaña NO existe ──
ok('sin botón de pestaña', !/data-plantab="planillapersona"/.test(html));
ok('sin panel planilla-planillapersona', !/id="planilla-planillapersona"/.test(html));
ok('fuera del switch de pestañas', !/'resumenpersona','planillapersona'/.test(html) && !/'planillapersona',/.test(html.slice(html.indexOf("['etapas','receta'"), html.indexOf("['etapas','receta'") + 300)));
ok('sin hook de render en setPlanillaTab', !/currentPlanillaTab === 'planillapersona'/.test(html));
ok('permiso planilla.porPersona fuera del catálogo', !/key:'planilla\.porPersona'/.test(html));

// ── el generador queda dormido (v938 sigue intacto) ──
ok('renderPlanillaPorPersona sigue existiendo (dormido)', /function renderPlanillaPorPersona|renderPlanillaPorPersona = function/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
