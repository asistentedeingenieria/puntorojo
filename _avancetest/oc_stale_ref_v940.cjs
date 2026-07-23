/* v940 (reporte de Antonio: "le dio FIRMAR Y AUTORIZAR y no generó nada autorizado"):
   regla v769 de libro — autorizarOrden capturaba `p`/`oc` ANTES de dos awaits (prConfirm
   + _pedirFirmaSiFalta). Al cerrar el confirm, isUserBusy suelta el sync POSPUESTO
   (state=merged) y las referencias quedan huérfanas: la autorización se escribía en un
   objeto muerto y saveState guardaba el state nuevo sin cambios. Peor: _firmaModal NI
   ESTABA en isUserBusy (si la revisora registraba su firma ahí, el sync entraba en pleno
   flujo). Fix:
   (1) re-leer del state VIVO tras el último await y re-validar (autorizarOrden y
       generarOrdenCompra — mismo patrón latente);
   (2) #_firmaModal y #_bodegaModal entran a isUserBusy;
   (3) autorizarOrden sube al toque (forceUploadNow — acción de documento/plata). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
function extractMethod(sig){ let m=html.indexOf(sig); if(m<0) return ''; let i=m+sig.length-1,d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. isUserBusy conoce los modales nuevos ──
const busy = extractMethod('isUserBusy(){');
ok('#_firmaModal pospone applyRemote', busy.indexOf('#_firmaModal') > -1);
ok('#_bodegaModal pospone applyRemote', busy.indexOf('#_bodegaModal') > -1);

// ── 2. autorizarOrden re-lee del state vivo tras los modales ──
const au = extractFn('autorizarOrden');
const iFirmaAu = au.indexOf('_pedirFirmaSiFalta()');
// v964: la re-lectura es GLOBAL (_bodegaFindOc — la OC puede vivir en el store de bodega)
const iReleeAu = au.indexOf('_bodegaFindOc(', iFirmaAu);
ok('re-lee p/oc DESPUÉS del modal de firma', iFirmaAu > -1 && iReleeAu > iFirmaAu);
ok('re-encuentra la OC por id tras el await', au.indexOf('oc = ', iFirmaAu) > iFirmaAu);
ok('re-valida que no se haya autorizado en otro lado', au.indexOf("YA ESTÁ AUTORIZADA", iReleeAu) > iReleeAu);
ok('avisa si la OC desapareció durante el modal', /RECARG/.test(au.slice(iReleeAu)));
ok('sube al toque (forceUploadNow)', /forceUploadNow/.test(au));

// ── 3. generarOrdenCompra: mismo blindaje ──
const gen = extractFn('generarOrdenCompra');
const iFirmaGen = gen.indexOf('_pedirFirmaSiFalta()');
const iReleeGen = gen.indexOf('p = activeProj()', iFirmaGen);
ok('re-lee p/pd DESPUÉS del modal de firma', iFirmaGen > -1 && iReleeGen > iFirmaGen);
ok('re-encuentra el pedido tras el await', gen.indexOf('pd = ', iFirmaGen) > iFirmaGen);
ok('re-chequea el bloqueo de OCs duplicadas (v927) tras el await', gen.indexOf('YA TIENE SUS ÓRDENES GENERADAS', iFirmaGen) > iFirmaGen);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
