/* v1034 — EL BLOQUE "TODA LA EMPRESA" NO LO VE NADIE POR DEFECTO.
   Antonio: "necesito que ahorita predeterminadamente me pongas de una vez que todos los
   usuarios NO pueden ver nada de la foto 2. Yo les debo de dar acceso en su usuario."

   Estado que encontró esta versión (por eso lo veía todo el mundo):
   - BODEGA CENTRAL / PROYECTOS VARIOS / ADMINISTRACIÓN ya iban por menu.* (v1023) ✓
   - USUARIOS por users.manage ✓
   - DASHBOARD EJECUTIVO iba por view.dashboard — que es el permiso de la PESTAÑA dashboard,
     algo que casi todos tienen. Ese era el que se colaba.
   - Y el rótulo "TODA LA EMPRESA" salía siempre, aunque abajo no quedara ni un botón.

   ⚠️ TRAMPA que hacía inútil el checkbox: can() atiende el caso SOLO LECTURA (view.*) ANTES
   de mirar si el permiso está marcado, así que a un usuario de solo lectura no se le podía
   dar menu.bodega — la casilla no hacía nada. Los menu.* son pura navegación (no escriben),
   así que se respetan cuando están marcados. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. el dashboard ejecutivo tiene su propio permiso —');
ok('existe el permiso menu.dashboard', /key: 'menu\.dashboard'/.test(html));
ok('vive con los otros del menú principal', /key: 'menu\.dashboard'[^}]*group: 'MENÚ PRINCIPAL'/.test(html));
const zD = ex('function _puedeVerDashboardGeneral(');
ok('existe la función de permiso', zD.length > 40);
ok('sale de menu.dashboard', /can\('menu\.dashboard'\)/.test(zD));
/* view.dashboard es el permiso de la PESTAÑA, no de la entrada del menú: quien tenga la
   pestaña NO debe por eso ver la opción de empresa */
ok('ya NO sale de view.dashboard', !/view\.dashboard/.test(zD));

console.log('\n— 2. las cinco opciones son default-deny —');
const gates = {
  '_puedeVerDashboardGeneral': 'menu.dashboard',
  '_puedeVerBodega': 'menu.bodega',
  '_puedeVerVarios': 'menu.varios',
  '_puedeVerAdmin': 'menu.admin',
};
Object.keys(gates).forEach(function(fn){
  const z = ex('function ' + fn + '(');
  /* si la función todavía no existe, la extracción viene vacía y `new Function` revienta:
     se atrapa acá para que el test REPRUEBE en vez de tumbar la corrida */
  const f = perm => { try { return new Function('can', 'return (' + z + ')')(p => p === perm)(); } catch(e){ return null; } };
  ok(fn + ': sin permisos NO ve nada', f('__ninguno__') === false);
  ok(fn + ': con ' + gates[fn] + ' sí entra', f(gates[fn]) === true);
  ok(fn + ': el admin (users.manage) sigue entrando', f('users.manage') === true);
});
/* USUARIOS ya era default-deny: users.manage no se da por defecto */
ok('USUARIOS sigue pidiendo users.manage', /can\('users\.manage'\)/.test(ex('window._abrirPanelUsuarios = function')));

console.log('\n— 3. si no puede ver ninguna, NO sale ni el rótulo —');
const zB = ex('function _bloqueEmpresaHTML(');
ok('el bloque se arma aparte, para poder no pintarlo', zB.length > 200);
let fB = null;
try {
  fB = (perms) => new Function('can','_puedeVerDashboardGeneral','_puedeVerBodega','_puedeVerVarios','_puedeVerAdmin',
    'return (' + zB + ')')(
      p => perms.indexOf(p) >= 0,
      () => perms.indexOf('menu.dashboard') >= 0,
      () => perms.indexOf('menu.bodega') >= 0,
      () => perms.indexOf('menu.varios') >= 0,
      () => perms.indexOf('menu.admin') >= 0)();
  ok('un usuario común no ve NADA del bloque', fB([]) === '');
  ok('ni el rótulo TODA LA EMPRESA', fB([]).indexOf('TODA LA EMPRESA') < 0);
  const soloBodega = fB(['menu.bodega']);
  ok('con un solo permiso sí sale el rótulo', soloBodega.indexOf('TODA LA EMPRESA') >= 0);
  /* v1040: la tarjeta dice COMPRAS (mismo permiso menu.bodega) */
  ok('y solo esa opción', soloBodega.indexOf('COMPRAS') >= 0
     && soloBodega.indexOf('DASHBOARD EJECUTIVO') < 0
     && soloBodega.indexOf('ADMINISTRACIÓN') < 0
     && soloBodega.indexOf('PROYECTOS VARIOS') < 0
     && soloBodega.indexOf('USUARIOS') < 0);
  const todo = fB(['menu.dashboard','users.manage','menu.bodega','menu.varios','menu.admin']);
  ok('el admin las sigue viendo todas', ['DASHBOARD EJECUTIVO','USUARIOS','COMPRAS','PROYECTOS VARIOS','ADMINISTRACIÓN']
     .every(t => todo.indexOf(t) >= 0));
  /* Antonio v1030: "quiero que todos los cuadros estén del mismo tamaño" */
  ok('los cinco cuadros se arman con el mismo molde', (todo.match(/padding:12px 16px;border-radius:10px/g) || []).length === 5);
} catch(e){ console.log('   (no evaluable: ' + e.message + ')'); ['nada','rotulo','rotulo si','solo esa','admin todo','mismo molde'].forEach(n => ok(n, false)); }
const zP = ex('window._abrirPantallaObra = function');
ok('la pantalla usa el bloque, no lo escribe fijo', /_bloqueEmpresaHTML\(\)/.test(zP));
ok('el rótulo ya no está suelto en la pantalla', zP.indexOf('TODA LA EMPRESA') < 0);

console.log('\n— 4. entrar al dashboard también se cuida (no solo esconder el botón) —');
/* mismo criterio que _abrirPanelBodega: la puerta se cierra en la función, no solo en la
   vista — si no, queda abierta para cualquiera que sepa el nombre */
ok('_verDashboardGeneral revisa el permiso', /_puedeVerDashboardGeneral\(\)/.test(ex('window._verDashboardGeneral = function')));

console.log('\n— 5. la casilla también sirve para un usuario de SOLO LECTURA —');
const zC = ex('function can(');
let fC = null;
try {
  fC = (u) => new Function('getCurrentUser','_permEsSoloVer','return (' + zC + ')')(
    () => u,
    p => (p.indexOf('view.') === 0 || p.indexOf('kpis.') === 0));
} catch(e){}
try {
  const ro = fC({ perms: ['view.*'] });
  ok('solo lectura sin la casilla NO ve bodega central', ro('menu.bodega') === false);
  const roCon = fC({ perms: ['view.*', 'menu.bodega'] });
  ok('solo lectura CON la casilla sí la ve', roCon('menu.bodega') === true);
  /* el blindaje de v866 sigue: ver todo, no modificar nada */
  ok('y sigue sin poder modificar', roCon('pedidos.create') === false && roCon('materiales.edit') === false);
  ok('las vistas le siguen saliendo', roCon('view.cobro') === true);
  /* un usuario normal no gana nada por este cambio */
  const normal = fC({ perms: ['view.cobro'] });
  ok('un usuario normal sigue sin ver el menú de empresa', normal('menu.bodega') === false && normal('menu.dashboard') === false);
  const admin = fC({ perms: ['*'] });
  ok('el admin sigue viendo todo', admin('menu.dashboard') === true);
} catch(e){ console.log('   (no evaluable: ' + e.message + ')'); ['ro sin','ro con','ro no escribe','ro ve','normal no','admin si'].forEach(n => ok(n, false)); }

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
