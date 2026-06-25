/* v785: aplicar el sistema de diseño (tokens completos + Barlow en titulares). */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// fuentes
ok('carga Barlow Semi Condensed', /Barlow\+Semi\+Condensed/.test(html));
// v824: la app ya no usa Inter; el link carga Barlow con pesos hasta 900.
ok('Barlow incluye peso 900', /Barlow\+Semi\+Condensed:wght@[^"'&]*900/.test(html));
// tokens nuevos
ok('token --font-display (Barlow)', /--font-display:\s*'Barlow Semi Condensed'/.test(html));
ok('token --font-sans (Inter)', html.indexOf('--font-sans:')>=0);
ok('escala --fs-h1', html.indexOf('--fs-h1:24px')>=0);
ok('espaciado --sp-4', html.indexOf('--sp-4:16px')>=0);
ok('alias --accent', /--accent:var\(--red\)/.test(html));
ok('--shadow-red', html.indexOf('--shadow-red:')>=0);
ok('--ink-backdrop', html.indexOf('--ink-backdrop:#0E1729')>=0);
// Barlow en titulares (regla original)
ok('Barlow aplicado a titulares', html.indexOf('.logo,.logo small,.section-num,h1.view-title,h2{font-family:var(--font-display)}')>=0);
// v824: la tipografía del título (Barlow Semi Condensed) ahora va en TODA la app (body incluido).
ok('v824 body en Barlow Semi Condensed', /html,body\{[^}]*font-family:'Barlow Semi Condensed'/.test(html));

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
