/* v792: nueva sub-pestaña PLANILLA POR PERSONA — un PDF por persona de la quincena
   del proyecto activo. Reusa _construirDatos + _v336BuildWorkerBody (rama opts.porPersona). */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// cableado de la sub-pestaña (4 puntos)
ok('botón de la sub-pestaña', /data-plantab="planillapersona"[\s\S]{0,80}PLANILLA POR PERSONA/.test(html));
ok('panel planilla-planillapersona', html.indexOf('id="planilla-planillapersona"')>=0);
ok('clave en el array de display (setPlanillaTab vivo)', /'resumenpersona','planillapersona','anticipos'/.test(html));
ok('dispatch en renderPlanilla vivo', html.indexOf("currentPlanillaTab === 'planillapersona' && typeof window.renderPlanillaPorPersona === 'function'")>=0);
// render + wrappers
ok('renderPlanillaPorPersona existe', html.indexOf('window.renderPlanillaPorPersona = function')>=0);
ok('wrapper por persona', html.indexOf('window._planillaPdfPorPersona = async function')>=0);
ok('wrapper descargar todas', html.indexOf('window._planillaPdfTodasPorPersona = async function')>=0);
ok('selector de quincena (más reciente por numero desc)', /\(b\.numero\|\|0\)-\(a\.numero\|\|0\)/.test(html));
ok('reusa _construirDatos con planilla: pl', /_construirDatos\(p, pl\.pagosIds[\s\S]{0,200}planilla: pl/.test(html));
// rama un-PDF-por-persona en el generador, reusando lo existente
ok('rama opts.porPersona en _generarYDescargarExcel', /if\(opts && opts\.porPersona\)/.test(html));
ok('la rama reusa _v336BuildWorkerBody', /opts\.porPersona[\s\S]{0,1200}_v336BuildWorkerBody\(c\)/.test(html));
ok('la rama usa _pdfDescargar (móvil-aware)', /opts\.porPersona[\s\S]{0,2200}_pdfDescargar\(d2/.test(html));
ok('soloIdx para una sola persona', html.indexOf('opts.soloIdx')>=0);
// no se rompió la firma del generador
ok('_generarYDescargarExcel acepta opts', html.indexOf('async function _generarYDescargarExcel(data, opts)')>=0);
// v793: autorización única para ver la pestaña
ok('permiso planilla.porPersona registrado (EDICIÓN PLANILLAS)', /pushPerm\(\{\s*key:'planilla\.porPersona'[\s\S]{0,120}group:'EDICIÓN PLANILLAS'/.test(html));
ok('el botón de la sub-pestaña está gateado por data-perm', /data-plantab="planillapersona"[^>]*data-perm="planilla\.porPersona"|data-perm="planilla\.porPersona"[^>]*data-plantab="planillapersona"/.test(html));
// v794: los nombres se ven COMPLETOS (no truncados con ...)
const _nameLine = (html.match(/font-weight:700;font-size:12\.5px[^"]*"/)||[''])[0];
ok('línea del nombre del colab localizada', _nameLine.length>0);
ok('el nombre NO se trunca (sin white-space:nowrap)', _nameLine.indexOf('white-space:nowrap')<0);
ok('el nombre NO usa text-overflow:ellipsis', _nameLine.indexOf('text-overflow:ellipsis')<0);
ok('el nombre permite varias líneas (word-break)', _nameLine.indexOf('word-break')>=0);

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
