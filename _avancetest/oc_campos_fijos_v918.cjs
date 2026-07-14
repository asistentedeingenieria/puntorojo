/* v918 (pedido de Antonio sobre el modal de OC, 4 puntos):
   (1) FECHA (día en que se genera la OC) NO editable — input disabled.
   (2) PROVEEDOR auto por material: si la memoria v916 no tiene entrada, se busca en
       las OCs YA GENERADAS del proyecto (la más reciente primero) con qué proveedor
       se compró ese material (_provHistoricoPorItem) → su primera OC de postes ya enseña.
   (3) ENTREGAR A = la obra del pedido, automática: si hay una dirección guardada que
       coincide con el nombre del proyecto se selecciona; si no, se propone "OBRA — X".
   (4) PROYECTO y ÁREA/NIVEL — ETAPA NO editables — inputs readonly. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('async function '+name+'('); if(m<0) m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1 y 4: campos bloqueados ──
ok('FECHA de la OC bloqueada (disabled)', /<input id="ocFecha" type="date"[^>]*disabled/.test(html));
ok('PROYECTO bloqueado (readonly)', /<input id="ocProyecto" type="text"[^>]*readonly/.test(html));
ok('ÁREA/NIVEL bloqueado (readonly)', /<input id="ocArea" type="text"[^>]*readonly/.test(html));
ok('FECHA DE ENTREGA sigue editable (compras puede cambiarla)', /<input id="ocFechaEntrega" type="text"(?![^>]*readonly)(?![^>]*disabled)/.test(html));

// ── 2: proveedor histórico por material ──
const deps = extractFn('normOcName') + '\n' + extractFn('_ocItemMemKey') + '\n';
const srcHist = extractFn('_provHistoricoPorItem');
ok('_provHistoricoPorItem existe', !!srcHist);
if (srcHist) {
  const f = new Function(deps + srcHist + '\nreturn _provHistoricoPorItem;')();
  const key = new Function(deps + 'return _ocItemMemKey;')()("POSTE DE 2½\" X 9.19' (0.35) CAL. 26 (MEDIDA ESPECIAL 2.8 m)");
  const p = { materiales: { ordenes: [
    { proveedorId:'pr-viejo', items:[{ name:"POSTE DE 2½\" X 9.19' (0.35) CAL. 26 (MEDIDA ESPECIAL 2.8 m)" }] },
    { proveedorId:'pr-nuevo', items:[{ name:"POSTE DE 2½\" X 7.87' (0.35) CAL. 26 (MEDIDA ESPECIAL 2.4 m)" }] }
  ] } };
  ok('encuentra el proveedor de la OC MÁS RECIENTE (medida distinta no importa)', f(p, key) === 'pr-nuevo');
  ok('material nunca comprado → vacío', f(p, 'CLAVE INEXISTENTE') === '');
  ok('sin OCs → vacío', f({ materiales:{} }, key) === '');
}
const srcAuto = extractFn('autoAssignOcProviders');
ok('autoAssign usa el fallback histórico', /_provHistoricoPorItem\(/.test(srcAuto));

// ── 3: ENTREGAR A = la obra del pedido ──
const srcOpen = extractFn('openOrdenCompra');
ok('busca dirección guardada que coincida con la obra', /_dirObra/.test(srcOpen));
ok('sin dirección guardada propone la OBRA', /OBRA — /.test(srcOpen));
ok('ya no selecciona a ciegas la primera dirección', !/applyOcDireccion\(p\.materiales\.direccionesEntrega\[0\]\.id\)/.test(srcOpen));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
