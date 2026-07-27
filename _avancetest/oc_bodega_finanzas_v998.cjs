/* v998 (reporte de Antonio 27-jul): "estas OC también necesito que las autorice finanzas, que
   son los mismos que autorizan las OC de los pedidos".

   CAUSA: renderOrdenesList —la pestaña ÓRDENES DE COMPRA donde finanzas revisa y firma— solo
   leía p.materiales.ordenes. Las órdenes de ABASTECIMIENTO viven en el store global
   (state.bodegaMat.ordenes, v964), así que nunca aparecían ahí: quedaban escondidas dentro
   del panel de BODEGA CENTRAL, que finanzas no abre. El gate de autorizarOrden ya era el
   correcto (compras.revisar) — lo que faltaba era que las VIERA.

   FIX: el listado de órdenes concatena las de bodega, marcadas como ABASTECIMIENTO, y el
   botón AUTORIZAR del panel de bodega solo se le pinta a quien puede autorizar.

   Además (queja del mismo mensaje): la lista de pedidos de abastecimiento salía 4, 3, 2 —
   ordenada por fecha descendente. Va por correlativo ascendente. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* v999 — CORRECCIÓN DE RUMBO (Antonio): v998 había llevado las OC de abastecimiento a la
   pestaña del proyecto. Él prefirió lo contrario: que TODO el abastecimiento se maneje
   dentro de BODEGA CENTRAL, porque no pertenece a ningún proyecto, y que quien autoriza
   entre ahí. Esa parte se revirtió — la fija _avancetest/bodega_finanzas_v999.cjs.
   Lo que sigue vigente de v998: el gate único de autorización y el orden ascendente. */
ok('el gate de autorizar sigue siendo el del revisor', /can\('compras\.revisar'\)/.test(ex('async function autorizarOrden(')));
ok('autorizarOrden encuentra las OC de bodega', /_bodegaFindOc\(id\)/.test(ex('async function autorizarOrden(')));

// ── 2. orden de los pedidos de abastecimiento ──
const iPan = html.indexOf('PEDIDOS DE ABASTECIMIENTO del store global');
const zPan = iPan > 0 ? html.slice(iPan, iPan + 1600) : '';
ok('los pedidos de abastecimiento se ordenan por correlativo ascendente', /_ordAscNum|_numPedidoOrd/.test(zPan));
const mOrd = html.match(/const _numPedidoOrd = (.+);\r?\n/);
if (mOrd) {
  const f = new Function('return (' + mOrd[1] + ')')();
  ok('lee el correlativo del final', f({ numero:'BODEGA – 4' }) === 4 && f({ numero:'BODEGA – 12' }) === 12);
  ok('también los viejos con ceros', f({ numero:'BODEGA – 00003' }) === 3);
  ok('sin número no rompe el orden', typeof f({}) === 'number');
  const arr = [{ numero:'BODEGA – 4' }, { numero:'BODEGA – 2' }, { numero:'BODEGA – 3' }].sort((a,b) => f(a) - f(b));
  ok('quedan 2, 3, 4 (no 4, 3, 2)', arr.map(x => x.numero.slice(-1)).join('') === '234');
} else ok('_numPedidoOrd evaluable', false);

// ── 3. el botón AUTORIZAR del panel de bodega solo para quien autoriza ──
ok('el botón AUTORIZAR se pinta solo a quien puede', /_puedeAutorizarOc/.test(zPan));
const zPA = ex('function _puedeAutorizarOc(');
ok('existe el helper de permiso', !!zPA);
ok('usa el mismo permiso que autorizarOrden', /compras\.revisar/.test(zPA) && /users\.manage/.test(zPA));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
