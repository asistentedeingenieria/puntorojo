/* v988 (pedido de Antonio 27-jul, sobre el doc de la SOLICITUD):
   1. El título rojo lleva SOLO la sigla + número: "VLA - 00003" (antes el nombre completo).
   2. El campo PROYECTO también va con la sigla (VLA).
   3. Las OBSERVACIONES SIEMPRE en UNA sola fila: nowrap + auto-shrink por JS (mide y baja
      el tamaño de letra hasta que quepa) — el script corre también en la captura de
      imagen, así que la foto compartida sale igual. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const z = ex('function _solicitudDocHTML(');
ok('el builder existe', !!z);

// ── 1 y 2: siglas ──
ok('el título rojo usa sigla + número', /class="num-lg">\$\{_projSiglas\(pd\.proyectoPedido \|\| p\.name\)\} - \$\{_solNum\(pd\)\}/.test(z));
ok('el campo PROYECTO usa la sigla', /<dt>Proyecto<\/dt><dd>\$\{_projSiglas\(pd\.proyectoPedido \|\| p\.name\)\}<\/dd>/.test(z));
ok('helper _solNum extrae el correlativo del número del pedido', /function _solNum\(/.test(html) && /\(\\d\+\)\\s\*\$/.test(html.replace(/\\\\/g,'\\')));

// ── 3: observaciones COMPLETAS ──
/* v988 las quería en UNA fila con letra encogible; v1211 (Antonio, 14-ago: "no se puede
   ver las observaciones completas") lo revirtió: en el compartido como imagen el
   encogedor JS no siempre corría y el texto salía CORTADO. Ahora QUIEBRAN por CSS puro
   (funciona igual en pantalla, impreso e imagen) y lo que v988 protegía de verdad —
   que el texto nunca se pierda — se cumple mejor. */
ok('las observaciones QUIEBRAN completas (sin nowrap ni overflow que corte)', /class="obs-1linea"/.test(z) && /\.obs-1linea\{[^}]*white-space:normal/.test(z) && !/\.obs-1linea\{[^}]*white-space:nowrap/.test(z));
ok('con quiebre de palabra por si un token es larguísimo', /\.obs-1linea\{[^}]*overflow-wrap:break-word/.test(z));
ok('el encogedor viejo quedó neutralizado (no corta nada)', /function _obsFit\(\)\{\}/.test(z));

// ── 4. bloque No. de la OC (pregunta de Antonio: se desbordaba sobre el título) ──
/* v1151: la línea grande es condicional — el DESPACHO PRE-PAGO muestra su REF (8273-12) y
   todo lo demás sigue con el número de la OC. La propiedad v988 se conserva. */
/* v1181: la aserción anclaba el TEXTO literal del bloque; ahora el No. grande deriva el
   formato nuevo (OC4 - 000009) vía _docNumNuevo y cae a _ocNumeroPartes(oc).oc si la obra no
   tiene código. La propiedad sigue siendo la misma: el número de la OC manda, grande y rojo. */
ok('el número de la OC manda (grande y rojo)', /font-size:16px;font-weight:800;color:#C8141C[^>]*>\$\{oc\.esPrepago && oc\.refExterna \?[\s\S]{0,400}?_ocNumeroPartes\(oc\)\.oc/.test(html));
ok('el pedido origen y la sigla van en chico debajo', /font-size:10\.5px[^>]*>\$\{_ocNumeroPartes\(oc\)\.pedido \? 'PEDIDO '/.test(html) && /font-size:9\.5px[^>]*>\$\{_obraSigla\(_ocNumeroPartes\(oc\)\.proyecto\)\} - APP/.test(html));
/* v1196: el track central pasó a minmax(0,1fr) — MISMO propósito de esta aserción
   (que nada se desborde) pero garantizado por especificación: un nowrap largo ya no
   puede inflar la rejilla y empujar el No. más allá de la línea. */
ok('la columna del número no se desborda (nowrap + rejilla que no crece)', /\.oc-num-col\{[^}]*white-space:nowrap/.test(html) && /\.oc-hd\{display:grid;grid-template-columns:180px minmax\(0,1fr\) 165px/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
