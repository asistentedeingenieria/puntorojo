/* v917 (pedido de Antonio sobre las fechas de la OC):
   (1) FECHA de la OC = el día en que se genera, automática. Ya se prefillaba pero con
       toISOString() = UTC — en Guatemala (UTC-6) después de las 18:00 salía MAÑANA.
       Fix: _hoyInputISO() (hora local, helper v915).
   (2) FECHA DE ENTREGA = la fecha deseada del supervisor (pd.fechaEntrega, que desde
       v915 es la que él eligió), editable por compras si la entrega real cambia —
       eso YA existía; el fallback sin fecha (mañana) también pasa a hora local. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const src = extractFn('openOrdenCompra');
ok('openOrdenCompra extraída', !!src);
ok('FECHA del día en hora LOCAL (no UTC)', /_hoyInputISO\(\)/.test(src));
ok('sin toISOString en las fechas del modal de OC', !/toISOString/.test(src));
ok('FECHA DE ENTREGA se prefilla con la del pedido (deseada del supervisor)', /pd\.fechaEntrega && \/\^\\d\{2\}\\\/\\d\{2\}\\\/\\d\{4\}\$\/\.test\(pd\.fechaEntrega\)/.test(src));

// el helper local sigue siendo correcto (hora local, no UTC)
const srcHoy = extractFn('_hoyInputISO');
ok('_hoyInputISO usa getFullYear/getMonth/getDate locales', /getFullYear\(\)/.test(srcHoy) && /getMonth\(\)/.test(srcHoy) && /getDate\(\)/.test(srcHoy) && !/toISOString/.test(srcHoy));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
