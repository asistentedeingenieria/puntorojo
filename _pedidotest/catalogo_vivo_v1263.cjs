/* v1263 (Antonio, 18-ago, TOR-25/26/27: el pedido dice [1"×12"×8'] y ELEGIR PRESENTACIÓN
   solo ofrece 4 medidas — sin la pedida — aunque el catálogo maestro del proveedor SÍ la
   tiene a Q123.77): el desplegable v997 lee del Excel CONGELADO (CATALOGO_COMPRAS), no
   del catálogo maestro vivo que mantiene el admin.
   FIX: opción "— VER TODO EL CATÁLOGO DEL PROVEEDOR —" en el desplegable (y el desplegable
   aparece TAMBIÉN cuando el renglón casó sin presentaciones), que abre el selector v1187
   (_ocOfrecerProductoCatalogo): el renglón adopta nombre y precio VIVOS del maestro. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zR = ex('function renderOcItems(');
ok('el desplegable ofrece VER TODO EL CATÁLOGO DEL PROVEEDOR', /VER TODO EL CATÁLOGO DEL PROVEEDOR/.test(zR) && /value="_cat"/.test(zR));
ok('solo con proveedor REAL (ni bodega, ni pre-pago, ni trasiego)', /_provRealVar/.test(zR) && /_bodega/.test(zR.slice(zR.indexOf('_provRealVar'), zR.indexOf('_provRealVar') + 400)));
ok('el desplegable aparece TAMBIÉN cuando el renglón casó sin presentaciones',
  (function(){ const i = zR.indexOf('_provRealVar'); if (i < 0) return false;
    return /autoAssigned/.test(zR.slice(i - 200, i + 500)); })());
const zU = ex('window.updateOcItemVariante = function');
ok('elegir _cat abre el selector v1187 con el botón fresco',
  /'_cat'/.test(zU) && /_ocOfrecerProductoCatalogo\(_ocBtnProvDe\(idx\)/.test(zU) && /, true\)/.test(zU));
ok('el selector v1187 adopta nombre y precio VIVOS del maestro (propiedad existente)',
  (function(){ const z = ex('window._ocOfrecerProductoCatalogo = function');
    return /it\.name = pr\.nombre/.test(z) && /it\.precio = Number\(pr\.precio\)/.test(z); })());

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
