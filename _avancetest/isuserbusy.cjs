/* v770: FIX SISTEMICO del bug "referencia huerfana tras await". CloudSync.applyRemote ya
   POSPONE la sincronizacion si isUserBusy() (no reasigna state mientras el usuario edita).
   Pero isUserBusy solo veia modales con clase .modal-bg.show; los modales dinamicos de
   plata/planilla (prConfirm, editor, rechazo) usan divs con estilo inline e ids propios,
   asi que NO se detectaban → state se reasignaba bajo la referencia que el handler tomo
   antes del modal. Este test exige que isUserBusy detecte tambien esos modales. */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const m=html.match(/isUserBusy\(\)\{[\s\S]*?\n  \},/);
ok('isUserBusy existe', !!m);
const body=m?m[0]:'';

// sigue detectando lo de antes
ok('isUserBusy detecta .modal-bg.show (modales estaticos)', /modal-bg\.show/.test(body));
ok('isUserBusy detecta input/textarea/select enfocado', /INPUT\|TEXTAREA\|SELECT/.test(body));
// NUEVO: detecta los modales dinamicos que causaban la ref huerfana
ok('isUserBusy detecta prConfirmModal', body.indexOf('prConfirmModal')>=0);
ok('isUserBusy detecta el editor de planilla (v289EditorModal)', body.indexOf('v289EditorModal')>=0);
ok('isUserBusy detecta el modal de rechazo (prRechazarModal)', body.indexOf('prRechazarModal')>=0);

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
