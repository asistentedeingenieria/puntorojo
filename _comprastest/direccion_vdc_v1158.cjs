/* v1158 — LA DIRECCIÓN DE VICINIA DEL CARMEN SEMBRADA: siempre sale en sus OC

   Antonio (7-ago, con el impreso viejo como referencia): "LA FOTO 2 ES LA DIRECCION DE
   VICINIA DEL CARMEN. COLOCALA TU DE UNA VEZ PARA QUE SIEMPRE SALGA EN LAS OC."
   → 29 CALLE 1-09, COLONIA EL CARMEN ZONA 12 — CONTACTO: FRANCISCO CHACAT 4705 4324.

   CÓMO: las direcciones viven en p.materiales.direccionesEntrega (data por proyecto) y el
   modal de OC auto-selecciona la que matchea el nombre de la obra (v918). El precedente es
   el self-heal v984 (dirección de OFICINAS), que corre AL ABRIR el modal: acá se SIEMBRA
   la de VICINIA DEL CARMEN si el proyecto no la tiene. Guardas:
   · idempotente por CONTENIDO (si ya hay una dirección con 1-09 / EL CARMEN, no crea) y
   · id FIJO 'dir-vdc-seed' (lección v950: los seeds con ids random se triplican). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— el seed de la dirección —');
const i0 = code.indexOf('dir-vdc-seed');
ok('existe el seed con id FIJO (v950: jamás uid() en un seed)', i0 >= 0);
const z = code.slice(Math.max(0, i0 - 1200), i0 + 900);
ok('solo para la obra VICINIA (DEL) CARMEN', /VICINIA (DEL |EL )?CARMEN/i.test(z));
ok('la dirección es la del formato real', /29 CALLE 1-09/.test(z) && /EL CARMEN ZONA 12/i.test(z));
ok('con el contacto y teléfono', /FRANCISCO CHACAT/.test(z) && /4705 4324/.test(z));
ok('idempotente por CONTENIDO antes de crear', /1-09|EL CARMEN/.test((z.match(/some\(([\s\S]{0,220})\)/) || ['',''])[1]));
ok('sube de inmediato al sembrar', /forceUploadNow/.test(z));
/* hay DOS heals con '4TA AVENIDA' (uno en el arranque, otro en el modal) — se ancla al
   ÚLTIMO, que es el del modal de OC */
ok('corre al abrir el modal de OC (junto al self-heal v984)',
  code.lastIndexOf('4TA AVENIDA 20-51') > 0 && Math.abs(code.indexOf('dir-vdc-seed') - code.lastIndexOf('4TA AVENIDA 20-51')) < 4000);

console.log('\n— el match automático de la obra sigue (v918) —');
ok('la dirección con el nombre de la obra se auto-selecciona',
  /_dirObra = _dirs\.find\(d => _normDir\(d\.label\)\.includes\(_normDir\(_obraNombre\)\)/.test(code));
ok('el label del seed contiene el nombre de la obra (para que matchee)',
  /label:\s*'[^']*VICINIA DEL CARMEN[^']*'/.test(z));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
