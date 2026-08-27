/* v1294 · FASE B del vestíbulo (Antonio: "el de existencias NO me gusta que se vea
   TOOODA LA LISTA — tipo comprimido"): la vista EXISTENCIAS ya no abre con la lista
   entera. CHIPS: ATENCIÓN (negativos + en camino, el default) · NEGATIVOS · EN CAMINO ·
   TODOS (el chip TODOS ES la regla v1192: renglones en cero ocultos, el buscador los
   encuentra). Debajo de la tabla, "▶ VER TODOS · N" cuando hay filtro puesto, y un
   "NADA PIDE ATENCIÓN" verde cuando el filtro no deja renglones. La BÚSQUEDA manda
   sobre los chips (buscar enseña TODO, v1192); al limpiar vuelve el chip. La línea HOY
   del hub llega con el chip puesto (N EN NEGATIVO → existencias con chip neg).
   TODO por display — data-aj posicional sobre _bodegaPanelRows intacto (nada se
   re-ordena ni re-renderiza). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* ── 1. las filas llevan sus marcas ── */
ok('cada renglón marca negativo y en-camino', /data-bneg="\$\{x\.saldo < 0 \? 1 : 0\}"/.test(html) && /data-bcam="\$\{\(x\.camino \|\| 0\) > 0 \? 1 : 0\}"/.test(html));

/* ── 2. chips + conteos en la plantilla ── */
const iPanel = html.indexOf('function _abrirPanelBodega(');
const zPanel = html.slice(iPanel, iPanel + 30000);
ok('conteos derivados de la misma lista', /_exiAt/.test(zPanel) && /_exiNeg/.test(zPanel) && /_exiCam/.test(zPanel) && /_exiTodos/.test(zPanel));
ok('los 4 chips', ['atencion','neg','camino','todos'].every(c => zPanel.indexOf('data-bexichip="' + c + '"') >= 0));
ok('VER TODOS y el vacío verde', /_bodegaExiVerTodos/.test(zPanel) && /_bodegaExiVacio/.test(zPanel) && /NADA PIDE ATENCIÓN/.test(zPanel));

/* ── 3. el conmutador, FUNCIONAL ── */
const zAp = ex('function _bodegaExiAplicar(');
ok('_bodegaExiAplicar existe', zAp.length > 300);
if (zAp.length > 300) {
  try {
    const corre = (filtro, q, rows) => {
      const vacio = { style: {} }, verTodos = { style: {} };
      const doc = { getElementById: id =>
        id === '_bodegaPanelModal' ? { querySelectorAll: sel => sel === '[data-bfila]' ? rows : [] }
        : (id === '_bodegaViewFiltro' ? { value: q } : (id === '_bodegaExiVacio' ? vacio : (id === '_bodegaExiVerTodos' ? verTodos : null))) };
      new Function('document', 'window', zAp + '\n_bodegaExiAplicar();')(doc, { _bodegaExiFiltro: filtro });
      return { rows, vacio, verTodos };
    };
    const R = () => [
      { dataset: { bcero: '0', bneg: '1', bcam: '0' }, style: {} },  /* negativo */
      { dataset: { bcero: '0', bneg: '0', bcam: '1' }, style: {} },  /* en camino */
      { dataset: { bcero: '0', bneg: '0', bcam: '0' }, style: {} },  /* con stock normal */
      { dataset: { bcero: '1', bneg: '0', bcam: '0' }, style: {} }   /* en cero (v1192) */
    ];
    const vis = r => r.rows.map(x => x.style.display === 'grid' ? 1 : 0).join('');
    ok('ATENCIÓN (default): solo negativos + en camino', vis(corre('', '', R())) === '1100');
    ok('NEGATIVOS: solo los rojos', vis(corre('neg', '', R())) === '1000');
    ok('EN CAMINO: solo lo pedido', vis(corre('camino', '', R())) === '0100');
    ok('TODOS = regla v1192 (los cero siguen ocultos)', vis(corre('todos', '', R())) === '1110');
    const sinNeg = corre('neg', '', [R()[1], R()[2]]);
    ok('filtro sin renglones → vacío verde a la vista', sinNeg.vacio.style.display !== 'none' && sinNeg.rows.every(x => x.style.display === 'none'));
    ok('VER TODOS visible con filtro puesto, oculto en TODOS', corre('neg', '', R()).verTodos.style.display !== 'none' && corre('todos', '', R()).verTodos.style.display === 'none');
    const conQ = corre('neg', 'clavo', R());
    ok('la BÚSQUEDA manda: no pisa los renglones y esconde sus botones', conQ.rows.every(x => x.style.display === undefined) && conQ.vacio.style.display === 'none' && conQ.verTodos.style.display === 'none');
  } catch(e){ ok('conmutador evaluable', false); console.log('  ' + e.message); }
}

/* ── 4. enganches ── */
const zFil = html.slice(html.indexOf('window._bodegaViewFiltrar = function'), html.indexOf('window._bodegaViewFiltrar = function') + 900);
ok('el filtro sin búsqueda delega en los chips', /_bodegaExiAplicar\(\)/.test(zFil));
const zChip = html.slice(html.indexOf('window._bodegaExiChip = function'), html.indexOf('window._bodegaExiChip = function') + 500);
ok('el chip limpia el buscador y aplica', /_bodegaViewFiltro/.test(zChip) && /_bodegaExiAplicar/.test(zChip));
ok('_bodegaIrA acepta llegar con chip puesto', /window\._bodegaIrA = function\(v, chip\)/.test(html));
ok('la línea HOY de negativos llega con el chip neg', /_bodegaIrA\('existencias','neg'\)/.test(html) || /_bodegaIrA\('existencias', 'neg'\)/.test(html));
const iTail = html.indexOf("console.warn('[v1293] vista', e)");
ok('la cola del panel también aplica los chips', iTail > 0 && /_bodegaExiAplicar\(\)/.test(html.slice(iTail, iTail + 300)));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
