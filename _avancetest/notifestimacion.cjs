/* v772: al subir/agregar estimaciones al cuadro de COBRO hay que notificar por la CAMPANITA
   (prAddNotif = sistema B, lee prGetUserNotifs) a TODOS los que tienen acceso a cobro
   (view.cobro/cobro.edit/cobro.subirExcel). El _notifyByPerm previo (sistema A) escribe en
   la subcoleccion Firestore del destinatario + push, pero NO alimenta la campanita y requiere
   que el ACTOR lea la coleccion users (un NO-admin no puede) -> no llegaban notificaciones. */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// hay DOS rutas de import de estimaciones (ambas con un _payEx 'cobro-excel-subido').
// TODAS deben notificar tambien por la campanita (prAddNotif) a los de acceso a cobro.
let idx=-1, count=0, okCount=0;
while((idx = html.indexOf("'cobro-excel-subido'", idx+1)) !== -1){
  count++;
  const region = html.slice(idx, idx+1800);
  if(region.indexOf('prAddNotif')>=0 && region.indexOf("'view.cobro'")>=0) okCount++;
}
ok('hay al menos un bloque de import de estimaciones', count>0);
ok('TODAS las rutas de import notifican por campanita a acceso-cobro ('+okCount+'/'+count+')',
   count>0 && okCount===count);
// el nuevo tipo de notif existe
ok('existe la notif tipo cobro.estimacion', html.indexOf("'cobro.estimacion'")>=0);

// la ruta MANUAL (boton AGREGAR ESTIMACION) tambien notifica por campanita
const mAdd = html.match(/function addEstimacion\(\)\{[\s\S]*?\n\}/);
ok('addEstimacion existe', !!mAdd);
ok('addEstimacion notifica por campanita (prAddNotif a view.cobro)',
   !!mAdd && mAdd[0].indexOf('prAddNotif')>=0 && mAdd[0].indexOf("'view.cobro'")>=0);

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
