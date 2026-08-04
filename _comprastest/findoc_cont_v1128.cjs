/* v1128 — "CUANDO LE DOY AQUÍ NO ME ESTÁ GENERANDO LAS ÓRDENES DE COMPRA" (Antonio, 4-ago)

   Le daba a GENERAR OC DE ESTA PRODUCCIÓN, confirmaba, y no pasaba NADA: sin orden, sin aviso,
   sin error visible. Los datos lo confirmaron: 8 órdenes en VICINIA LAS AMÉRICAS y ninguna con
   opOrigen, o sea la orden nunca se creó (no era que quedara escondida en el historial).

   CAUSA RAÍZ: _bodegaFindOc(id) resuelve una orden en tres lugares y devuelve formas DISTINTAS:
     · PROYECTOS VARIOS → { oc, cont: _variosMatStore(), p:null, esBodega:false, esVarios:true }
     · BODEGA           → { oc, p:null }                    ← SIN cont
     · UN PROYECTO      → { oc, p: proyecto }               ← SIN cont
   Y _ocDerivarDeOp hace, justo después del modal:
       const cont = _f2.cont;
       (cont.ordenes || []).forEach(...)
   Con la producción viviendo en un proyecto, `cont` es undefined y eso revienta ANTES del push.
   Como es una async function llamada desde onclick, el TypeError queda como "Uncaught (in
   promise)" y el usuario no ve absolutamente nada: el modal se cierra y la orden nunca existió.

   EL ARREGLO VA EN LA RAÍZ: _bodegaFindOc devuelve SIEMPRE el contenedor correcto. Un contrato
   que cambia de forma según dónde encontró la cosa es una trampa para cualquiera que lo use
   después. Se agrega SOLO `cont` — los demás campos se dejan como están para no cambiarle la
   semántica a ningún llamador que hoy lea .esBodega o .esVarios. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zF = ex(code, 'function _bodegaFindOc(');
ok('existe el buscador de órdenes', zF.length > 200);

let f = null;
try {
  f = new Function('state','_variosMatStore','_bodegaMatStore', zF + '\nreturn _bodegaFindOc;');
} catch(e){ console.log('   (no compiló: ' + e.message + ')'); }

if (f) {
  const VARIOS  = { ordenes: [{ id:'v1' }] };
  const BODEGA  = { ordenes: [{ id:'b1' }] };
  const PROY    = { id:'VLA', name:'VICINIA LAS AMÉRICAS', materiales: { ordenes: [{ id:'p1' }] } };
  const st = { variosMat: VARIOS, bodegaMat: BODEGA, projects: [PROY] };
  const buscar = f(st, () => VARIOS, () => BODEGA);

  console.log('\n— el caso de Antonio: la producción vive en un PROYECTO —');
  const rp = buscar('p1');
  ok('la encuentra', !!rp && !!rp.oc && rp.oc.id === 'p1');
  ok('AHORA trae el contenedor (antes venía undefined y reventaba)', !!rp.cont);
  ok('y es el del proyecto, no el de bodega', rp.cont === PROY.materiales);
  ok('se puede empujar una orden nueva ahí', Array.isArray(rp.cont.ordenes));
  ok('sigue trayendo el proyecto, como antes', rp.p === PROY);

  console.log('\n— los otros dos contenedores —');
  const rb = buscar('b1');
  ok('la de BODEGA también trae contenedor', !!rb && rb.cont === BODEGA);
  ok('y su contenedor es el de bodega', rb.cont.ordenes[0].id === 'b1');
  const rv = buscar('v1');
  ok('PROYECTOS VARIOS sigue igual que siempre', !!rv && rv.cont === VARIOS);
  ok('y conserva su marca esVarios', rv.esVarios === true);

  console.log('\n— el contrato no cambia para quien ya lo usaba —');
  ok('sin resultado devuelve null', buscar('no-existe') === null);
  ok('la orden de VARIOS gana sobre las demás (mismo orden de barrido)',
    (function(){
      const st2 = { variosMat:{ordenes:[{id:'x',d:'varios'}]}, bodegaMat:{ordenes:[{id:'x',d:'bodega'}]}, projects:[] };
      return f(st2, () => st2.variosMat, () => st2.bodegaMat)('x').oc.d === 'varios';
    })());
  ok('un state vacío no lo tumba', f({}, () => ({}), () => ({}))('z') === null);
  ok('un proyecto sin materiales no lo tumba',
    f({ projects:[{id:'A'}] }, () => ({}), () => ({}))('z') === null);
}

console.log('\n— el flujo que estaba roto —');
const zD = ex(code, 'window._ocDerivarDeOp = async function(');
ok('existe el derivador OP → OC', zD.length > 800);
ok('toma el contenedor del resultado', /_f2\.cont/.test(zD));
ok('y ya no puede quedar sin contenedor', /_f2\.cont\s*\|\||const cont = _f2\.cont;/.test(zD));
ok('empuja la orden al contenedor', /cont\.ordenes\.push\(/.test(zD));
ok('marca la producción como ya derivada', /ocDerivadaId = /.test(zD));
ok('avisa al terminar', /prAlert/.test(zD));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
