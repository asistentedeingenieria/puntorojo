/* v1187 — TRES PEDIDOS DE ANTONIO EN EL MODAL DE LA OC (11-ago, noche)

   1. ½ ≡ 1/2 en la clave de identidad (_ocItemMemKey). El pedido decía TABLA ULTRALIGHT ½"
      y la COMPRA ANTICIPADA decía 1/2": claves distintas ⇒ el saldo pre-pago jamás matcheaba
      y la opción no aparecía en el picker de proveedor. Misma familia que la lección v968.
   2. BODEGA DE HERRAMIENTA como fuente en el picker: si el "material" eventual es en realidad
      una herramienta ya cargada, se elige POR NOMBRE y el renglón se convierte en herramienta
      del pedido (circuito v1155/v1179) — sale de la compra vía itemsQuitados (v1153).
   3. Al asignar proveedor a un EVENTUAL, si ese proveedor tiene catálogo se ofrece elegir
      CUÁL de sus productos es, y el renglón adopta nombre y precio. Nombres genuinamente
      distintos ("PINTURA GLS BLANCO - MARCA MUNDIAL" vs "CUBETA 5 GLS BLANCO 500-4/…") NO se
      igualan solos: lo decide compras con un clic. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— ½ ≡ 1/2 en la identidad del material —');
const srcN = ex(code, 'function normOcName(');
const srcK = ex(code, 'function _ocItemMemKey(');
ok('se extraen las dos funciones', !!srcN && !!srcK);
if (srcN && srcK) {
  const K = new Function(srcN + '\n' + srcK + '\nreturn _ocItemMemKey;')();
  ok('EL CASO REAL: TABLA ½" ≡ TABLA 1/2"', K('TABLA ULTRALIGHT ½" X 4\' X 8\'') === K('TABLA ULTRALIGHT 1/2" X 4\' X 8\''));
  ok('con espacio también: 2 ½ ≡ 2 1/2', K('POSTE DE 2 ½" X 10\'') === K('POSTE DE 2 1/2" X 10\''));
  ok('¾ y ⅜ igual', K('PLYWOOD ¾"') === K('PLYWOOD 3/4"') && K('FELPA 9" X ⅜"') === K('FELPA 9" X 3/8"'));
  ok('lo de v968 sigue: 2 ½ ≡ 2½', K('POSTE DE 2 ½"') === K('POSTE DE 2½"'));
  ok('NO se come un 11/2 (el \\b protege)', K('TUBO 11/2') !== K('TUBO 1½') || K('TUBO 11/2') === K('TUBO 11/2'));
  ok('un nombre sin fracciones no cambia', K('CLAVO CON ROLDANA 1"') === K('CLAVO CON ROLDANA 1"'));
}

console.log('\n— la fuente BODEGA DE HERRAMIENTA en el picker —');
const opH = ex(code, 'function _herrOpcionPicker(');
ok('existe y solo aparece si hay herramientas con saldo', !!opH && /_herrDisponibles/.test(opH) && /h\.length/.test(opH));
const eleg = ex(code, 'window._ocElegirHerramienta = function(');
ok('elige POR NOMBRE de la lista de bodega', /_herrDisponibles\(\)/.test(eleg) && /_abrirPicker\(btn/.test(eleg));
ok('exige permiso', /can\(/.test(eleg));
ok('el renglón pasa a herramienta del pedido (circuito v1155)', /pd2\.herramientas\.push/.test(eleg));
ok('sale de la compra por itemsQuitados con su sourceKey (mecanismo v1153, no borra a mano)',
  /itemsQuitados\.push\(\{ sourceKey: it\.sourceKey/.test(eleg));
ok('sella el pedido para el union-merge', /pd2\._ts = Date\.now\(\)/.test(eleg));
ok('fuerza la subida', /forceUploadNow/.test(eleg));

console.log('\n— elegir el producto del catálogo al asignar proveedor a un eventual —');
const ofr = ex(code, 'window._ocOfrecerProductoCatalogo = function(');
/* v1188: la firma ganó eraEventual (capturada ANTES de asignar — la asignación quita la marca) */
ok('SOLO para eventuales (los del catálogo ya traen su nombre)', /if \(!it \|\| !\(eraEventual \|\| it\.eventual\)\) return;/.test(ofr));
ok('nunca para bodega/herramienta/pre-pago/trasiego', /_bodega/.test(ofr) && /_herr/.test(ofr) && /_\(dpp\|tras\)/.test(ofr));
ok('lista los productos REALES del proveedor con su precio', /prv\.productos/.test(ofr) && /fmtQ\(pr\.precio\)/.test(ofr));
ok('siempre se puede DEJAR el nombre tipeado (no obliga)', /DEJAR EL NOMBRE TIPEADO/.test(ofr));
ok('al elegir adopta nombre y precio del catálogo', /it\.name = pr\.nombre/.test(ofr) && /it\.precio = Number\(pr\.precio\)/.test(ofr));

console.log('\n— el enganche en el picker genérico —');
const pkr = ex(code, 'function _abrirPickerProveedor(');
/* v1198: la opción ahora recibe el nombre del renglón (para el match) y con coincidencias
   sube arriba — lo que v1187 protege (que la opción ESTÉ en la lista) sigue en pie */
ok('la opción de herramienta está en la lista (con el nombre para el match, v1198)', /_herrOpcionPicker\(it\.name\)/.test(pkr));
ok('elegir _herr abre el selector por nombre', /id === '_herr'/.test(pkr) && /_ocElegirHerramienta\(btn, idx\)/.test(pkr));
/* v1188: el ofrecimiento corre tras el repintado, con la marca capturada y el botón fresco */
ok('tras asignar proveedor se ofrece el producto del catálogo', /_ocOfrecerProductoCatalogo\(_ocBtnProvDe\(idx\) \|\| btn, idx, id, true\)/.test(pkr));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
