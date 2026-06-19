/* v768: rechazarPlanilla DEBE forzar la subida inmediata (forceUploadNow) igual que
   autorizar/aprobar/reenviar. Sin eso, el rechazo viaja en el scheduleSave con debounce
   y un applyRemote concurrente (planillasArmadas es last-write-wins) lo puede pisar antes
   de subir → "no se envía a la primera". Guard estructural de regresión. */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// TODA función window.* de planilla que muta estado + guarda con saveState DEBE forzar la
// subida inmediata (forceUploadNow). Sin eso el cambio viaja en el scheduleSave con debounce
// y un applyRemote concurrente (planillasArmadas es last-write-wins) lo pisa antes de subir
// → "no se sincroniza a la primera". Auditado en v768.
function checkFn(nombre){
  // soporta "= function" y "= async function"
  const m=html.match(new RegExp('window\\.'+nombre+'\\s*=\\s*(?:async )?function[\\s\\S]*?\\n  \\};'));
  ok(nombre+' existe', !!m);
  const body=m?m[0]:'';
  ok(nombre+' persiste con saveState', /saveState\s*\(/.test(body));
  ok(nombre+' fuerza subida inmediata (forceUploadNow)', /forceUploadNow/.test(body));
  ok(nombre+' forceUploadNow va DESPUES de saveState',
     body.indexOf('saveState')>=0 && body.indexOf('forceUploadNow')>body.indexOf('saveState'));
}
['rechazarPlanilla','rechazarDescuentosPlanilla','aprobarPlanilla','finalizarDescuentosPlanilla',
 'procesarPlanillaFinal','cerrarPlanillaAprobada','liberarPagosPlanillaRechazada'].forEach(checkFn);

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
