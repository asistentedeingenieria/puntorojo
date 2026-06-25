/* v785: aplicar el sistema de diseño (tokens completos + Barlow en titulares). */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// fuentes — v827: Familjen Grotesk en toda la app
ok('carga Familjen Grotesk', /Familjen\+Grotesk/.test(html));
// Familjen es variable hasta 700 (no tiene 800/900); el link carga hasta 700.
ok('Familjen incluye peso 700', /Familjen\+Grotesk:wght@[^"'&]*700/.test(html));
// tokens nuevos
ok('token --font-display (Familjen)', /--font-display:\s*'Familjen Grotesk'/.test(html));
ok('token --font-sans (Inter)', html.indexOf('--font-sans:')>=0);
ok('escala --fs-h1', html.indexOf('--fs-h1:24px')>=0);
ok('espaciado --sp-4', html.indexOf('--sp-4:16px')>=0);
ok('alias --accent', /--accent:var\(--red\)/.test(html));
ok('--shadow-red', html.indexOf('--shadow-red:')>=0);
ok('--ink-backdrop', html.indexOf('--ink-backdrop:#0E1729')>=0);
// Barlow en titulares (regla original)
ok('Barlow aplicado a titulares', html.indexOf('.logo,.logo small,.section-num,h1.view-title,h2{font-family:var(--font-display)}')>=0);
// v827: la tipografía elegida (Familjen Grotesk) va en TODA la app (body incluido).
ok('v827 body en Familjen Grotesk', /html,body\{[^}]*font-family:'Familjen Grotesk'/.test(html));

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
