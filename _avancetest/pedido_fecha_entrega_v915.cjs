/* v915 (pedido de Antonio 13-jul): NO se puede confirmar un pedido de receta sin poner
   la FECHA DESEADA DE ENTREGA (antes la app ponía sola hoy+7 sin preguntar).
   - GENERAR PEDIDO AUTOMÁTICO: campo date obligatorio (cpFechaEntrega, min=hoy);
     CONFIRMAR pasa por _confirmarPedidoOk que valida y resuelve con 'DD/MM/YYYY'.
   - Selectores (elegir materiales / por apartamento): campo date en el footer
     (_selItemFecha / _selAptoFecha) validado en _selItemPedir/_selAptoPedir →
     opts.fechaEntrega.
   - pedirEtapaCompleta usa la fecha elegida; +7 días queda solo como fallback legacy. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. conversión de fecha del input ──
const srcConv = extractFn('_fechaInputALatam');
ok('_fechaInputALatam existe', !!srcConv);
if (srcConv) {
  const f = new Function(srcConv + '\nreturn _fechaInputALatam;')();
  ok('YYYY-MM-DD → DD/MM/YYYY', f('2026-07-20') === '20/07/2026');
  ok('vacío → vacío', f('') === '' && f(null) === '');
}

// ── 2. modal GENERAR PEDIDO AUTOMÁTICO ──
const mIdx = html.indexOf('id="modalConfirmarPedido"');
const mEnd = html.indexOf('</div>\n</div>', mIdx);
const modalHtml = html.slice(mIdx, mIdx + 6000);
ok('campo cpFechaEntrega en el modal', /id="cpFechaEntrega"/.test(modalHtml));
ok('CONFIRMAR pasa por el validador (no resuelve directo)', /_confirmarPedidoOk/.test(modalHtml) && !/onclick="closeModal\('confirmarPedido'\);window\._confirmarPedidoResolve&&window\._confirmarPedidoResolve\(true\)"/.test(html));
const srcShow = extractFn('showConfirmarPedidoModal');
ok('al abrir limpia la fecha y pone min=hoy', /cpFechaEntrega/.test(srcShow) && /\.min\s*=/.test(srcShow));
ok('el validador exige la fecha antes de confirmar', /_confirmarPedidoOk/.test(srcShow) && /FECHA DESEADA DE ENTREGA/.test(srcShow));
ok('resuelve con la fecha elegida (string)', /_confirmarPedidoResolve\(_fechaInputALatam\(/.test(srcShow) || /resolve\(val\)/.test(srcShow) && /_fechaInputALatam/.test(srcShow));

// ── 3. pedirEtapaCompleta usa la fecha elegida ──
const srcPedir = extractFn('pedirEtapaCompleta');
ok('acepta opts.fechaEntrega (selectores)', /opts\.fechaEntrega/.test(srcPedir));
ok('toma la fecha del confirm cuando es string', /typeof confirmado === 'string'/.test(srcPedir));
ok('la fecha elegida manda sobre el default +7', /_fechaEntregaElegida \|\|/.test(srcPedir));

// ── 4. selectores con fecha obligatoria ──
const srcSelItems = extractFn('_abrirSelectorItemsEtapa');
ok('selector de materiales tiene campo de fecha', /_selItemFecha/.test(srcSelItems));
const srcSelPedir = extractFn('_selItemPedir');
ok('_selItemPedir valida la fecha y la pasa', /_selItemFecha/.test(srcSelPedir) && /fechaEntrega/.test(srcSelPedir) && /FECHA DESEADA/.test(srcSelPedir));
const srcSelApto = extractFn('_abrirSelectorAptoEtapa');
ok('selector por apartamento tiene campo de fecha', /_selAptoFecha/.test(srcSelApto));
const srcAptoPedir = extractFn('_selAptoPedir');
ok('_selAptoPedir valida la fecha y la pasa', /_selAptoFecha/.test(srcAptoPedir) && /fechaEntrega/.test(srcAptoPedir) && /FECHA DESEADA/.test(srcAptoPedir));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
