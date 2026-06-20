/* v771: al REENVIAR una planilla rechazada (que pudo sumar empleados NUEVOS en el editor)
   hay que RE-APLICAR los descuentos, igual que _v226Enviar lo hace al enviar la 1ra vez.
   Sin esto, pl.autoDescuentos queda en true (de la 1ra version) y el recalculo de render
   se saltea (gate 'if autoDescuentos===true && version>=AUTO return') → los empleados
   nuevos NO reciben anticipos ni polizas. */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

function extract(nombre){
  const m=html.match(new RegExp('window\\.'+nombre+'\\s*=\\s*(?:async )?function[\\s\\S]*?\\n  \\};'));
  return m?m[0]:'';
}

const enviar = extract('_v226Enviar');
ok('_v226Enviar existe', !!enviar);
ok('_v226Enviar aplica descuentos (referencia del patron correcto)', enviar.indexOf('_v411AplicarDescuentosInline')>=0);

const reenviar = extract('_v289ReenviarPlanilla');
ok('_v289ReenviarPlanilla existe', !!reenviar);
ok('_v289ReenviarPlanilla RE-APLICA descuentos al reenviar (incluye gente nueva)',
   reenviar.indexOf('_v411AplicarDescuentosInline')>=0);
// el recalculo debe ir ANTES del saveState para que persista
ok('_v289ReenviarPlanilla recalcula ANTES de guardar',
   reenviar.indexOf('_v411AplicarDescuentosInline')>=0 &&
   reenviar.indexOf('_v411AplicarDescuentosInline') < reenviar.indexOf('saveState'));

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
