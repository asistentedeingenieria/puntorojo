/* v821: 6 cambios de UI/comportamiento.
   A1 quitar botón CARAS SIN REGISTRAR · A2 flag pagoObra (combo PERSONA A PAGAR opt-in)
   A3 botón PREGUNTÁ -> ícono chico tamaño campana · B4 avance físico: solo admin desmarca
   B5 modal fotos solo-lectura si apto 100% · B6 modal fotos rediseñado (centrado/elegante). */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
function extractFn(name){ const m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }

// ── A1: botón CARAS SIN REGISTRAR eliminado ──
ok('A1 botón CARAS SIN REGISTRAR eliminado', !/>CARAS SIN REGISTRAR<\/button>/.test(html));

// ── A2: flag pagoObra (opt-in). El combo PERSONA A PAGAR (que usa _personalPickList) solo muestra marcados. ──
ok('A2 _personalPickList expone pagoObra', /pagoObra:p\.pagoObra===true/.test(html));
ok('A2 el combo PERSONA A PAGAR filtra por pagoObra', /window\._personalPickList\(\)\.filter\(function\(c\)\{ return c && c\.pagoObra; \}\)/.test(html));
ok('A2 handler _togglePagoObra existe', html.indexOf('window._togglePagoObra')>=0);
ok('A2 check discreto en COLABORADORES (label + handler)', /COBRA EN LIQUIDACIÓN DE OBRA/.test(html) && /_togglePagoObra\(/.test(html));

// ── A3: botón PREGUNTÁ -> ícono solo, tamaño campana (34x34, transparente) ──
ok('A3 sin texto PREGUNTÁ en el botón', html.indexOf('<span>PREGUNTÁ</span>')<0);
ok('A3 #aiTopBtn 34x34 circular', /#aiTopBtn\{[^}]*width:34px;height:34px/.test(html) && /#aiTopBtn\{[^}]*border-radius:50%/.test(html));
ok('A3 #aiTopBtn fondo transparente (como la campana)', /#aiTopBtn\{[^}]*background:transparent/.test(html));
ok('A3 ícono del botón a 20px (igual a la campana)', /id="aiTopBtn"[\s\S]{0,500}width="20" height="20"/.test(html));

// ── B4: avance físico — solo admin/gerente desmarca; el resto NO (ni solicitud) ──
const srcAcc=extractFn('_avanceToggleAccion');
ok('_avanceToggleAccion existe', !!srcAcc);
if(srcAcc){
  const _acc=new Function(srcAcc+'\nreturn _avanceToggleAccion;')();
  ok('B4 gerente sobre etapa marcada -> unmark (con confirmación)', _acc(true,true,true)==='unmark');
  ok('B4 NO gerente sobre etapa marcada -> locked (no desmarca, no solicita)', _acc(true,false,true)==='locked' && _acc(true,false,false)==='locked');
  ok('B4 gerente sobre etapa libre -> mark', _acc(false,true,false)==='mark');
  ok('B4 NO gerente, etapa libre con fotos -> mark', _acc(false,false,true)==='mark');
  ok('B4 NO gerente, etapa libre sin fotos -> block-photos', _acc(false,false,false)==='block-photos');
  ok('B4 ya no produce request-unmark', srcAcc.indexOf('request-unmark')<0);
}
ok('B4 toggleStage maneja la acción locked', /accion === 'locked'/.test(html));

// ── B5: modal de fotos en SOLO-LECTURA cuando el apto está al 100% ──
const srcMod=extractFn('renderPhotosModal');
ok('renderPhotosModal existe', !!srcMod);
ok('B5 detecta apto terminado (100%)', /_aptoTerminado\s*=\s*aptoCompleted\(a\)\s*===\s*6/.test(srcMod));
ok('B5 modo solo-lectura = !canEdit || terminado', /_ro\s*=\s*!canEdit\s*\|\|\s*_aptoTerminado/.test(srcMod));
ok('B5 el botón AGREGAR FOTO se oculta en solo-lectura', /if\(prevDone && !_ro\)/.test(srcMod));

// ── B6: rediseño del modal (centrado/elegante) + banner de terminado ──
ok('B6 banner APTO TERMINADO · SOLO LECTURA', /APTO TERMINADO · SOLO LECTURA/.test(html));
ok('B6 etapa-block con esquinas redondeadas (rediseño)', /\.photo-etapa-block\{[^}]*border-radius:10px/.test(html));

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
