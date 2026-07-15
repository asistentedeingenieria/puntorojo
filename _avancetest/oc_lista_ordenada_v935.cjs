/* v935 (pedido de Antonio con print del historial de OCs): "que todo se vea ordenado,
   centrado, limpio y profesional". CAUSA del desorden: cada fila era su propia grilla
   con columnas `auto` → cada fila calculaba anchos distintos y nada quedaba alineado
   entre filas. Fix:
   (1) columnas de ANCHO FIJO en .oc-list-item (todas las filas idénticas);
   (2) el No. en 3 líneas ordenadas vía _ocNumeroPartes (proyecto / PEDIDO n / OC##,
       como el encabezado de la hoja v926), con fallback al número plano;
   (3) botones apilados uniformes a lo ancho de su columna (adiós flex-wrap con
       max-width inline);
   (4) en celular (≤640px) las acciones vuelven a fila (layout apilado v826 intacto). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. columnas fijas = filas alineadas entre sí ──
ok('.oc-list-item con columnas de ancho FIJO', /\.oc-list-item\{[^}]*grid-template-columns:\d+px minmax\(0,1fr\) \d+px \d+px \d+px/.test(html));

// ── 2. No. en 3 líneas ordenadas ──
const src = extractFn('renderOrdenesList');
ok('usa _ocNumeroPartes para partir el número', /_ocNumeroPartes\(oc\)/.test(src));
ok('3 líneas: proyecto / pedido / OC', /ocn-proy/.test(src) && /ocn-ped/.test(src) && /ocn-oc/.test(src));
ok('fallback al número plano si no se puede partir', /oc\.numero/.test(src));
ok('estilos de las 3 líneas definidos', /\.oc-list-num \.ocn-proy\{/.test(html) && /\.oc-list-num \.ocn-oc\{/.test(html));

// ── 3. botones apilados uniformes ──
ok('.oc-list-actions apila en columna', /\.oc-list-actions\{[^}]*flex-direction:column/.test(html));
ok('botones a todo el ancho de su columna', /\.oc-list-actions \.btn\{[^}]*width:100%/.test(html));
ok('se fue el parche inline (flex-wrap + max-width)', src.indexOf('max-width:180px') === -1);

// ── 4. celular: acciones vuelven a fila (v826 intacto) ──
ok('mobile: acciones en fila', /@media \(max-width:640px\)\{[\s\S]{0,1600}\.oc-list-actions\{[^}]*flex-direction:row/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
