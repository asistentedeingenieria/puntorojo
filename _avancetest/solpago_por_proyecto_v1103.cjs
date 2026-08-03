/* v1103 — LAS SOLICITUDES DE PAGO A OTRA PERSONA SALEN SOLO EN SU OBRA (Antonio):
   "estas solicitudes quiero que aparezcan únicamente en el proyecto que aplica. NO en todos
   los proyectos, como ahorita estoy en VEC y me está saliendo una solicitud de ESSENZA."

   state.solicitudesPagoEtapa es GLOBAL (una sola lista para toda la empresa) y
   _solPagoEtapaPendientes devolvía TODAS sin mirar la obra. Resultado: parado en Vicinia del
   Carmen aparecía el banner de una solicitud de Essenza, y autorizarla desde ahí genera el
   pago en la planilla de la obra equivocada.

   La solicitud YA guarda projectId desde v775 — solo faltaba usarlo. El filtro es por ID, no
   por nombre: filtrar por nombre de obra ya nos mordió antes (renombrar una obra hacía
   desaparecer sus datos). El parámetro es opcional: sin él sigue devolviendo todas, que es lo
   que necesita el contador global de la campanita. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* ojo: `typeof window._solPagoEtapaPendientes==='function'` también matchea un `=` suelto —
   hay que anclar a la ASIGNACIÓN de la función, no a cualquier igual */
const linea = (html.split('\n').find(l => /window\._solPagoEtapaPendientes\s*=\s*function\(/.test(l)) || '');
ok('existe _solPagoEtapaPendientes', linea.length > 20);
ok('acepta el proyecto por parámetro', /_solPagoEtapaPendientes = function\(\s*\w+/.test(linea));
ok('filtra por projectId (por ID, no por nombre)', /projectId/.test(linea));
ok('sin proyecto sigue devolviendo todas (contador global)', /!pid|pid \?|pid ==/.test(linea));

/* comportamiento real */
let f = null;
try { f = new Function('state', 'return (' + linea.replace(/^\s*window\._solPagoEtapaPendientes\s*=\s*/, '').replace(/;\s*$/, '') + ')'); } catch(e){}
ok('la función es aislable', !!f);
if (f) {
  const st = { solicitudesPagoEtapa: [
    { id:'a', estado:'pendiente', projectId:'p-vec' },
    { id:'b', estado:'pendiente', projectId:'p-essenza' },
    { id:'c', estado:'autorizada', projectId:'p-vec' },
  ]};
  const fn = f(st);
  ok('parado en VEC solo veo la de VEC', fn('p-vec').map(s=>s.id).join() === 'a');
  ok('la de ESSENZA no se cuela', fn('p-vec').every(s => s.projectId === 'p-vec'));
  ok('parado en ESSENZA veo la suya', fn('p-essenza').map(s=>s.id).join() === 'b');
  ok('sin argumento devuelve las 2 pendientes (global)', fn().length === 2);
  ok('nunca cuenta las ya resueltas', fn().every(s => s.estado === 'pendiente'));
}

console.log('\n— los tres lugares donde se usa —');
ok('el banner de la obra pasa el proyecto activo',
  /_solPagoEtapaPendientes\((?:\(?activeProj\(\)|_p|p)/.test(html) || /_solPagoEtapaPendientes\(\s*\(activeProj\(\)\|\|\{\}\)\.id/.test(html));
ok('el modal también filtra', /const pend = window\._solPagoEtapaPendientes\([^)]+\)/.test(html));
ok('el contador global de la campanita NO filtra (es de toda la empresa)',
  /n\+=window\._solPagoEtapaPendientes\(\)\.length/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
