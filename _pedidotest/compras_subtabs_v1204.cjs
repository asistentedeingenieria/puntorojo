/* v1204 — DOS COSAS (13-ago tarde):

   1. SUBPESTAÑAS (Antonio: "más ordenado... que se pueda seleccionar OC - DESP - OP etc
      y que en esas pestañas estén únicamente los que correspondan"):
      · ÓRDENES DE COMPRA: TODAS · OC · DESP · OP · DPP · TRAS — filtro por _ocSerieDe,
        solo series presentes, con conteo; el filtro con serie ya inexistente se auto-resetea.
      · PEDIDOS (decisión de Antonio: por ESTADO): TODOS · SOLICITADOS · EN COMPRA/APROBADOS
        · RECIBIDOS — el historial colapsable se mantiene en TODOS; RECIBIDOS lo muestra directo.

   2. ALARMA DE RELOJ TORCIDO (incidente Erlin: aparato 9 días atrás desde julio — sellos
      "4-8-26" en OCs del 13-ago y sus _ts perdían todos los merges en silencio): el
      dispositivo ATRASADO es el único que ve stamps remotos "del futuro"; si llegan >24 h
      adelante, la app le avisa a ESE aparato (rojo, re-avisa cada 10 min) — cero falsos
      positivos en los demás. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— ÓRDENES: subpestañas por serie —');
const ro = ex(code, 'function renderOrdenesList(');
ok('el filtro vive en window._ocSerieFiltro', /_ocSerieFiltro/.test(ro));
ok('filtra por la serie real (_ocSerieDe)', /_ocSerieDe\(o\) === _fSer/.test(ro));
ok('solo series PRESENTES, con conteo', /\['OC','DESP','OP','DPP','TRAS'\]\.filter\(s => _serCounts\[s\]\)/.test(ro));
/* v1205 (Antonio: "NO debe decir ningún número en el título"): las subpestañas van SIN
   conteo — solo el nombre. Los conteos internos (_serCounts) siguen, pero solo para
   decidir qué series ofrecer. */
ok('las subpestañas van SIN números (v1205)', /window\._ocSerieSub\(''\)">TODAS<\/button>/.test(ro) && !/TODAS · \$\{/.test(ro) && /window\._pedEstadoSub\('REC'\)">RECIBIDOS<\/button>/.test(code));
ok('filtro huérfano se auto-resetea (cambio de proyecto)', /!_serCounts\[window\._ocSerieFiltro\]\) window\._ocSerieFiltro = ''/.test(ro));
ok('la barra también sale con la lista vacía (para poder volver)', (ro.match(/_serBar/g) || []).length >= 2);
ok('el click re-renderiza', /window\._ocSerieSub = function/.test(code) && /renderOrdenesList\(\)/.test(ex(code, 'window._ocSerieSub = function')));

console.log('\n— PEDIDOS: subpestañas por estado —');
const rp = ex(code, 'function renderPedidosList(');
ok('el filtro vive en window._pedEstadoFiltro', /_pedEstadoFiltro/.test(rp));
ok('SOLICITADOS filtra ese estado', /'SOL'/.test(rp) && /status === 'SOLICITADO'/.test(rp));
ok('EN COMPRA agrupa EN COMPRA + APROBADO', /'COMPRA'/.test(rp) && /EN COMPRA' \|\| pd\.status === 'APROBADO/.test(rp));
ok('RECIBIDOS muestra el historial directo (sin colapsable)', /'REC'/.test(rp));
ok('en TODOS el historial colapsable sigue', /togglePedidosHistorial/.test(rp));
ok('el click re-renderiza', /window\._pedEstadoSub = function/.test(code) && /renderPedidosList\(\)/.test(ex(code, 'window._pedEstadoSub = function')));

console.log('\n— ALARMA DE RELOJ TORCIDO —');
const asm = ex(code, '_assembleFromSnap(snap){');
ok('el ensamblado registra el stamp remoto MÁS NUEVO', /_maxStampVisto/.test(asm) && /_lastUpdate/.test(asm));
const iF = code.indexOf('this._snapCoalesce = setTimeout(');
const zF = code.slice(iF, iF + 2600);
ok('el flush avisa si los stamps vienen >24 h en el futuro', /_maxStampVisto/.test(zF) && /24 \* 3600e3/.test(zF));
ok('re-avisa cada 10 min mientras persista (no una sola vez)', /600e3/.test(zF));
ok('el aviso dice QUÉ hacer (corregir la fecha del aparato)', /FECHA\/HORA DE ESTE DISPOSITIVO/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
