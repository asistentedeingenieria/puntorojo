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
const zona = html.slice(i0, i0 + 6000);
ok('gate puedeVerPrecios definido', /puedeVerPrecios = can\('receta\.verPrecios'\) \|\| can\('users\.manage'\)/.test(zona));
ok('columna P.U. condicionada', /puedeVerPrecios[^\n]*P\.U\./.test(zona.replace(/\n/g, ' ')) || /\(puedeVerPrecios \? '<th[^']*P\.U\./.test(zona));
ok('columna SUBTOTAL condicionada', /\(puedeVerPrecios \? '<th[^']*SUBTOTAL/.test(zona));
ok('celdas de precio condicionadas', (zona.match(/puedeVerPrecios \? '<td/g) || []).length >= 2);
ok('subtotal de etapa condicionado', /puedeVerPrecios[^\n]*Subtotal etapa/.test(zona.replace(/\n/g, ' ')));
ok('TOTAL NIVEL condicionado', /puedeVerPrecios[^\n]*TOTAL NIVEL/.test(zona.replace(/\n/g, ' ')));
ok('colspan dinámico según columnas visibles', /colspan="'\s*\+\s*\(puedeVerPrecios \? 6 : 4\)/.test(zona.replace(/\n/g, ' ')));

// ── 3. blindaje del flujo v949 (que nadie lo rompa sin querer) ──
ok('el proponente dispara SOLICITUD, no borrado directo', /accionReceta = esAdminReceta \? 'recetaV2Op' : 'recetaV2Solicitar'/.test(zona));
ok('títulos del proponente dicen PROPONER', /Proponer quitar/.test(zona) && /Proponer cambio/.test(zona));
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
