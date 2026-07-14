/* v911 (reporte "¿Dónde está?" — PEDIR DE RECETA en blanco en la sesión de Antonio):
   El código v910 funciona en sesión limpia contra el dominio (verificado con DOM real);
   el fallo es específico de su sesión/datos y HOY es invisible (panel blanco).
   Blindaje: renderRecetaPedir atrapa cualquier excepción y la PINTA dentro del panel
   (id _rpErr) + console.error, para que el siguiente print muestre la causa raíz. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const src = extractFn('renderRecetaPedir');
ok('renderRecetaPedir tiene try/catch', /try \{/.test(src) && /catch \(e\)/.test(src));
ok('el error se pinta en el panel (no queda blanco)', /_rpErr/.test(src) && /ERROR AL MOSTRAR/.test(src));
ok('el error también va a consola', /console\.error\('renderRecetaPedir/.test(src));

// El catch pinta aunque el error ocurra ANTES de armar el html (p desde activeProj)
if (src) {
  const contFirst = src.indexOf("getElementById('recetaPedirContent')") < src.indexOf('activeProj()');
  ok('el contenedor se resuelve ANTES de tocar el proyecto', contFirst);
  // simulación: activeProj revienta → el contenedor muestra el error
  const els = { recetaPedirContent: { innerHTML: '', style: {} } };
  const env = 'var document={getElementById:function(id){return {recetaPedirContent:ELS.recetaPedirContent}[id]||null;},querySelectorAll:function(){return [];}};'
    + 'var localStorage={getItem:function(){return null;},setItem:function(){}};'
    + 'function activeProj(){ throw new Error("BOOM DE PRUEBA"); }'
    + 'function escapeAttr(s){ return String(s); }'
    + 'function _recetaEtapaItemKeys(){ return []; }'
    + 'var console={error:function(){}};';
  try {
    const f = new Function('ELS', env + src + '\nrenderRecetaPedir();');
    f(els);
    ok('con activeProj roto, el panel muestra el error', /ERROR AL MOSTRAR/.test(els.recetaPedirContent.innerHTML) && /BOOM DE PRUEBA/.test(els.recetaPedirContent.innerHTML));
  } catch (e) {
    ok('con activeProj roto, el panel muestra el error (throw: ' + e.message + ')', false);
  }
}

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
