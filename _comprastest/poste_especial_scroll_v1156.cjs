/* v1156 — POSTE ESPECIAL con tipo + metros→pies automático, y los modales de bodega
   limpios con scroll visible

   Antonio (7-ago, madrugada):
   1. "en poste a la medida especial la seleccion de cualquier tipo de poste de los que
      tenemos, la cantidad y la medida... cuando se seleccione la medida nueva en METROS
      se hace la conversion a PIES y en la descripcion tu ya lo cambias automaticamente:
      POSTE DE 2½" X 12' CAL. 26 — donde dice X 12' tu ya pondrias la medida convertida."
      El formato con paréntesis es el MISMO del circuito real de compras (y del incidente
      VLA-13): `9.19' (MEDIDA ESPECIAL 2.8 M)`. 1 m = 3.28084 pies, redondeo a 2 decimales.
      Al ENVIAR, el poste especial se convierte en un EXTRA con el nombre completo — viaja
      por el circuito de siempre (OC/recibo/detalle) sin tocar nada.
   2. ABASTECER y CARGAR EXISTENCIAS: scroll VISIBLE a la derecha y abrir SIEMPRE en
      blanco. Hallazgo: ambos ya destruyen su DOM al cerrar; lo que "quedaba marcado" en
      ABASTECER eran (a) las cantidades de FALTANTES pre-llenadas (feature v959 — Antonio
      la retira: cantidades siempre vacías) y (b) los CHECKS, que NO son selección sino la
      config DE BODEGA (v964, despacho automático) — decisión de Antonio: SE QUEDAN. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* ══ 1. las puras: tipos del catálogo y el nombre convertido ══ */
console.log('— los tipos de poste y la conversión a pies —');
const zT = ex(html, 'function _posteTipos(');
const zN = ex(html, 'function _posteEspecialNombre(');
ok('existen', !!zT && !!zN);
let tipos = null, nombre = null;
try {
  const CAT = [{ cat: 'TABLAYESO · ESTRUCTURA', items: [
    'POSTE DE 2½" X 10\' CAL. 20', 'POSTE DE 2½" X 10\' CAL. 22', 'POSTE DE 2½" X 8\' CAL. 26',
    'POSTE DE 2½" X 12\' CAL. 26', 'POSTE DE 3 5/8" X 10\' CAL. 20', 'POSTE DE 3 5/8" X 10\' CAL. 26',
    'POSTECILLO DE 1 5/8" X 10\' CAL. 26', 'CANAL DE 2½" X 10\' CAL. 20',
    { name: 'POSTE ESPECIAL', specLabel: 'MEDIDA' }
  ]}];
  if (zT) tipos = new Function('CATALOGO_MATERIALES', 'return (' + zT + ')')(CAT);
  if (zN) nombre = new Function('return (' + zN + ')')();
} catch(e){}
ok('evalúan', typeof tipos === 'function' && typeof nombre === 'function');
if (tipos) {
  const t = tipos();
  ok('deriva los tipos ÚNICOS perfil+calibre del catálogo', t.length === 5
    && t.some(x => x.perfil === '2½"' && x.cal === '26') && t.some(x => x.perfil === '3 5/8"' && x.cal === '20'));
  ok('el CANAL y el POSTECILLO no son tipos de poste', !t.some(x => String(x.perfil).indexOf('1 5/8') >= 0));
}
if (nombre) {
  ok('2.8 m ⇒ 9.19 pies con el formato del circuito real',
    nombre('2½"', '26', 2.8) === 'POSTE DE 2½" X 9.19\' CAL. 26 (MEDIDA ESPECIAL 2.8 M)');
  ok('3 m ⇒ 9.84 pies', nombre('3 5/8"', '20', 3) === 'POSTE DE 3 5/8" X 9.84\' CAL. 20 (MEDIDA ESPECIAL 3 M)');
  ok('metros inválidos ⇒ vacío', nombre('2½"', '26', 0) === '' && nombre('2½"', '26', 'x') === '' && nombre('', '26', 2) === '');
}

/* ══ 2. la UI del ítem y el estado del form ══ */
console.log('\n— el renglón POSTE ESPECIAL en el catálogo —');
const zR = ex(code, 'function renderCatalogItem(');
ok('el ítem POSTE ESPECIAL tiene su render propio (select tipo + metros)',
  /POSTE ESPECIAL/.test(zR) && /_posteTipos\(\)/.test(zR) && /METROS|metros/.test(zR));
ok('con la vista previa del nombre en vivo', /peNombrePreview|_pePreview/.test(zR));
ok('el estado del poste especial existe y se limpia con el form',
  /pedidoPosteEspecial = \{ tipo: '', metros: '' \}/.test(code)
  && (code.match(/pedidoPosteEspecial = \{ tipo: '', metros: '' \}/g) || []).length >= 3);

/* ══ 3. el envío: exige tipo+metros y viaja como EXTRA con el nombre completo ══ */
console.log('\n— el envío del pedido —');
const zS = ex(code, 'async function submitPedido(');
ok('sin tipo o metros el pedido NO sale (aviso)', /_posteEspecialNombre\(/.test(zS) && /FALTA EL TIPO O LA MEDIDA|ELEG[ÍI] EL TIPO/.test(zS));
ok('se convierte en EXTRA con el nombre convertido (viaja por el circuito de siempre)',
  /_herrPedido|validExtras/.test(zS) && /_peNombre|_posteEspecialNombre/.test(zS));
ok('la clave POSTE ESPECIAL se saca de items', /POSTE ESPECIAL[\s\S]{0,220}delete _itemsPedido\[/.test(zS) || /delete _itemsPedido\[[\s\S]{0,80}POSTE ESPECIAL/.test(zS));

/* ══ 4. los modales de bodega ══ */
console.log('\n— abastecer y cargar existencias —');
const zAb = ex(code, 'function _abrirModalBodega(');
ok('las cantidades de ABASTECER abren VACÍAS (el pre-llenado v959 se retiró)',
  !/q\.value = -_saldo/.test(zAb));
ok('los CHECKS de config DE BODEGA se quedan (decisión de Antonio)',
  /_esItemBodega\(x\.name\) \? 'checked'/.test(zAb) && /_toggleItemBodega/.test(zAb));
ok('el scroll es VISIBLE en los dos modales (clase compartida)',
  (code.match(/pr-scroll-vis/g) || []).length >= 2 && /class="pr-scroll-vis"[^>]*style="overflow:auto|style="overflow:auto[^"]*"[^>]*class="pr-scroll-vis"|pr-scroll-vis"/.test(code));
ok('la clase pinta el scrollbar (webkit + firefox)',
  /\.pr-scroll-vis::-webkit-scrollbar/.test(html) && /\.pr-scroll-vis\{[^}]*scrollbar-width/.test(html));

console.log('\n— lo que no cambia —');
ok('los faltantes siguen visibles en ROJO en la tabla del panel', /EXISTENCIA en rojo|faltante/i.test(html));
ok('el spec de los DEMÁS ítems del catálogo sigue igual (REGISTRO, REBORDE…)', /updatePedidoSpec\(/.test(zR));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
