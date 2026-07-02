/* v870: discreción — el logo y el nombre de la empresa NO aparecen en ningún lado DENTRO de la app
   ni en los PDFs/Excel generados. El ícono de instalación (manifest/logo.png como archivo) SE QUEDA. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const manifest = fs.readFileSync(path.join(__dirname, '..', 'manifest.json'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── logo fuera de la interfaz ──
ok('sin <img> del logo en la app', html.indexOf('<img src="logo.png"') < 0);
ok('sin favicon del logo', !/rel="icon"[^>]*logo\.png/.test(html));
ok('sin apple-touch-icon del logo', !/apple-touch-icon[^>]*logo\.png/.test(html));
ok('sin logo en el modal de OC', html.indexOf('img src="${LOGO_DATA_URI}"') < 0);

// ── logo fuera de los PDFs ──
const pl = (function(){ let m=html.indexOf('function _pdfLogo('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; })();
ok('_pdfLogo ya no dibuja nada', !!pl && pl.indexOf('addImage') < 0);
ok('sin addImage del logo en portadas', (html.match(/addImage\(LOGO_DATA_URI/g)||[]).length === 0);

// ── nombre fuera de lo visible ──
ok('title neutro', html.indexOf('<title>Gestión de obra</title>') >= 0);
ok('sin ¡Bienvenido a Punto Rojo!', html.indexOf('Bienvenido a Punto Rojo') < 0);
ok('sin BIENVENIDO A PUNTO ROJO', html.indexOf('BIENVENIDO A PUNTO ROJO') < 0);
ok('notifs del navegador con título neutro', html.indexOf("new Notification('PUNTO ROJO'") < 0);
ok('login sin <img> del logo (la clase CSS huérfana es inerte)', !/<img[^>]*auth-logo-img/.test(html));

// ── intacto a propósito ──
ok('manifest sigue con su ícono (instalación intacta)', /logo\.png|icon\.svg/.test(manifest));
ok('LOGO_DATA_URI puede seguir definido (solo sin USO visible)', true);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
