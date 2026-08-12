/* v1183 — SALDOS A FAVOR DE PROVEEDORES (spec de Antonio, 11-ago, con sus 2 decisiones)

   "De vez en cuando se le paga de más a los proveedores y queda un saldo a favor."
   1. REGISTRO por proveedor + monto.
   2. En la OC: botón APLICAR SALDO A FAVOR bajo el GRAN TOTAL (CON IVA), con TOPE = lo
      registrado de ese proveedor (y nunca más que la propia OC).
   3. Renglones nuevos: SALDO A FAVOR y GRAN TOTAL APLICADO = total − saldo.

   DECISIONES (preguntadas y respondidas):
   · El GASTO de la obra cuenta el total COMPLETO — el saldo es forma de pago, no descuento
     del costo. ⇒ NO se toca ningún cálculo de gasto existente (por eso esta versión es segura).
   · Si la OC se ELIMINA, el saldo aplicado VUELVE SOLO al registro del proveedor.

   DISEÑO: LIBRO de movimientos (state.saldosProv), no un balance mutable — el mismo patrón
   que bodegaMovs (v959): REGISTRO (+), APLICACION (−, atada a su ocId), REVERSA (+). Nunca se
   borra un movimiento de plata; la reversa es un movimiento nuevo. El saldo se DERIVA sumando.
   Union-merge por id (v972) y forceUploadNow en cada mutación (regla de plata). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const srcS = ex(code, 'function _saldoProvDe(');
const srcV = ex(code, 'function _saldoAplicarValida(');
ok('existen las piezas puras', !!srcS && !!srcV);
if (!srcS || !srcV) { console.log('PASS='+pass+' FAIL='+fail); process.exit(1); }
const F = new Function(srcS + '\n' + srcV + '\nreturn { de:_saldoProvDe, val:_saldoAplicarValida };')();

console.log('— el saldo se DERIVA del libro —');
const MOVS = [
  { id:'m1', provId:'pv1', monto: 500,  tipo:'REGISTRO' },
  { id:'m2', provId:'pv1', monto: -200, tipo:'APLICACION', ocId:'oc9' },
  { id:'m3', provId:'pv2', monto: 300,  tipo:'REGISTRO' },
  { id:'m4', provId:'pv1', monto: 200,  tipo:'REVERSA', ocId:'oc9' },
];
ok('suma registros, aplicaciones y reversas', F.de(MOVS, 'pv1') === 500);
ok('cada proveedor por separado', F.de(MOVS, 'pv2') === 300);
ok('proveedor sin movimientos = 0', F.de(MOVS, 'pvX') === 0);
ok('tolera basura', F.de(null, 'pv1') === 0 && F.de([null, {id:'z',provId:'pv1',monto:'x'}], 'pv1') === 0);

console.log('\n— la validación: el TOPE es obligatorio (spec textual) —');
ok('monto válido pasa', F.val(500, 200, 1000).ok === true);
ok('NO se puede pasar del saldo del proveedor', F.val(500, 501, 1000).ok === false);
ok('NO más que la propia OC', F.val(5000, 1200, 1000).ok === false);
ok('exactamente el saldo, pasa', F.val(500, 500, 1000).ok === true);
ok('exactamente el total de la OC, pasa', F.val(5000, 1000, 1000).ok === true);
ok('cero y negativo se rechazan', F.val(500, 0, 1000).ok === false && F.val(500, -5, 1000).ok === false);
ok('basura se rechaza con motivo', F.val(500, 'x', 1000).ok === false && !!F.val(500, 'x', 1000).motivo);
ok('los rechazos explican por qué', /SALDO|PROVEEDOR/i.test(F.val(500, 501, 1000).motivo) && /ORDEN|OC|TOTAL/i.test(F.val(5000, 1200, 1000).motivo));

console.log('\n— las acciones existen y respetan las reglas de plata —');
const reg = ex(code, 'window._saldoProvRegistrar = async function(');
const apl = ex(code, 'window._ocAplicarSaldo = async function(');
const qui = ex(code, 'window._ocQuitarSaldo = async function(');
ok('registrar / aplicar / quitar existen', !!reg && !!apl && !!qui);
ok('las tres exigen permiso', /can\(/.test(reg) && /can\(/.test(apl) && /can\(/.test(qui));
ok('las tres fuerzan la subida (regla de plata)', /forceUploadNow/.test(reg) && /forceUploadNow/.test(apl) && /forceUploadNow/.test(qui));
ok('aplicar VALIDA antes de tocar nada', /_saldoAplicarValida\(/.test(apl));
ok('aplicar sella la OC (_ts) para el union-merge', /oc\._ts = Date\.now\(\)/.test(apl));
ok('quitar escribe REVERSA (nunca borra el movimiento)', /REVERSA/.test(qui) && !/\.splice\(/.test(qui));
ok('no se aplica dos veces sin quitar primero', /saldoAplicado/.test(apl) && /YA TIENE|QUITA/i.test(apl));

console.log('\n— la reversa automática al ELIMINAR la OC (decisión de Antonio) —');
ok('la eliminación devuelve el saldo al registro', /saldoAplicado[\s\S]{0,400}REVERSA POR ELIMINACI/.test(code));

console.log('\n— el impreso: los renglones de la spec —');
ok('renglón SALDO A FAVOR bajo el gran total', /SALDO A FAVOR/.test(code) && /\(Number\(oc\.saldoAplicado\) \|\| 0\) > 0 \?/.test(code));
ok('renglón GRAN TOTAL APLICADO = total − saldo', /GRAN TOTAL APLICADO/.test(code) && /oc\.total[^)]*- *(Number\()?oc\.saldoAplicado|oc\.total \|\| 0\) - /.test(code));

console.log('\n— el libro viaja y se une (v972) —');
ok('saldosProv se une en applyRemote por id', /_mergeById\(\(state && state\.saldosProv\)|_mergeById\(\(state\.saldosProv\)|merged\.saldosProv/.test(code));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
