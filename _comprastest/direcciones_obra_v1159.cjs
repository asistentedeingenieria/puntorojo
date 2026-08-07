/* v1159 — BASE CENTRAL DE DIRECCIONES DE ENTREGA POR OBRA (APP_SYNC 929)

   Antonio (7-ago, tras fallar el seed v1158): "quiero que detecte automaticamente SIEMPRE
   dependiendo de la obra seleccionada... habilitame una opcion donde la de compras y yo
   podamos configurar las direcciones de las obras aparte y que ahi se guarde la base de
   datos y siempre se use esa base."

   POR QUÉ FALLÓ v1158: el seed usaba el proyecto ACTIVO (activeProj) en vez del proyecto
   DEL PEDIDO — abierto desde COMPRAS · TODA LA EMPRESA apuntaba a otro contenedor y nunca
   sembró. LECCIÓN: en flujos globales, el contexto es EL DEL PEDIDO, no el activo.

   ARQUITECTURA:
   · state.direccionesObra = { [proyectoId]: {direccion, contacto, telefono, _ts} } —
     base CENTRAL en el core, resuelta por ID de la obra del pedido (v1012: la pertenencia
     va por ID). Cada entrada sella _ts y applyRemote las une POR CLAVE con el _ts mayor
     (dos editando a la vez no se pisan) ⇒ APP_SYNC 929.
   · Pantalla DIRECCIONES DE ENTREGA en COMPRAS (gate compras.autorizar||users.manage):
     una fila por obra + OFICINA, y GUARDAR.
   · El modal de OC consulta la base por pd.proyectoId PRIMERO; sin entrada cae al
     mecanismo viejo (p.materiales.direccionesEntrega, v918) y al final al genérico.
   · Seeds por NOMBRE de obra (id real de state.projects, jamás inventado — v950):
     VICINIA DEL CARMEN y ESSENZA nacen configuradas; idempotente por existencia. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* ══ 1. la resolución central — PURA ══ */
console.log('— la base central y su resolución —');
const zR = ex(html, 'function _dirObraDe(');
ok('existe _dirObraDe (resuelve por ID de la obra)', !!zR);
let resolver = null;
try { resolver = new Function('state', 'return (' + zR + ')'); } catch(e){}
ok('evalúa', typeof resolver === 'function');
if (resolver) {
  const st = { direccionesObra: { 'vdc': { direccion: '29 CALLE 1-09, COLONIA EL CARMEN ZONA 12', contacto: 'FRANCISCO CHACAT', telefono: '4705 4324', _ts: 1 } } };
  const f = resolver(st);
  const d = f('vdc');
  ok('resuelve la entrada por proyectoId', d && d.direccion.indexOf('1-09') >= 0);
  ok('el TEXTO armado lleva dirección — CONTACTO: nombre tel', /1-09[\s\S]*CONTACTO: FRANCISCO CHACAT 4705 4324/.test(f('vdc', true)));
  ok('obra sin entrada devuelve null (cae al mecanismo viejo)', f('otra') === null && f('') === null);
  ok('una entrada sin dirección real no cuenta', (function(){ const g = resolver({ direccionesObra: { x: { direccion: '  ', _ts: 1 } } }); return g('x') === null; })());
}

/* ══ 2. el merge por clave (dos editando no se pisan) + versión ══ */
console.log('\n— el sync de la base —');
ok('applyRemote une direccionesObra POR CLAVE con el _ts mayor',
  /direccionesObra[\s\S]{0,400}_ts[\s\S]{0,200}_ts/.test(code.slice(code.indexOf('applyRemote'), code.indexOf('applyRemote') + 60000)));
ok('APP_SYNC_VERSION subió a 929 o más', (Number((html.match(/APP_SYNC_VERSION = (\d+)/) || [])[1]) || 0) >= 929);

/* ══ 3. la pantalla de configuración ══ */
console.log('\n— la pantalla DIRECCIONES DE ENTREGA —');
const zP = ex(code, 'window._abrirDireccionesObra = function');
ok('existe la pantalla', zP.length > 500);
ok('para compras y admin', /compras\.autorizar/.test(zP) && /users\.manage/.test(zP));
ok('una fila por obra con dirección, contacto y teléfono', /direccion/.test(zP) && /contacto/.test(zP) && /telefono/.test(zP));
const zG = ex(code, 'window._guardarDireccionesObra = function');
ok('GUARDAR sella _ts por entrada modificada', /_ts = /.test(zG) || /_ts:/.test(zG));
ok('y sube de inmediato', /forceUploadNow/.test(zG));
ok('el botón vive en COMPRAS', /_abrirDireccionesObra\(\)/.test(code) && /DIRECCIONES DE ENTREGA/.test(html));

/* ══ 4. el modal de OC usa la base PRIMERO, por la obra DEL PEDIDO ══ */
console.log('\n— el modal de OC —');
const iDirs = code.indexOf('const _dirs = p.materiales.direccionesEntrega');
const zModal = code.slice(Math.max(0, iDirs - 3500), iDirs + 1200);
ok('consulta la base central por pd.proyectoId (la obra DEL PEDIDO, no la activa)',
  /_dirObraDe[\s\S]{0,120}pd\.proyectoId|pd\.proyectoId[\s\S]{0,120}_dirObraDe/.test(zModal));
ok('con entrada central, la dirección se pone SOLA (sin warning)', /_dirCentral/.test(zModal));
ok('sin entrada, el mecanismo viejo sigue (v918)', /_dirs\.find\(d => _normDir\(d\.label\)/.test(zModal));

/* ══ 5. los seeds por nombre (id real, jamás inventado) ══ */
console.log('\n— las direcciones que nacen configuradas —');
const iSeed = code.indexOf('_seedDireccionesObra');
ok('existe el sembrador', iSeed >= 0);
const zS = ex(code, 'function _seedDireccionesObra(');
ok('VICINIA DEL CARMEN nace con su dirección', /29 CALLE 1-09/.test(zS) && /FRANCISCO CHACAT/.test(zS));
ok('ESSENZA nace con la suya (los dos contactos)', /16 CALLE 14-35/.test(zS) && /RONY RIVERA/.test(zS) && /DAVID SURET/.test(zS));
ok('los ids salen de state.projects por NOMBRE (jamás inventados — v950)', /state\.projects/.test(zS) && /\.name/.test(zS));
ok('idempotente: solo siembra si la obra NO tiene entrada', /direccionesObra\[[^\]]+\]/.test(zS) && /if \(!/.test(zS));
ok('el seed v1158 defectuoso se retiró (lo reemplaza la base central)', !/dir-vdc-seed/.test(code));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
