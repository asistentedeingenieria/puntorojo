/* v1244 (Antonio, 17-ago: "la firma sigue saliendo con un fondo"):
   CAUSA RAÍZ: la copia sellada de VLA-29 se subió ANTES de v1243 con la firma CRUDA
   (foto JPEG con fondo grisáceo, no blanco puro) y verifOk=true impedía re-sellarla;
   mix-blend-mode:multiply solo funde el blanco puro.
   FIX doble:
   1. verificar.html LIMPIA la firma al mostrarla (canvas: lo claro se vuelve
      transparente, queda solo el trazo) — arregla TODOS los docs ya sellados.
   2. El payload lleva versión (pv:2) y los subidores RE-SELLAN los docs con copia
      vieja (verifV < 2) — las nuevas copias nacen con la firma tinta de origen.
   (VER DETALLE no era falla: solo aparece con más de 8 renglones; VLA-29 tiene 3.) */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const vh = fs.readFileSync(path.join(__dirname, '..', 'verificar.html'), 'utf8');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— 1. la página limpia la firma al mostrarla (docs viejos incluidos) —');
ok('las firmas llevan clase para el procesado', /class="fmg"/.test(vh));
ok('se procesan con canvas (getImageData + alfa por claridad)', /getImageData/.test(vh) && /putImageData/.test(vh));
ok('lo CLARO se vuelve transparente, el trazo queda', /data\[i \+ 3\] = 0|a = 0/.test(vh.replace(/\n/g, ' ')) || /_firmaLimpiar/.test(vh));
ok('si el procesado falla, el multiply queda de respaldo', /mix-blend-mode:multiply/.test(vh));

console.log('— 2. los docs con copia vieja se RE-SELLAN —');
const zSub = ex(html, 'window._ocVerifSubir = async function');
ok('el subidor de la orden re-sube si la copia es vieja (verifV < 2)', /verifV/.test(zSub) && /pv/.test(ex(html, 'function _ocVerifPayload(')) === false ? false : /verifV\) \|\| 0\) >= 2\) return/.test(zSub.replace(/\n/g, ' ')));
ok('y al confirmar marca la versión nueva', /verifV = 2/.test(zSub));
const zSubP = ex(html, 'window._pedVerifSubir = async function');
ok('el del pedido igual', /verifV = 2/.test(zSubP) && /verifV\) \|\| 0\) >= 2\) return/.test(zSubP.replace(/\n/g, ' ')));
ok('los payloads llevan pv:2', /pv: 2/.test(ex(html, 'function _ocVerifPayload(')) && /pv: 2/.test(ex(html, 'function _pedVerifPayload(')));
ok('los respaldos perezosos delegan el gate al subidor (siempre lo llaman)',
  (function(){ const zP = ex(html, 'function printOrdenCompra('); const zA = ex(html, 'function _pedVerifAsegurar(');
    return /_ocVerifSubir\(oc\)/.test(zP) && /_pedVerifSubir\(pd, p\)/.test(zA); })());
ok('el escudo v1039 acarrea también la versión', /verifV/.test(ex(html, 'function _verifTokShield(')));

console.log('— 3. el mensaje verde SIEMPRE en una fila única —');
ok('nowrap + encogedor de letra hasta caber (nunca quiebra ni se corta)',
  /bannerVivo/.test(vh) && /white-space:nowrap/.test(vh) && /scrollWidth > bn\.clientWidth/.test(vh));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
