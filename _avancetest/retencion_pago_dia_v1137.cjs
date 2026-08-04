/* v1137 — EL PAGO POR DÍA LLEVABA 10% DE RETENCIÓN EN EL DOCUMENTO CON QUE SE PAGA

   Antonio ordenó en v1107: "las planillas por día NO procede hacer una retención... el monto se
   desembolsa al 100%". El cálculo quedó bien (_pagoDiaCalc devuelve retencion:0 y el pago se
   guarda con esDia:true, retencion:0) pero la REGLA NO SE PROPAGÓ a los seis lugares que
   imprimen. Todos hacían:

       const r = Number(pg.retencion || (bruto * 0.10));

   `0 || (bruto*0.10)` da bruto*0.10: el `||` no distingue "no hay dato" de "el dato es cero".
   Resultado: un pago por día de Q200 salía en el Excel y el PDF con "(-) Retención 10% · Q20"
   y al trabajador se le entregaban Q180. La tarjeta en pantalla mostraba Q200 y el papel Q180.
   Peor: ese 10% fantasma nunca quedaba registrado como retención liberable (la lista filtra por
   retención > 0), así que tampoco se le devolvía después.

   Es un error mío de v1107: implementé la regla en el cálculo y la di por terminada sin mirar
   el documento final.

   EL ARREGLO: una sola función decide la retención, y un CERO EXPLÍCITO es un dato, no la
   ausencia de dato. Se usa en los seis lugares. Y la fila del Excel deja de escribirse como
   fórmula '*0.1' —que recalculaba el descuento dentro de la hoja aunque el valor fuera cero—
   para escribir el monto ya calculado. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const z = ex(code, 'function _pgRetencion(');
ok('existe la función única de retención', z.length > 100);
ok('es PURA', !/state\.|document\./.test(z));

let f = null;
try { f = new Function(z + '\nreturn _pgRetencion;')(); } catch(e){ console.log('   (no compiló: '+e.message+')'); }

if (f) {
  console.log('\n— el caso de Antonio: 1 día × Q200 —');
  const DIA = { esDia:true, bruto:200, retencion:0 };
  ok('el pago por día NO lleva retención', f(DIA, 200) === 0);
  ok('y por lo tanto se paga completo', 200 - f(DIA, 200) === 200);

  console.log('\n— un cero explícito es un DATO, no ausencia de dato —');
  ok('retencion:0 se respeta aunque no esté marcado como día', f({ bruto:200, retencion:0 }, 200) === 0);
  ok('retencion:"0" (texto) también', f({ bruto:200, retencion:'0' }, 200) === 0);

  console.log('\n— el pago normal sigue reteniendo el 10% —');
  ok('con retención guardada, se usa esa', f({ bruto:1000, retencion:100 }, 1000) === 100);
  ok('sin el dato, se calcula el 10%', f({ bruto:1000 }, 1000) === 100);
  ok('sin el dato y sin bruto, usa el que le pasan', f({}, 500) === 50);
  ok('una retención distinta del 10% se respeta (ajustes a mano)', f({ bruto:1000, retencion:37.5 }, 1000) === 37.5);

  console.log('\n— bordes —');
  ok('un pago marcado como día manda aunque no traiga retención', f({ esDia:true, bruto:200 }, 200) === 0);
  ok('null no lo tumba', f(null, 100) === 0);
  ok('sin nada devuelve 0', f({}, 0) === 0);
  ok('redondea a centavos', f({ bruto:333.33 }, 333.33) === 33.33);
}

console.log('\n— los SEIS lugares que imprimen usan la función —');
/* si uno solo se queda con el `||`, el documento vuelve a mentir en ese camino */
ok('ya no queda ningún `pg.retencion || (… * 0.10)`',
  !/pg\.retencion \|\| \([^)]*0\.10\)/.test(code));
const usos = (code.match(/_pgRetencion\(/g) || []).length;
ok('la función se usa en al menos seis lugares', usos >= 7); // 6 usos + la definición

console.log('\n— el Excel ya no recalcula el descuento —');
ok('la fila de retención escribe el MONTO, no la fórmula *0.1',
  !/formula: '\+H'\+detRow\+'\*0\.1'/.test(code));

console.log('\n— la pantalla y el papel dicen lo mismo —');
/* la tarjeta ya sumaba bien (pg.retencion || 0); lo que mentía era el documento */
ok('la tarjeta sigue leyendo la retención guardada', /retencion \+= Number\(pg\.retencion \|\| 0\)/.test(code));

console.log('\n— la regla original de v1107 sigue en pie —');
const zc = ex(code, 'function _pagoDiaCalc(');
ok('el cálculo del pago por día sigue sin retención', /retencion:\s*0/.test(zc));
ok('y el pago se guarda marcado como día', /esDia:true/.test(code));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
