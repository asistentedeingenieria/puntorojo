/* v959 (pedido de Antonio 23-jul): en el LISTADO COMPLETO de pólizas, cuando el filtro de
   estatus es CANCELADA, las filas se ordenan por la FECHA DE BAJA (la del OBS) de la más
   reciente a la más vieja; empates o sin fecha caen al orden alfabético v356. Con cualquier
   otro filtro el orden sigue siendo alfabético por asegurado. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFrom(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. existe el ordenador puro y es evaluable ──
const src = extractFrom('window._polOrdenListado = function');
ok('_polOrdenListado existe', !!src);
let fn = null;
try { fn = new Function('return (function' + src.slice(src.indexOf('(')) + ')')(); } catch(e){}
ok('_polOrdenListado evaluable', typeof fn === 'function');

if (typeof fn === 'function') {
  const filas = [
    { aseguradoNombre: 'ZULMA', estatus: 'CANCELADA', fechaBaja: '2026-05-25' },
    { aseguradoNombre: 'ABNER', estatus: 'CANCELADA', fechaBaja: '2026-06-26' },
    { aseguradoNombre: 'CARLOS', estatus: 'CANCELADA', fechaBaja: '2026-06-04' },
    { aseguradoNombre: 'BETO', estatus: 'CANCELADA' } // sin fecha de baja
  ];
  // ── 2. con filtro CANCELADA: baja más reciente primero, sin fecha al final ──
  const orden = fn(filas.slice(), 'CANCELADA').map(x => x.aseguradoNombre);
  ok('CANCELADA ordena por fechaBaja desc', JSON.stringify(orden) === JSON.stringify(['ABNER','CARLOS','ZULMA','BETO']));
  // ── 3. empate de fecha cae a alfabético ──
  const empate = fn([
    { aseguradoNombre: 'ZETA', fechaBaja: '2026-06-04' },
    { aseguradoNombre: 'ALFA', fechaBaja: '2026-06-04' }
  ], 'CANCELADA').map(x => x.aseguradoNombre);
  ok('empate de fecha -> alfabético', JSON.stringify(empate) === JSON.stringify(['ALFA','ZETA']));
  // ── 4. con otro filtro sigue alfabético puro (v356) ──
  const alfa = fn(filas.slice(), 'todas').map(x => x.aseguradoNombre);
  ok('todas -> alfabético v356', JSON.stringify(alfa) === JSON.stringify(['ABNER','BETO','CARLOS','ZULMA']));
}

// ── 5. el render del listado USA el ordenador (no quedó el sort viejo suelto) ──
const zRender = extractFrom('window.renderPlanillaPolizas = function');
ok('renderPlanillaPolizas llama _polOrdenListado', /_polOrdenListado\(/.test(zRender));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
