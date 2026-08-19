/* v1254 (Antonio, 18-ago): "después de 10 horas de autorizadas, que se archiven solas en
   el historial de órdenes autorizadas". DERIVADO del reloj — nada se escribe ni se borra:
   la AUTORIZADA con autorizadoTs de hace más de 10 h (36e6 ms) se pinta en su propia
   sección HISTORIAL colapsable (gemela del historial de RECIBIDAS v1006), con la MISMA
   tarjeta _filaOc — todas sus acciones (entrega, recibir, compartir) siguen vivas.
   La recibida EN OBRA manda: va a su historial de recibidas, no a este. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zR = ex('function renderOrdenesList(');
console.log('— el archivado derivado —');
ok('las autorizadas con más de 10 h (36e6 ms) van al tercer grupo',
  (function(){ const iP = zR.indexOf('_ocArch10.push'); if (iP < 0) return false;
    const z = zR.slice(iP - 300, iP);
    return /36e6/.test(z) && /autorizadoTs/.test(z) && /'AUTORIZADA'/.test(z); })());
ok('es DERIVADO: nada escribe una marca de archivo en la orden', !/\.archivada\s*=/.test(zR) && !/archivadaTs\s*=/.test(zR));
ok('la recibida EN OBRA manda (primero se clasifica recibir, luego las 10 h)',
  (function(){ const iP = zR.indexOf('_pendRec'); const iA = zR.indexOf('_ocArch10.push'); return iP > 0 && iA > iP; })());

console.log('— la sección gemela —');
ok('existe HISTORIAL DE ÓRDENES AUTORIZADAS con su conteo', /HISTORIAL DE ÓRDENES AUTORIZADAS/.test(zR));
ok('usa la MISMA tarjeta (acciones vivas adentro)', /_ocArch10\.map\(_filaOc\)/.test(zR));
ok('con su toggle propio y persistencia por obra (patrón v1067)',
  /toggleOcHistorialAut/.test(zR) && /window\.toggleOcHistorialAut = function/.test(html) && /oc_hist_aut_visible_/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
