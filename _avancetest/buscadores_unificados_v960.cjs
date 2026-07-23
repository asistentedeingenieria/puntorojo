/* v960 (pedido de Antonio 23-jul): TODOS los buscadores y filtros de la app unificados —
   misma altura (40px), mismo borde var(--line), radius 8, mayúsculas, foco rojo; los
   desplegables compactos y ordenados. Estándar = el look v830/.pr-combo que ya existía.
   Clases nuevas .pr-buscador (inputs de búsqueda) y .pr-filtro (selects de filtro) en un
   bloque CSS propio antes de </head> (gana la cascada al safety-net) + modo oscuro.
   NO se tocan: navbar (regla v830), editores .inline de tablas, kiosko oscuro. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFrom(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. el bloque CSS del estándar ──
const iCss = html.indexOf('v960-buscadores');
ok('bloque CSS v960 existe', iCss > -1);
const zCss = html.slice(iCss, iCss + 3500);
ok('.pr-buscador con el estándar 40px', /\.pr-buscador\{[^}]*min-height:40px/.test(zCss) && /border:1px solid var\(--line\)/.test(zCss) && /border-radius:8px/.test(zCss) && /text-transform:uppercase/.test(zCss));
ok('.pr-buscador foco rojo con halo', /\.pr-buscador:focus[^}]*border-color:var\(--red\)/.test(zCss.replace(/\n/g,'')));
ok('select.pr-filtro con el estándar', /select\.pr-filtro/.test(zCss));
ok('modo oscuro cubierto', /body\.pr-dark[^}]*\.pr-buscador/.test(zCss));

// ── 2. buscadores estáticos con la clase ──
const tiene = (id, cls) => new RegExp('id="' + id + '"[^>]*class="[^"]*' + cls + '|class="[^"]*' + cls + '[^"]*"[^>]*id="' + id + '"').test(html);
ok('avanceSearch unificado', tiene('avanceSearch', 'pr-buscador') && !/id="avanceSearch"[^>]*border-radius:2px/.test(html));
ok('catalogoSearchInput unificado', tiene('catalogoSearchInput', 'pr-buscador'));
ok('persBuscar unificado (ya no .inline pelón)', tiene('persBuscar', 'pr-buscador'));
ok('asistBuscar unificado', tiene('asistBuscar', 'pr-buscador'));
ok('gerBuscar unificado', tiene('gerBuscar', 'pr-buscador'));
ok('usersBuscar unificado', tiene('usersBuscar', 'pr-buscador'));
ok('catProvSearch unificado', tiene('catProvSearch', 'pr-buscador'));
ok('asistFecha (filtro fecha) unificado', tiene('asistFecha', 'pr-buscador'));

// ── 3. filtros select estáticos ──
ok('persEmpresaFilter unificado', tiene('persEmpresaFilter', 'pr-filtro'));
ok('asistObraPdf unificado', tiene('asistObraPdf', 'pr-filtro'));
ok('inboxFilter unificado', tiene('inboxFilter', 'pr-filtro'));

// ── 4. buscadores/filtros generados por template ──
ok('polSearchInput unificado', tiene('polSearchInput', 'pr-buscador'));
ok('colabSearchInput unificado', tiene('colabSearchInput', 'pr-buscador'));
ok('v372PersonaBuscadorInput unificado', tiene('v372PersonaBuscadorInput', 'pr-buscador'));
ok('polPersonaBuscador unificado', tiene('polPersonaBuscador', 'pr-buscador'));
ok('_prPickerBusca unificado', tiene('_prPickerBusca', 'pr-buscador'));

// pólizas: los 2 selects viejos de la barra ya no llevan el look #DDD radius 4
const iPolBar = html.indexOf('_polFiltroEstatus=this.value');
const zPolBar = html.slice(iPolBar - 400, iPolBar + 900);
ok('selects de pólizas con pr-filtro', (zPolBar.match(/class="pr-filtro"/g) || []).length >= 2);
ok('selects de pólizas sin borde #DDD viejo', !/border:1px solid #DDD/.test(zPolBar));
// anticipos LISTADO: filtro ESTADO (anclar en el onchange del select, no en el primer uso de la var)
const iAntBar = html.indexOf('_antFiltroEstado=this.value; window.renderPlanillaAnticipos');
const zAntBar = html.slice(iAntBar - 200, iAntBar + 700);
ok('filtro ESTADO de anticipos unificado', /pr-filtro/.test(zAntBar) && !/border:1px solid #DDD/.test(zAntBar));
// LIQUIDACIONES OC: select ESTATUS RENGLÓN + BUSCAR OC # (anclar en el oninput del buscador)
const iOcBar = html.indexOf('_ocFiltroNumero=this.value');
const zOcBar = html.slice(iOcBar - 900, iOcBar + 400);
ok('filtros de LIQUIDACIONES OC unificados', /pr-filtro/.test(zOcBar) && /pr-buscador/.test(zOcBar) && !/border:1px solid #DDD/.test(zOcBar));

// ── 5. selStyle (descuentos/control anticipos): sin colores hardcodeados ──
const selStyles = html.match(/selStyle = '[^']*'/g) || [];
ok('selStyle usa var(--line), no #E2E8F0', selStyles.length >= 3 && selStyles.every(s => !/#E2E8F0/.test(s) && /var\(--line\)/.test(s)));

// ── 6. combobox _v391 (modales anticipo/póliza): estándar, no #DDD ──
const zV391 = extractFrom('window._v391Combobox = function');
ok('_v391Combobox input unificado', /pr-buscador|var\(--line\)/.test(zV391) && !/border:1px solid #DDD/.test(zV391));

// ── 7. desplegables ordenados y compactos ──
const zProv = extractFrom('function _provPickerItems(');
ok('proveedores del picker ORDENADOS A-Z', /localeCompare/.test(zProv));
const iPicker = html.indexOf("id='_prPickerPanel'") > -1 ? html.indexOf("id='_prPickerPanel'") : html.indexOf('_prPickerBusca');
const zPicker = html.slice(Math.max(0, iPicker - 2500), iPicker + 2500);
ok('panel del picker compacto (max-height 280)', /max-height:280px/.test(zPicker));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
