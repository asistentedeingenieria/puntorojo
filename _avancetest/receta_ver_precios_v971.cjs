/* v971 (pedido de Antonio 23-jul): precios de la RECETA solo para quien él marque.
   - Permiso nuevo receta.verPrecios: sin él (y sin ser admin) NO se ven P.U., SUBTOTAL,
     subtotal de etapa ni TOTAL NIVEL en la receta.
   - El ✕ de la receta NO elimina para quien propone (ya era así desde v949: dispara
     recetaV2Solicitar y lo aprueba receta.autorizar/admin) — se blinda con aserción y
     los títulos de los botones del proponente ahora dicen PROPONER.
   - El flujo de propuestas v949 queda intacto (proponer/autorizar/rechazar). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFrom(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. el permiso ──
ok('permiso receta.verPrecios en el catálogo', /key:\s*'receta\.verPrecios'/.test(html));

// ── 2. la zona del render de la receta (anclada al comentario v949) ──
const i0 = html.indexOf('// v949: el admin APLICA cambios directo');
const zona = html.slice(i0, i0 + 7000); // v974: el aviso de edición-por-apto agrandó el bloque
ok('gate puedeVerPrecios definido', /puedeVerPrecios = can\('receta\.verPrecios'\) \|\| can\('users\.manage'\)/.test(zona));
ok('columna P.U. condicionada', /puedeVerPrecios[^\n]*P\.U\./.test(zona.replace(/\n/g, ' ')) || /\(puedeVerPrecios \? '<th[^']*P\.U\./.test(zona));
ok('columna SUBTOTAL condicionada', /\(puedeVerPrecios \? '<th[^']*SUBTOTAL/.test(zona));
ok('celdas de precio condicionadas', (zona.match(/puedeVerPrecios \? '<td/g) || []).length >= 2);
ok('subtotal de etapa condicionado', /puedeVerPrecios[^\n]*Subtotal etapa/.test(zona.replace(/\n/g, ' ')));
ok('TOTAL NIVEL condicionado', /puedeVerPrecios[^\n]*TOTAL NIVEL/.test(zona.replace(/\n/g, ' ')));
ok('colspan dinámico según columnas visibles', /colspan="'\s*\+\s*\(puedeVerPrecios \? 6 : 4\)/.test(zona.replace(/\n/g, ' ')));

// ── 3. blindaje del flujo v949 (que nadie lo rompa sin querer) ──
ok('el proponente dispara SOLICITUD, no cambio directo', /accionReceta = esAdminReceta \? 'recetaV2Op' : 'recetaV2Solicitar'/.test(zona));
ok('título del proponente dice PROPONER', /Proponer cambio/.test(zona));
// v973 (decisión FINAL de Antonio 25-jul): quitar materiales es SOLO del admin —
// directo, sin propuesta. El proponente solo cambia cantidades y agrega.
ok('v973: el ✕ vive SOLO en la rama admin (recetaV2Op directo)', /esAdminReceta \? '<button class="btn-icon danger"[^']*solo admin[^']*onclick="recetaV2Op\(/.test(zona.replace(/\n/g, ' ')));
ok('v973: el proponente NO tiene quitar (su única acción de fila es ✎)', !/accionReceta[^\n]*quitar/.test(zona) && !/accion\+'[^']*quitar/.test(zona));
ok('v973: el prompt de quitar exige admin', /ELIMINAR MATERIALES DE LA RECETA ES SOLO DEL ADMIN/.test(html));
ok('v973: una solicitud vieja de quitar NO se autoriza sin ser admin', /sol\.tipo === 'quitar' && !can\('users\.manage'\)/.test(html));
// v974/v975: la vista TOTAL avisa (EN MAYÚSCULAS) que la edición es POR APARTAMENTO
ok('v974: aviso de edición por apartamento en vista TOTAL', /PARA CAMBIAR CANTIDADES ELEGÍ UN <b>APARTAMENTO<\/b>/.test(zona));
// v975: AGREGAR de no-admin genera SOLICITUD y NUNCA aplica directo (pedido explícito)
const zSol = (() => { const i = html.indexOf('window.recetaV2Solicitar = '); let d=0, j=html.indexOf('{', i); for(let k=j;k<html.length;k++){ if(html[k]==='{')d++; else if(html[k]==='}'){d--; if(!d) return html.slice(i,k+1);} } return ''; })();
ok('v975: recetaV2Solicitar NO aplica el cambio (solo encola)', !!zSol && !/aplicarOperacionReceta/.test(zSol) && /estado:'PENDIENTE'/.test(zSol));
ok('v975: el aviso al proponente dice que NO se aplica todavía', /EL CAMBIO NO SE APLICA TODAVÍA/.test(zSol));
// el ejecutor volvió a ser PURO (los tests de _recetatest lo ejercitan directo)
const iOpQ = html.indexOf("if (op.tipo === 'quitar'){");
const zOpQ = html.slice(iOpQ, iOpQ + 400);
ok('v973: el ejecutor sigue puro (el gate va en las fronteras)', /lista\.filter\(l => l\.m !== material\)/.test(zOpQ));
const zAut = extractFrom('function recetaV2Autorizar(') || html.slice(html.indexOf("can('receta.autorizar')") - 200, html.indexOf("can('receta.autorizar')") + 400);
ok('autorizar sigue gateado a receta.autorizar|admin', /receta\.autorizar/.test(zAut));

// ── 4. can() real: el permiso funciona y no regala nada más ──
const canSrc = extractFrom('function can(perm)');
let canFn = null;
try { canFn = new Function('getCurrentUser', '_permEsSoloVer', 'return (' + canSrc + ')')(
  () => ({ perms: ['receta.verPrecios'] }), () => false
); } catch(e){}
if (typeof canFn === 'function') {
  ok('con el permiso: ve precios', canFn('receta.verPrecios') === true);
  ok('sin regalar edición de receta', canFn('receta.edit') === false && canFn('receta.autorizar') === false);
} else { ok('can() evaluable', false); }

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
