/* v1194 — LA REF DEL PROVEEDOR (8273-NN) SE ASIGNA SOLA (Antonio, 12-ago):
   "el correlativo siempre sea NO. 8273, guion, y el número que corresponde en orden
   que vamos despachando — esta sería la 13 y así con todas las que vengan."

   EL HUECO: el despacho pre-pago creado DESDE EL PEDIDO (v1068) no llevaba refExterna
   — solo la ventanilla de la madre la pedía (v1123, pre-llenada con _dppSiguienteRef).
   El DESPACHO PRE-PAGO 13 salió sin su 8273-13: sin ref en el desglose, y el impreso
   caía al fallback del número interno.

   EL FIX: _dppRefAutoDeMadre(madre) — la serie se CONTINÚA de los despachos de ESA
   compra anticipada (prefijo y ceros heredados, v1123). La vía del pedido la asigna
   al crear; si la madre aún no tiene serie (ningún despacho con REF), queda vacía y
   la ventanilla de la madre la pide como siempre. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— la serie se continúa (funcional, v1123 intacto) —');
const zP = ex(code, 'function _dppRefPartes(');
const zS = ex(code, 'function _dppSiguienteRef(');
ok('las dos piezas existen', !!zP && !!zS);
try {
  const f = new Function(zP + '\n' + zS + '\nreturn _dppSiguienteRef;')();
  const mk = r => ({ esPrepago: true, refExterna: r });
  ok('EL CASO REAL: …8273-12 → 8273-13', f([mk('8273-01'), mk('8273-12'), mk('8273-02')]) === '8273-13');
  ok('hereda los ceros del proveedor (8273-09 → 8273-10)', f([mk('8273-09')]) === '8273-10');
  ok('sin serie todavía → vacío (no se inventa un prefijo)', f([{ esPrepago: true }]) === '' && f([]) === '');
} catch(e){ ok('_dppSiguienteRef evalúa aislado', false); }

console.log('\n— el ayudante por madre —');
const zA = ex(code, 'function _dppRefAutoDeMadre(');
ok('existe', !!zA);
ok('solo mira los despachos de ESA madre (refOcMadre)', /refOcMadre/.test(zA) && /_dppOrdenesGlobal\(\)/.test(zA));
ok('continúa la serie con _dppSiguienteRef', /_dppSiguienteRef\(/.test(zA));

console.log('\n— la vía del pedido la asigna al CREAR —');
ok('el despacho nace con su REF', /refOcMadre: _madreE\.id, refOcMadreNumero: _madreE\.numero,[\s\S]{0,600}?refExterna: _dppRefAutoDeMadre\(_madreE\)/.test(code));

console.log('\n— el impreso la muestra como No. (v1151 intacto) —');
ok('con refExterna el No. grande del impreso es la REF', /oc\.esPrepago && oc\.refExterna \? esc\(String\(oc\.refExterna\)\.toUpperCase\(\)\)/.test(code));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
