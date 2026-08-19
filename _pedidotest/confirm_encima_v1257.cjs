/* v1257 (Antonio, 18-ago: "cuando pongo PEDIR ETAPA no me sale el cuadro — se esconde
   atrás y sale hasta que presiono afuera. Que eso NO pase nunca"):
   CAUSA RAÍZ: los diálogos universales (prConfirm/prAlert/prPrompt) nacían con
   z-index:99999 y los modales de la app llegan hasta 100400 (el de PEDIR DE RECETA:
   100070) — cualquier confirm abierto DESDE un modal quedaba escondido detrás.
   REGLA: el diálogo de confirmación es SIEMPRE la capa más alta de la interfaz
   (100500), solo debajo del toast (999999). Los modales comunes NO se suben (taparían
   a los confirms). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

['prConfirmModal', 'prAlertModal', 'prPromptModal'].forEach(id => {
  const i = html.indexOf(`id="${id}" class="prModal-backdrop"`);
  ok(`${id} vive en la capa 100500`, i > 0 && /z-index:100500/.test(html.slice(i, i + 400)));
});

/* ningún modal de la app puede estar por ENCIMA de los confirms (el toast sí, 999999) */
const zs = (html.match(/z-index:1\d{5}/g) || []).map(s => Number(s.slice(8)));
const maxOtro = Math.max.apply(null, zs.filter(z => z !== 100500));
ok('ningún otro z-index de seis cifras supera a los confirms (' + maxOtro + ' < 100500)', maxOtro < 100500);
ok('el toast sigue arriba de todo', /\.toast\{[^}]*z-index:999999/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
