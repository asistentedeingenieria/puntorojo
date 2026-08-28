/* v1304 · FASE 1 de la revisión de seguridad (Antonio, 27-ago, metodología vibe-check):
   XSS ALMACENADO. La app arma HTML con template strings + innerHTML y tiene helpers de
   escape (esc global L33518, escapea & < > " '), pero se aplicaban de forma INCONSISTENTE:
   el mismo campo se escapa en una vista y va crudo en otra. Un usuario de bajo privilegio
   pone su displayName/nombre = <img src=x onerror=...> y el script corre en la sesión de
   quien abra esa pantalla (típicamente admin) → toma de cuenta.
   FIX: envolver con esc()/escOc() los datos de USUARIO en los sinks confirmados. Cero
   cambios de lógica ni datos — solo escapar texto. Verifica por AUSENCIA del patrón crudo
   y PRESENCIA del escapado. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const verif = fs.readFileSync(path.join(__dirname, '..', 'verificar.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* CRÍTICO — lista de usuarios (displayName controlado por cada usuario) */
ok('renderUsers: displayName escapado', html.includes('${esc(u.displayName || ident)}') && !html.includes('${u.displayName || ident}'));
ok('renderUsers: ident y cargo escapados', /<div class="u-meta">\$\{esc\(ident\)\}\$\{u\.cargo \? ' · ' \+ esc\(u\.cargo\)/.test(html));

/* ALTO — tarjeta de pedido */
ok('pedido: solicitante escapado', html.includes('<dd>${esc(pd.solicitante || \'—\')}</dd>') && !html.includes('<dd>${pd.solicitante || \'—\'}</dd>'));
ok('pedido: nombre y spec de material escapados', html.includes('${esc(it.name)}') && html.includes("[' + esc(it.spec) + ']") && !/\$\{it\.name\}\$\{it\.spec/.test(html));

/* ALTO — proveedor */
ok('note.innerHTML: proveedor escapado', html.includes('${esc(prv.nombre)} ASIGNADO A TODOS') && !html.includes('${prv.nombre} ASIGNADO'));
ok('resumen multi-OC: g.nombre escapado', html.includes('<strong>${esc(g.nombre)}</strong>') && !html.includes('<strong>${g.nombre}</strong>'));
ok('hoja OC: proveedorNombre escapado', html.includes('<dd>${esc(oc.proveedorNombre)}') && !html.includes('<dd>${oc.proveedorNombre}'));

/* ALTO — asistencia / personal */
ok('personal: c.nombre escapado', html.includes('font-size:13px">${esc(c.nombre)}</div>') && !html.includes('font-size:13px">${c.nombre}</div>'));
ok('personal: c.cargo escapado', html.includes("${esc(c.cargo)||'—'}") || html.includes("${esc(c.cargo||'—')}"));
ok('facturado por: nombre y dpi escapados', html.includes('${esc(f.nombre)}') && html.includes("DPI '+esc(f.dpi)") && !/\$\{f\.nombre\}\$\{f\.dpi/.test(html));

/* recibo/solicitud sheet */
ok('recibo: solicitante escapado', html.includes('<dd>${esc(pd.solicitante)}</dd>') && !html.includes('<dd>${pd.solicitante}</dd>'));

/* MEDIO — movimientos de bodega */
ok('bodega mov: name/ref/por escapados', html.includes('${esc(mv.name)}') && html.includes("· ' + esc(ref) + '") && html.includes("· ' + esc(mv.por) + '"));

/* MEDIO — receptores (actor externo, entrada menos confiable) */
ok('receptor: nombre/cargo/contacto escapados', html.includes("${esc(r.nombre || '')}") && html.includes("${esc(r.cargo || 'SIN CARGO')}") && html.includes('${esc(r.contacto)}'));

/* BAJO — verificar.html: src de firma solo validaba prefijo */
ok('verificar.html: src de firma con validación estricta de data-URL', verif.includes('^data:image\\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$'));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
