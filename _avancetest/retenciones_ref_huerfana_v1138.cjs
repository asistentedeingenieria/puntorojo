/* v1138 — AUTORIZAR RETENCIONES SOBRE UNA REFERENCIA HUÉRFANA: el PDF sale, la app no lo registra

   Salió de la auditoría completa. El escenario, verificado en el código:

   El gerente abre AUTORIZAR de una liquidación de retenciones (miles de quetzales) y se queda
   leyendo el desglose por apartamento — esa pantalla existe justo para revisarla, 20-40 segundos.
   Mientras tanto, cualquier otro de los ~30 usuarios guarda algo: llega un snapshot y
   `state = merged` reemplaza TODO por objetos NUEVOS. Cuando el gerente pulsa AUTORIZAR, el
   código escribe sobre los objetos VIEJOS, ya desconectados del state:

       const p     = activeProj();                          ← antes del await
       const retpl = (p.planilla.retencionesPlanillas||[]).find(...)   ← antes del await
       const ok    = await _abrirPreviewRetencionesModal({...});       ← el usuario piensa
       retpl.estado = 'aprobada';                           ← sobre el objeto huérfano
       pg.retencionPagada = true;
       p.planilla.retencionesPagadas.push({...});
       saveState();                                          ← guarda el state NUEVO, sin nada de eso

   RESULTADO: el PDF baja, se entrega al contador y se paga — pero para la app esas retenciones
   siguen PENDIENTES. La semana siguiente se vuelven a enviar y a autorizar: la plata sale dos
   veces, y el toast dice "LIQUIDACIÓN AUTORIZADA".

   DOS CAUSAS, y hacen falta las dos correcciones (es la lección de v769/v770/v940):
   1. El modal `prvRetencionesModal` NO estaba en la lista que POSPONE el sync mientras hay una
      decisión abierta. Con eso, el snapshot ni siquiera debería aplicarse.
   2. Aun así hay que RE-LEER del state vivo después del await: la primera capa no cubre el caso
      en que el snapshot entró justo antes de abrir el modal, y una sola capa ya falló antes.

   Y falta la tercera: `saveState()` sin `forceUploadNow()`. Para plata, el primer intento tiene
   que subir — no esperar al debounce. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— capa 1: el sync se pospone mientras el gerente decide —');
/* dentro de la LISTA de isUserBusy, no en cualquier parte del archivo (el id aparece también
   en el markup del propio modal, así que buscarlo suelto daba un falso positivo) */
const zBusy = (code.match(/document\.querySelector\('#prConfirmModal[^)]*\)/) || [''])[0];
ok('el modal de retenciones congela el applyRemote', /#prvRetencionesModal/.test(zBusy));
/* el panel de bodega NO va en esa lista a propósito (v961): es un espacio de trabajo largo.
   Un modal de decisión con un SÍ/NO al final es lo contrario: dura segundos y termina escribiendo. */
ok('y el panel de bodega sigue FUERA de la lista (decisión de v961)',
  !/_bodegaPanelModal[^']*'\)\) return true/.test(code));

console.log('\n— capa 2: se re-lee del state vivo DESPUÉS del await —');
const zA = ex(code, 'window.aprobarPlanillaRetenciones = async function(');
ok('existe la autorización de retenciones', zA.length > 400);
ok('vuelve a buscar el proyecto tras el modal', /activeProj\(\)[\s\S]*await[\s\S]*activeProj\(\)/.test(zA));
ok('vuelve a buscar la liquidación tras el modal',
  (zA.match(/retencionesPlanillas[\s\S]{0,30}\)\.find\(x => x\.id === retplId\)/g) || []).length >= 2);
ok('aborta si ya no existe', /YA NO EXISTE|RECARGÁ|RECARGA/.test(zA));

console.log('\n— y aborta si otro la autorizó mientras tanto —');
/* la re-validación mira el estado del objeto RECIÉN leído y corta antes de escribir nada */
ok('re-valida el estado antes de escribir',
  /_retplV\.estado !== 'pendiente_pm'[\s\S]{0,160}return;/.test(zA));
ok('avisa en rojo, no en silencio', /showToast\([^)]*'red'/.test(zA));

console.log('\n— capa 3: la plata sube de inmediato —');
ok('fuerza la subida (no espera el debounce)', /forceUploadNow/.test(zA));

console.log('\n— el mismo hueco en el ENVÍO al gerente —');
const zE = ex(code, 'async function _enviarRetencionesAlGerente(');
ok('existe el envío al gerente', zE.length > 200);
ok('también re-lee tras el await', /activeProj\(\)[\s\S]*await[\s\S]*activeProj\(\)/.test(zE));
ok('y también fuerza la subida', /forceUploadNow/.test(zE));

console.log('\n— lo que NO debe cambiar —');
ok('sigue sellando _ts en los pagos (regla de la plata)', /_ts = Date\.now\(\)/.test(zA));
ok('sigue generando el PDF', /_generarPDFRetencion/.test(zA));
ok('el estado sigue quedando aprobada', /estado = 'aprobada'/.test(zA));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
