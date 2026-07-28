/* v999 (corrección de Antonio sobre v998): "prefiero darle la opción de que pueda ver bodega
   central y que desde ahí ella autorice, y que TODAS esas OC se manejen en bodega central,
   porque todo es ahí y no es de un proyecto en específico."

   v998 había hecho lo contrario: mezclar las OC de abastecimiento en la pestaña ÓRDENES DE
   COMPRA del proyecto activo. Se revierte — el abastecimiento no pertenece a ningún proyecto.

   En su lugar: quien AUTORIZA órdenes (compras.revisar) puede ENTRAR a BODEGA CENTRAL, y
   dentro tiene su bandeja "OC PENDIENTES DE AUTORIZAR" con el botón de firma. El permiso
   materiales.bodega sigue siendo asignable por persona para quien Antonio quiera. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. las OC de bodega NO se mezclan con las del proyecto ──
const zL = ex('function renderOrdenesList(');
ok('el listado del proyecto vuelve a mostrar SOLO sus órdenes', !/_bodegaMatStore\(\)/.test(zL));
ok('sin el chip de abastecimiento ahí', !/ABASTECIMIENTO · BODEGA CENTRAL/.test(zL));

// ── 2. quien autoriza puede ENTRAR a bodega central ──
const zV = ex('function _puedeVerBodega(');
ok('el gate de entrada incluye a quien autoriza OCs', /compras\.revisar/.test(zV));
ok('sigue entrando bodega y el admin', /materiales\.bodega/.test(zV) && /users\.manage/.test(zV));
let fV = null;
try { fV = new Function('can', 'return (' + zV + ')'); } catch(e){}
if (fV) {
  const conPerm = p => fV(k => k === p)();
  /* v1023: los permisos de compras YA NO abren bodega — se da menu.bodega aparte */
ok('finanzas ya NO entra por compras.revisar', conPerm('compras.revisar') === false);
ok('pero SI con el permiso propio del menu', conPerm('menu.bodega') === true);
  ok('bodega ya NO entra por materiales.bodega', conPerm('materiales.bodega') === false);
  ok('el admin entra', conPerm('users.manage') === true);
  ok('alguien sin ninguno NO entra', fV(() => false)() === false);
}

// ── 3. bandeja de autorización DENTRO de bodega central ──
ok('hay una sección de OC pendientes de autorizar', /OC PENDIENTES DE AUTORIZAR/.test(html));
const iPend = html.indexOf('OC PENDIENTES DE AUTORIZAR');
const zPend = iPend > 0 ? html.slice(iPend - 2200, iPend + 1800) : '';
ok('lista las de bodega que están pendientes', /_bodegaOcsPorAutorizar/.test(html));
const zFn = ex('function _bodegaOcsPorAutorizar(');
ok('existe el selector', !!zFn);
let fSel = null;
try { fSel = new Function('return (' + zFn + ')')(); } catch(e){}
if (fSel) {
  const ocs = [
    { id:'a', status:'PENDIENTE_AUTORIZACION', numero:'BODEGA – 2 - OC 1' },
    { id:'b', status:'AUTORIZADA',             numero:'BODEGA – 2 - OC 2' },
    { id:'c',                                   numero:'BODEGA – 3 - OC 1' }  // sin status = autorizada (legado)
  ];
  ok('solo las pendientes', fSel(ocs).length === 1 && fSel(ocs)[0].id === 'a');
  ok('lista vacía no rompe', fSel([]).length === 0 && fSel(null).length === 0);
}
const iH = html.indexOf('const _porAutorizarHTML');
const zH = iH > 0 ? html.slice(iH, iH + 1800) : '';
ok('el botón de firmar está en esa bandeja', /autorizarOrden\('\$\{o\.id\}'\)/.test(zH));
ok('y el borrador se puede revisar antes', /previewOrden\('\$\{o\.id\}'\)/.test(zH));
ok('cita de qué pedido viene', /DEL PEDIDO/.test(zH));
// la bandeja solo se pinta a quien autoriza
ok('solo la ve quien autoriza', /_porAutorizar\.length && _puedeAutOc/.test(html));
ok('_puedeAutOc sale del helper único', /const _puedeAutOc = _puedeAutorizarOc\(\)/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
