/* v873: (1) pestaña del navegador = "Panel" + favicon neutro propio (mata el globo por defecto);
   (2) splash de carga embellecido (overlay radial + spinner refinado), sin marca;
   (3) sub-pestaña VINCULAR NOMBRES eliminada de PÓLIZAS (ya vincularon todo; código dormido). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

ok('title = Panel', html.indexOf('<title>Panel</title>') >= 0);
ok('metas = Panel (sin "Gestión de obra")', html.indexOf('Gestión de obra') < 0);
ok('favicon neutro data-URI (sin globo)', /rel="icon"[^>]*data:image\/svg\+xml/.test(html));
ok('favicon = puntito rojo (círculo, v874)', /rel="icon"[^>]*circle[^>]*%23C8141C/.test(html));
ok('favicon NO usa logo.png', !/rel="icon"[^>]*logo\.png/.test(html));
ok('splash con glows radiales CSS', /pr-splash-bg::after\{[^}]*radial-gradient/.test(html) && /pr-splash-bg::before\{[^}]*radial-gradient/.test(html));
// v875: el splash NO usa imágenes (gradiente + glows 100% CSS)
const _spl = html.slice(html.indexOf('id="prSplash"'), html.indexOf('pr-splash-status'));
ok('splash SIN imágenes en el markup', _spl.indexOf('assets/bg-') < 0 && _spl.indexOf('bg-slide') < 0);
ok('fondo del splash es gradiente CSS (sin url)', /\.pr-splash\{[^}]*linear-gradient/.test(html) && !/\.pr-splash\{[^}]*url\(/.test(html));
ok('sin botón VINCULAR NOMBRES (el header dormido no cuenta)', html.indexOf("'vincular'; window.renderPlanillaPolizas") < 0);
ok('el render de vincular queda dormido (no borrado)', html.indexOf("_polView === 'vincular'") >= 0);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
