/* v1124 — "NO SÉ POR QUÉ DICE OC 6" (Antonio, 3-ago):
   "quiero que la foto 5 la tomes en cuenta porque no se porque dice OC 6. Creo que debemos
    de ver eso solo para que sean ordenes de despacho generales."

   La foto 5 es el panel BODEGA PRE-PAGO, que titula la compra anticipada así:
       BODEGA – OC 6 · SISTEGUA, S.A.
   Ese texto sale del campo `numero` de la orden madre ("BODEGA – OC 00006"), porque una
   compra anticipada se registra como una orden de compra normal de la bodega. Leerlo como
   "OC 6" invita a confundirla con una orden de compra corriente: no lo es — es plata ya
   pagada esperando a que la despachen, y de ella cuelgan los despachos.

   REGLA DURA: el campo `numero` guardado NO SE TOCA. Es la llave que une la madre con sus
   despachos (refOcMadreNumero), aparece en documentos ya impresos y firmados, y Antonio fue
   explícito: "OJO QUE NO QUIERO QUE ME ELIMINES INFORMACION ACTUAL Y EXISTENTE".
   Se arregla SOLO en la capa de presentación. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zT = ex(code, 'function _dppTituloMadre(');
ok('existe el rótulo de presentación', zT.length > 60);
ok('es PURA: no escribe nada', !/saveState|forceUploadNow|\.numero\s*=/.test(zT));

let f = null;
try { f = new Function('_numLimpio', '_ocEsPrepagoMadre',
  zT + '\nreturn _dppTituloMadre;')(function(s){
    const t = String(s == null ? '' : s); const i = t.lastIndexOf('–');
    const cab = i >= 0 ? t.slice(0, i + 1) : ''; const col = i >= 0 ? t.slice(i + 1) : t;
    return cab + col.replace(/(^\s*)0+(\d)/, '$1$2').replace(/\b(OC|DESP|OP)\s*0+(\d)/g, '$1 $2');
  }, oc => !!oc && !oc.esDespacho && /COMPRA\s*ANTICIPADA/i.test(String((oc && oc.formaPago) || '')));
} catch(e){ console.log('   (no compiló: ' + e.message + ')'); }

/* la madre real: una orden de compra de la bodega con forma de pago COMPRA ANTICIPADA */
const MADRE = { numero:'BODEGA – OC 00006', formaPago:'COMPRA ANTICIPADA' };
if (f) {
  console.log('\n— el caso de la foto 5 —');
  ok('BODEGA – OC 00006 deja de llamarse OC', !/\bOC\b/.test(f(MADRE)));
  ok('y dice lo que realmente es', /COMPRA ANTICIPADA/.test(f(MADRE)));
  ok('conserva el número para poder identificarla', /\b6\b/.test(f(MADRE)));
  ok('conserva de dónde salió', /BODEGA/.test(f(MADRE)));

  console.log('\n— no rompe los demás números —');
  ok('una OC normal se sigue viendo igual', f({ numero:'VLA – OC 00012' }) === 'VLA – OC 12');
  ok('un despacho mantiene su nombre', f({ numero:'DESPACHO PRE-PAGO 9' }) === 'DESPACHO PRE-PAGO 9');
  ok('sin número no revienta', typeof f({}) === 'string');
  ok('sin orden no revienta', typeof f(null) === 'string');
  ok('un proyecto con ceros propios no se toca', /CASA 007/.test(f({ numero:'CASA 007 – OC 00003' })));
}

console.log('\n— donde se ve —');
const zB = ex(code, 'function _bodegaPrepagoHTML(') || code;
ok('el panel de bodega pre-pago usa el rótulo nuevo', /_dppTituloMadre\(/.test(code));
ok('el modal de generar despacho también', /_dppTituloMadre\(madre\)|_dppTituloMadre\(_f\.oc\)/.test(code));
ok('y el resumen', /_dppTituloMadre\(madre\)/.test(ex(code, 'window._dppAbrirResumen = function(')));
ok('el campo numero GUARDADO no se reescribe en ningún lado',
  !/\.numero\s*=\s*['"`]?COMPRA ANTICIPADA/.test(code));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
