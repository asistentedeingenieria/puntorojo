/* v1291 (Antonio, 27-ago: "NO me gusta la tipología que estás usando ahora [v1286 puso
   la letra de la app en las hojas]. Regresá a la misma de antes en TODAS las órdenes y
   pedidos — normal pero ÚNICA, que no se pueda replicar para editarla en otro lado"):
   Las hojas vuelven al LOOK de siempre con ARIMO — métricamente compatible con Arial
   (misma anchura y ritmo: se ve "la de antes") pero NO instalada en Windows/Word/
   Android: la hoja sale IDÉNTICA en todos los aparatos (muere la falsa alarma
   Arial-vs-Roboto del caso OC1-000016) y una hoja rehecha afuera con la Arial de
   verdad difiere en los detalles (R, G, Q, números). HONESTO (regla v1239): ninguna
   letra es imposible de copiar — la prueba dura sigue siendo el QR; esto solo hace el
   fraude más delatable. Loader propio _hojaArimo (patrón _pdfBarlow: CDN + cache
   localStorage + prefetch al arrancar); la letra de la app (Familjen) queda SOLO para
   los PDFs de _pdfBarlow, fuera de las hojas. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zT = ex('function _hojaFontTag(');
ok('las hojas ya NO llevan la letra de la app (Familjen/_pdfBarlow fuera)', zT.length > 50 && !/_pdfBarlow/.test(zT));
ok('llevan ARIMO (la gemela métrica de Arial)', /_hojaArimo/.test(zT));
ok('el respaldo sigue siendo Arial (look de siempre pase lo que pase)', /,Arial,sans-serif/.test(zT));

const iL = html.indexOf('window._hojaArimo = (function(){');
const zL = html.slice(iL, iL + 1600);
ok('loader propio con cache en localStorage', iL > 0 && /localStorage/.test(zL) && /pr_hoja_arimo/.test(zL));
ok('baja Arimo del CDN de google/fonts', /ofl\/arimo/.test(zL));
ok('prefetch al arrancar (la primera hoja del día ya sale con ella)', /setTimeout/.test(zL) && /prefetch/.test(zL));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
