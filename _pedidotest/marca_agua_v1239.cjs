/* v1239 (Antonio, 17-ago): "que cuando se descargue la OC se le ponga una marca de agua
   que NO se pueda borrar facil... que no se pueda falsificar externamente a la app."
   Realidad tecnica (se le dijo honesto): ninguna marca es imborrable; esta lo hace CARO:
   una MALLA diagonal repetida sobre TODO el documento cuyo texto son LOS DATOS de la OC
   (numero + total + sello + "VALIDA SOLO ESCANEANDO EL QR"). Editar un numero obliga a
   reconstruir la malla que cruza encima de textos y cifras, y el verificador puede
   comparar la malla contra lo impreso. Solo en AUTORIZADAS (el borrador ya trae BORRADOR);
   los despachos sin dinero van sin total en la malla. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zP = ex('function printOrdenCompra(');
ok('extrae printOrdenCompra', zP.length > 1000);

console.log('— la malla —');
ok('existe el bloque oc-malla en el documento', /oc-malla/.test(zP));
ok('SOLO en autorizadas (nunca sobre el BORRADOR)', /!showDraft && oc\.autorizadoPor[\s\S]{0,700}oc-malla/.test(zP));
ok('el texto de la malla lleva numero + sello + la leyenda',
  (function(){ const iL = zP.indexOf('VÁLIDA SOLO ESCANEANDO EL QR'); if (iL < 0) return false;
    const z = zP.slice(iL - 400, iL + 400);
    return /_ocSelloIntegridad\(oc\)/.test(z) && /_numLimpio\(oc\.numero/.test(z); })());
ok('el total va en la malla salvo en despachos sin dinero', /esDespacho \? '' : ' · Q ' \+ fmtQ\(oc\.total\)/.test(zP));
ok('la malla vive DENTRO de la hoja (encima del contenido, antes de las firmas)',
  (function(){ const iS = zP.indexOf('class="oc-sheet"'); const iM = zP.indexOf('oc-malla', iS); const iF = zP.indexOf('oc-firmas', iS); return iS > 0 && iM > iS && iM < iF; })());

console.log('— el CSS —');
const iCss = zP.indexOf('.oc-malla');
const zCss = iCss > 0 ? zP.slice(iCss, iCss + 700) : '';
ok('cubre toda la hoja y no estorba (absolute + pointer-events none + overflow hidden)',
  /position:absolute/.test(zCss) && /pointer-events:none/.test(zCss) && /overflow:hidden/.test(zCss));
ok('cruza ENCIMA del contenido (z-index positivo) y va rotada', /z-index/.test(zCss) && /rotate\(/.test(zCss));
ok('tinta roja institucional casi transparente (no tapa la lectura ni el QR)', /rgba\(200,20,28,\.0/.test(zCss));

console.log('— v1242: el COMPARTIR al proveedor va LIMPIO —');
/* Antonio (17-ago, con el DESP4-000013 compartido): "cuando se le da compartir OC desde la
   aplicación quiero que ahí sí sea una orden limpia sin la marca de agua". La malla queda
   para lo IMPRESO/DESCARGADO (su idea original); en el canal oficial al proveedor la
   garantía es el QR con la copia sellada en la nube (v1240). */
const zComp = (function(){ let m=html.indexOf('window.compartirOcImg = async function'); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; })();
ok('compartirOcImg pide la hoja SIN malla', /soloHTML: true, sinMalla: true/.test(zComp));
ok('printOrdenCompra respeta el pedido (gate && !_sinMalla)', /opts\.sinMalla/.test(zP) && /&& !_sinMalla/.test(zP));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
