/* v824: (A) toda la INTERFAZ con la tipografía del título (Barlow Semi Condensed).
   (B) PLANILLA POR PERSONA: nombres completos en una fila (botón baja en móvil).
   (C) blindaje GLOBAL: toda tabla .tbl se envuelve en .tbl-scroll para hacer scroll
   horizontal en celular en vez de cortarse. */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── A: tipografía de la app en toda la interfaz (v827: Familjen Grotesk) ──
ok('A no quedan literales \'Inter\' en CSS', html.indexOf("'Inter'")<0);
ok('A no quedan literales \'Barlow Semi Condensed\' (reemplazada por Familjen)', html.indexOf("'Barlow Semi Condensed'")<0);
ok('A body usa Familjen Grotesk', /html,body\{[^}]*font-family:'Familjen Grotesk',sans-serif/.test(html));
ok('A --font-sans ahora es Familjen', /--font-sans:'Familjen Grotesk'/.test(html));
ok('A el link carga Familjen (400-700)', /Familjen\+Grotesk:wght@400;500;600;700/.test(html));
// v824 (fix revisión): Inter ya no se descarga ni se referencia (canvas/panel pasaron a Barlow)
ok('A el link YA NO descarga Inter', !/family=Inter:/.test(html));
ok('A sin refs Inter sin comillas (canvas/panel a Barlow)', !/12px Inter,/.test(html) && !/font-family:Inter,/.test(html));

// ── B: PLANILLA POR PERSONA, nombres en una fila ──
ok('B fila con clase pp-row', html.indexOf('class="pp-row"')>=0);
ok('B nombre con clase pp-name', html.indexOf('class="pp-name"')>=0);
ok('B en móvil la fila se apila (botón baja, nombre full)', /\.pp-row[^{]*\{[\s\S]{0,160}flex-direction:column/.test(html));
ok('B el nombre no se parte (nowrap)', /\.pp-name\{[^}]*white-space:nowrap/.test(html));

// ── C: blindaje global de tablas ──
ok('C clase .tbl-scroll con overflow-x', /\.tbl-scroll\{[^}]*overflow-x:auto/.test(html));
ok('C en print la tabla no se corta (overflow visible)', /@media print\{[^}]*\.tbl-scroll\{overflow:visible/.test(html) || /\.tbl-scroll\{overflow:visible\}/.test(html));
ok('C observer global que envuelve table.tbl', /MutationObserver/.test(html) && /table\.tbl/.test(html) && html.indexOf('tbl-scroll')>=0);
ok('C observer NO re-envuelve tablas ya en .tbl-wrap (sin doble scroll)', /closest\('\.tbl-wrap'\)\) continue/.test(html));
ok('C tablas más compactas en móvil', /@media[^{]*\{[\s\S]{0,400}table\.tbl[^}]*font-size:10px/.test(html) || /table\.tbl th,\s*table\.tbl td\{padding/.test(html));

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
