/* v932 (reporte de Antonio con print del modal GENERAR OC, VLA):
   (1) el BUSCAR del picker de proveedores no dejaba escribir — el anti-autofill v487
       endurece (readonly-hasta-foco) DESPUÉS del focus() síncrono de _abrirPicker, así
       que el desbloqueo-al-enfocar nunca dispara (misma trampa del kiosko, antídoto v695:
       quitar readonly/data-naf-ro con setTimeout y re-enfocar).
   (2) el scroll DE LA PROPIA LISTA cerraba el panel — el cierre-por-scroll (captura en
       window) ahora ignora scrolls que nacen dentro del panel (_pickerScroll).
   (3) FECHA DE ENTREGA de la OC con CALENDARIO: input type=date (min hoy), conversión
       latam→ISO al abrir y _fechaInputALatam al generar (cpFechaEntrega v915 ya era así). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. BUSCAR escribible: antídoto v695 dentro de _abrirPicker ──
const ab = extractFn('_abrirPicker');
ok('quita readonly del anti-autofill', ab.indexOf("removeAttribute('readonly')") > -1 && ab.indexOf("removeAttribute('data-naf-ro')") > -1);
ok('lo hace DIFERIDO (después del observer)', /setTimeout\([^)]*\{[^}]*removeAttribute\('readonly'\)/.test(ab.replace(/\n/g,' ')) || (ab.indexOf('setTimeout') > -1 && ab.indexOf('setTimeout') < ab.indexOf("removeAttribute('readonly')")));
ok('re-enfoca tras desbloquear', ab.lastIndexOf('.focus()') > ab.indexOf("removeAttribute('readonly')"));

// ── 2. scroll de la lista NO cierra el panel ──
const ps = extractFn('_pickerScroll');
ok('_pickerScroll existe (handler con filtro)', !!ps);
if (ps) {
  let cerrado = 0;
  const inside = { nodeType: 1 }, outside = { nodeType: 1 };
  const fakeWin = { _pickerOpen: { contains: t => t === inside } };
  const fn = new Function('window', '_cerrarPicker', 'return ' + ps)(fakeWin, () => { cerrado++; });
  fn({ target: inside });
  ok('scroll DENTRO del panel no lo cierra', cerrado === 0);
  fn({ target: outside });
  ok('scroll de la página SÍ lo cierra', cerrado === 1);
  fn({ target: { nodeType: 9 } }); // document
  ok('scroll del documento también cierra', cerrado === 2);
}
ok('el listener registrado es _pickerScroll (no _cerrarPicker directo)', ab.indexOf("addEventListener('scroll', _pickerScroll, true)") > -1);
const cp = extractFn('_cerrarPicker');
ok('y se desregistra el mismo handler', cp.indexOf("removeEventListener('scroll', _pickerScroll, true)") > -1);

// ── 3. FECHA DE ENTREGA con calendario ──
const mInp = html.match(/<input id="ocFechaEntrega"[^>]*>/);
ok('ocFechaEntrega es type=date (calendario nativo)', !!mInp && /type="date"/.test(mInp[0]));
ok('ya no lleva la máscara de texto', !!mInp && mInp[0].indexOf('prFormatDateInput') === -1);
const oo = extractFn('openOrdenCompra');
ok('al abrir convierte DD/MM/YYYY → ISO para el calendario', /pd\.fechaEntrega\.split\('\/'\)/.test(oo) || /fechaEntrega[\s\S]{0,200}split\('\/'\)/.test(oo));
ok('min = hoy (no deja elegir fechas pasadas)', /ocFechaEntrega[\s\S]{0,400}\.min = _hoyInputISO\(\)/.test(oo));
const go = extractFn('generarOrdenCompra');
ok('al generar convierte con _fechaInputALatam (ISO→latam)', /_fechaInputALatam\(document\.getElementById\('ocFechaEntrega'\)\.value\)/.test(go));
ok('ya no valida con la máscara vieja', go.indexOf("prValidateDDMMYYYY(document.getElementById('ocFechaEntrega')") === -1);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
