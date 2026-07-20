/* v792: sub-pestaña PLANILLA POR PERSONA — un PDF por persona de la quincena.
   SUPERSEDED por v952 (pedido de Antonio 17-jul): la PESTAÑA ya no existe (botón,
   panel, switch, hook y permiso eliminados). El GENERADOR queda DORMIDO en el
   código (rama opts.porPersona + wrappers) por si se recablea; el reporte anónimo
   v938 se prueba en liquidacion_persona_anonima_v938.cjs. */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// v952: la pestaña NO existe
ok('sin botón de la sub-pestaña', !/data-plantab="planillapersona"/.test(html));
ok('sin panel planilla-planillapersona', html.indexOf('id="planilla-planillapersona"')<0);
ok('fuera del array de display', !/'planillapersona'/.test((html.match(/\['etapas','receta'[^\]]*\]/)||[''])[0]));
ok('sin dispatch en renderPlanilla', html.indexOf("currentPlanillaTab === 'planillapersona'")<0);
ok('permiso planilla.porPersona fuera del catálogo', !/pushPerm\(\{\s*key:'planilla\.porPersona'/.test(html));

// el generador sigue DORMIDO e intacto (para poder recablear + soporte del v938)
ok('renderPlanillaPorPersona existe (dormido)', html.indexOf('window.renderPlanillaPorPersona = function')>=0);
ok('wrapper por persona (dormido)', html.indexOf('window._planillaPdfPorPersona = async function')>=0);
ok('wrapper descargar todas (dormido)', html.indexOf('window._planillaPdfTodasPorPersona = async function')>=0);
ok('rama opts.porPersona en _generarYDescargarExcel', /if\(opts && opts\.porPersona\)/.test(html));
ok('la rama reusa _v336BuildWorkerBody', /opts\.porPersona[\s\S]{0,1800}_v336BuildWorkerBody\(c\)/.test(html));
ok('_generarYDescargarExcel acepta opts', html.indexOf('async function _generarYDescargarExcel(data, opts)')>=0);

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
