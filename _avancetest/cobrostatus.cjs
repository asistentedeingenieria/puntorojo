/* COBRO — evalCobroStatus (v755): el estado de cobro se DERIVA de la fecha de pago.
   Sin fecha de pago (o futura/ inválida) = aún no pagado = PENDIENTE. EN AUTORIZACIÓN
   es un estado manual intermedio y NO se auto-pisa. */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function ext(name){ const m=html.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}')); if(!m){ console.log('NO '+name+' FOUND'); process.exit(2);} return m[0]; }
const EV = new Function(ext('evalCobroStatus')+'\nreturn evalCobroStatus;')();

let pass=0, fail=0;
const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// EL PEDIDO: sin fecha de pago, aunque diga PAGADO, debe ser PENDIENTE
ok('sin fecha + PAGADO -> PENDIENTE', EV('', 'PAGADO')==='PENDIENTE');
ok('null fp + PAGADO -> PENDIENTE', EV(null, 'PAGADO')==='PENDIENTE');
ok('sin fecha + PENDIENTE -> PENDIENTE', EV('', 'PENDIENTE')==='PENDIENTE');
// fecha de pago real (pasada) -> PAGADO
ok('fecha pasada -> PAGADO', EV('01/01/2020','PENDIENTE')==='PAGADO');
ok('fecha pasada -> PAGADO aunque venga PENDIENTE', EV('15/05/2026','PENDIENTE')==='PAGADO');
// fecha futura o inválida = aún no pagado -> PENDIENTE
ok('fecha futura -> PENDIENTE', EV('01/01/2099','PAGADO')==='PENDIENTE');
ok('fecha inválida -> PENDIENTE', EV('xx/yy/zzzz','PAGADO')==='PENDIENTE');
ok('fecha incompleta -> PENDIENTE', EV('13/02','PAGADO')==='PENDIENTE');
ok('placeholder DD/MM/AAAA -> PENDIENTE', EV('DD/MM/AAAA','PAGADO')==='PENDIENTE');
// EN AUTORIZACIÓN se preserva (estado intermedio, no se auto-pisa)
ok('sin fecha + EN AUTORIZACIÓN se preserva', EV('', 'EN AUTORIZACIÓN')==='EN AUTORIZACIÓN');
ok('fecha futura + EN AUTORIZACIÓN se preserva', EV('01/01/2099', 'EN AUTORIZACIÓN')==='EN AUTORIZACIÓN');
// pero si EN AUTORIZACIÓN ya tiene fecha de pago pasada -> PAGADO gana
ok('EN AUTORIZACIÓN con fecha pasada -> PAGADO', EV('01/01/2020','EN AUTORIZACIÓN')==='PAGADO');

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
