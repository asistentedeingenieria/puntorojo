/* v1155 — HERRAMIENTAS DE TRABAJO EN BODEGA CENTRAL (sin precio, con devolución)

   Antonio (6-ago, noche): escaleras, atornilladoras y herramientas propias que salen de
   bodega a las obras SIN precio — no son gasto de la obra, son equipo de la empresa.
   Decisiones (AskUserQuestion): CON devolución (se ve dónde está cada una) y se piden EN
   EL PEDIDO NORMAL (categoría nueva), pero SIN pasar por compras/OC/finanzas ni gasto.

   ARQUITECTURA (las lecciones de la casa):
   · LIBRO state.herrMovs (ENTRADA/SALIDA/DEVOLUCION/AJUSTE) con saldo DERIVADO
     (_herrSaldos pura) — nunca un contador mutable (v959/v953/v950). Union-merge por id +
     tombstones herrMovsEliminados en applyRemote (espejo EXACTO del bloque de bodegaMovs).
     Contenedor nuevo que varios editan ⇒ APP_SYNC_VERSION 928 (v892/v972).
   · En el FORM del pedido, la categoría HERRAMIENTAS DE BODEGA es DINÁMICA (lo que la
     bodega tiene con saldo) y al ENVIAR sus claves se separan a pd.herramientas — JAMÁS
     entran a pd.items, así buildPedidoOcItems ni las ve y el circuito de compras queda
     intacto sin tocarlo.
   · El despacho es UN acto de bodega (_herrDespacharDePedido): valida el saldo COMPLETO
     antes de escribir (atómico — o va todo o no va nada), escribe las SALIDAs al proyecto
     del pedido, marca pd.herrDespacho {ts, por, fecha} y sella pd._ts. Hallazgo del mapeo:
     un pedido de SOLO herramientas jamás cierra por el circuito de OC (sin OC no hay
     RECIBIDO) — al despachar, si el pedido no tiene nada más, pasa a RECIBIDO directo. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* ══ 1. el saldo DERIVADO — PURA ══ */
console.log('— el libro y los saldos derivados —');
const zK = ex(html, 'function _herrKey(');
const zS = ex(html, 'function _herrSaldos(');
ok('existen _herrKey y _herrSaldos', !!zK && !!zS);
let saldos = null;
try { saldos = new Function('return (function(){ ' + zK + '\n' + zS + '\nreturn _herrSaldos; })()')(); } catch(e){}
ok('evalúan', typeof saldos === 'function');
if (saldos) {
  const movs = [
    { tipo: 'ENTRADA', name: 'ESCALERA TIJERA 8 PIES', qty: 6 },
    { tipo: 'SALIDA', name: 'escalera tijera 8 pies', qty: 3, obraId: 'essenza', obraDesc: 'ESSENZA FASE 2' },
    { tipo: 'SALIDA', name: 'ESCALERA TIJERA 8 PIES', qty: 1, obraId: 'vla' },
    { tipo: 'DEVOLUCION', name: 'ESCALERA TIJERA 8 PIES', qty: 1, obraId: 'essenza' },
    { tipo: 'ENTRADA', name: 'ATORNILLADORA DEWALT', qty: 2 },
    { tipo: 'AJUSTE', name: 'ATORNILLADORA DEWALT', qty: -1 },
    null
  ];
  const s = saldos(movs);
  const esc = s[Object.keys(s).find(k => k.indexOf('ESCALERA') >= 0)];
  ok('total = las entradas', esc && esc.total === 6);
  ok('en bodega = entradas − salidas + devoluciones', esc && esc.enBodega === 3);
  ok('se ve DÓNDE está cada una', esc && esc.porObra['essenza'] === 2 && esc.porObra['vla'] === 1);
  ok('mayúsculas/minúsculas son la MISMA herramienta', esc && esc.total === 6);
  const at = s[Object.keys(s).find(k => k.indexOf('ATORNILLADORA') >= 0)];
  ok('el AJUSTE con signo pega en total y bodega (merma/rotura)', at && at.total === 1 && at.enBodega === 1);
  ok('un mov nulo no revienta', !!s);
  ok('sin movs devuelve vacío', Object.keys(saldos([])).length === 0 && Object.keys(saldos(null)).length === 0);
}
ok('la fábrica _herrMov sella id/ts/_ts/quién', (function(){
  const z = ex(html, 'function _herrMov(');
  return /id:/.test(z) && /_ts/.test(z) && /porUsername/.test(z) && /_herrKey\(/.test(z);
})());

/* ══ 2. el sync: espejo del bloque de bodegaMovs + versión ══ */
console.log('\n— union-merge del libro (contenedor nuevo = régimen v972) —');
ok('applyRemote une herrMovs con tombstones (espejo de bodegaMovs)',
  /herrMovsEliminados[\s\S]{0,300}_mergeById\(\(state && state\.herrMovs\) \|\| \[\], merged\.herrMovs \|\| \[\]/.test(code));
ok('el changed enciende needsResync', /merged\.herrMovs = [\s\S]{0,80}needsResync = true/.test(code));
ok('APP_SYNC_VERSION subió a 928 o más', (Number((html.match(/APP_SYNC_VERSION = (\d+)/) || [])[1]) || 0) >= 928);

/* ══ 3. el form del pedido: categoría dinámica + separación al enviar ══ */
console.log('\n— la categoría en el pedido y la separación —');
ok('existe _herrDisponibles (lo que la bodega tiene con saldo)', /function _herrDisponibles\(/.test(code));
/* la concatenación vive en _bloquesPedido() — helper COMPARTIDO entre el render y los
   badges (si viviera solo en renderPedidoForm, el contador de la categoría no actualizaría) */
ok('el catálogo del pedido concatena la categoría DINÁMICA (_bloquesPedido)',
  /HERRAMIENTAS DE BODEGA/.test(ex(code, 'function _bloquesPedido(')) && /_bloquesPedido\(\)\.map/.test(ex(code, 'function renderPedidoForm(')));
const zSub = ex(code, 'async function submitPedido(');
ok('al enviar, las herramientas se SEPARAN a pd.herramientas', /herramientas/.test(zSub) && /HERRAMIENTAS DE BODEGA/.test(zSub));
ok('y se SACAN de items (jamás entran al circuito de compras)', /delete [\s\S]{0,40}\[_hk\]|delete _itemsPedido\[/.test(zSub) || /filter[\s\S]{0,120}HERRAMIENTAS DE BODEGA/.test(zSub));

/* ══ 4. el despacho desde el pedido ══ */
console.log('\n— bodega despacha (atómico, sin gasto, con cierre propio) —');
const zD = ex(code, 'window._herrDespacharDePedido = async function');
ok('existe y es async', zD.length > 600);
ok('gate de bodega (_puedeGestionarBodega)', /_puedeGestionarBodega\(\)/.test(zD));
ok('re-lee el pedido tras el modal (v769/v940)', zD.indexOf('_findPedidoGlobal') !== zD.lastIndexOf('_findPedidoGlobal'));
ok('valida TODO el saldo antes de escribir NADA (atómico)', /faltan|_falt/i.test(zD) && zD.search(/faltan|_falt/i) < zD.indexOf("'SALIDA'"));
ok('escribe SALIDAs al proyecto del pedido', /'SALIDA'/.test(zD) && /obraId/.test(zD));
ok('marca pd.herrDespacho con quién y cuándo', /herrDespacho = \{/.test(zD) && /por:/.test(zD));
ok('sella pd._ts (union-merge v972)', /\._ts = _t/.test(zD));
ok('sube de inmediato', /forceUploadNow/.test(zD));
ok('un pedido de SOLO herramientas pasa a RECIBIDO (no queda clavado sin OC)',
  /RECIBIDO/.test(zD) && /items|extras/.test(zD));
ok('deja rastro en el log', /logActivity/.test(zD));

/* ══ 5. la UI ══ */
console.log('\n— la sección en bodega y las tarjetas —');
ok('el panel de bodega tiene la sección HERRAMIENTAS DE TRABAJO', /HERRAMIENTAS DE TRABAJO/.test(html));
ok('con CARGAR, DESPACHAR y DEVOLUCIÓN', /_herrCargar\(/.test(code) && /_herrDespachar\(/.test(code) && /_herrDevolver\(/.test(code));
ok('la devolución escribe DEVOLUCION al libro', /'DEVOLUCION'/.test(code));
ok('la tarjeta del pedido pinta las herramientas solicitadas', /pd\.herramientas/.test(ex(code, 'function renderPedidoCard(')));
ok('con el botón de despachar para bodega', /_herrDespacharDePedido\(/.test(ex(code, 'function renderPedidoCard(')));
ok('el detalle del pedido también las muestra', /herramientas/.test(ex(code, 'function openPedidoDetalle(')));

/* ══ 6. lo que NO cambia ══ */
console.log('\n— el circuito de compras ni se entera —');
ok('buildPedidoOcItems NO toca pd.herramientas', !/herramientas/.test(ex(code, 'function buildPedidoOcItems(')));
ok('el libro de MATERIALES sigue aparte (bodegaMovs intacto)', /bodegaMovsEliminados/.test(code));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
