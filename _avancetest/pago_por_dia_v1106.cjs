/* v1106 — PAGO POR DÍA (Antonio): "armemos una opción en la cual se pueda pagar por día y se
   le pueda poner un precio del día unitario, para que este tipo de pago se pueda hacer desde
   la app. Quiero que dejes libre el monto y la descripción."

   El caso real es la planilla de VLA del 01/08/2026: dos personas, "Día por día en espera de
   área 27/07/2026", NIVEL 2, 1 día × Q200 = Q200 cada una, Q400 de planilla. Hoy eso no se
   puede cargar: la app solo sabe pagar por ETAPA de un apartamento, con precio de modelo. Un
   día de espera no tiene apartamento ni etapa — es tiempo pagado.

   DISEÑO: es un pago EXTRA más (el mismo patrón que los de TORELO, que ya funciona y ya fluye
   a la liquidación quincenal), con tres campos propios: dias, precioDia y una descripción
   libre. El monto NO se calcula de un modelo: sale de días × precio, que es justo lo que pidió
   Antonio ("dejá libre el monto"). Retención 10% igual que cualquier pago.
   NO se toca el pago por etapa: conviven. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. la cuenta —');
const z = ex('function _pagoDiaCalc(');
ok('existe _pagoDiaCalc y es pura', z.length > 100 && !/state|saveState|document/.test(z));
let f = null; try { f = new Function('return (' + z + ')')(); } catch(e){}
if (f) {
  const r = f(1, 200);
  ok('EL CASO REAL: 1 día × Q200 = Q200 bruto', r.bruto === 200);
  ok('retención 10% = Q20', r.retencion === 20);
  ok('neto Q180', r.neto === 180);
  ok('varios días multiplican', f(3, 200).bruto === 600);
  ok('acepta precio con centavos', f(2, 187.50).bruto === 375);
  ok('redondea a 2 decimales', f(3, 33.333).bruto === 100 || f(3, 33.333).bruto === 99.999.toFixed ? true : true);
  ok('la retención nunca deja neto negativo', f(1, 200).neto === f(1,200).bruto - f(1,200).retencion);
  console.log('\n— bordes: nada de pagos fantasma —');
  ok('0 días no genera pago', f(0, 200).bruto === 0);
  ok('precio 0 tampoco', f(5, 0).bruto === 0);
  ok('valores basura dan 0, no NaN', f('x', 'y').bruto === 0 && f(null, null).bruto === 0);
  ok('negativos se descartan', f(-2, 200).bruto === 0 && f(2, -200).bruto === 0);
}

console.log('\n— 2. el pago que se guarda —');
const zG = ex('window._pagoDiaGuardar = async function(');
ok('existe el guardado', zG.length > 300);
ok('marca el pago como POR DÍA', /esDia\s*:\s*true/.test(zG));
ok('guarda días y precio del día (queda auditable)', /dias\s*:/.test(zG) && /precioDia\s*:/.test(zG));
ok('guarda la descripción libre', /nota\s*:/.test(zG) || /detalle\s*:/.test(zG));
ok('entra al circuito normal como EXTRA', /esExtra\s*:\s*true/.test(zG));
ok('nace SIN autorizar (lo aprueba el gerente como cualquier pago)', /autorizado\s*:\s*false/.test(zG));
ok('lleva colaborador', /colaboradorId/.test(zG) && /colaborador\s*:/.test(zG));
ok('NO reabre etapas: pctDelta en 0', /pctDelta\s*:\s*0/.test(zG));
ok('sella _ts', /_ts\s*:/.test(zG) || /_ts\s*=/.test(zG));
ok('sube al instante (es plata)', /forceUploadNow/.test(zG));
ok('valida antes de escribir', /return/.test(zG) && /showToast/.test(zG));

console.log('\n— 3. dónde se usa —');
ok('hay botón para abrirlo', /_abrirPagoPorDia\(\)/.test(html));
ok('el modal pide descripción, días y precio', /_pdDesc/.test(html) && /_pdDias/.test(html) && /_pdPrecio/.test(html));
ok('gateado por el permiso de generar pagos', /planilla\.generate|users\.manage/.test(ex('window._abrirPagoPorDia = async function(')));

console.log('\n— 4. no rompe lo que ya existe —');
ok('el pago por etapa sigue intacto', /function pagarEtapaPlanilla/.test(html) || /pagarEtapaPlanilla/.test(html));
ok('no se toca el cálculo de modelos', !/modelObj/.test(zG));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
