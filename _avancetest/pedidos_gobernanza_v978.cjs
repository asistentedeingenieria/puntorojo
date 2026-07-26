/* v978 (pedidos de Antonio 26-jul):
   1. ORDEN NUMÉRICO SIEMPRE: la numeración de pedidos deja el contador mutable (saltaba
      números al eliminar: quedó 00001 y 00003 sin 00002) y pasa a DERIVADA del máximo
      existente (regla v964). El folio de OCs del proyecto igual. Si se borra el último,
      el número se reusa y la secuencia no salta.
   2. ELIMINAR pedidos: gate duro users.manage también en deletePedido (las OCs ya lo
      tenían desde v949; el ✕ ya era solo-admin — esto es defensa de frontera).
   3. Dirección de OFICINAS actualizada (19 AVENIDA B, 0-03 VISTA HERMOSA 2, ZONA 15 ·
      SUSANA MONROY 4707 - 9414) en seeds + self-heal para proyectos existentes (solo
      si aún tienen la dirección vieja — no pisa ediciones manuales). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. numeración derivada ──
const zNum = ex('window.nextPedidoCode = function');
let fN = null;
try { fN = new Function('return (' + zNum.slice(zNum.indexOf('function')) + ')')(); } catch(e){}
if (fN) {
  const mk = pedidos => ({ name:'VICINIA LAS AMÉRICAS', materiales:{ pedidoCounter: 7, pedidos } });
  ok('deriva del máximo existente (ignora el contador)', fN(mk([{numero:'VICINIA LAS AMÉRICAS – 00001'},{numero:'VICINIA LAS AMÉRICAS – 00003'}])) === 'VICINIA LAS AMÉRICAS – 00004');
  ok('si se borra el 00003, el siguiente ES el 00002 (sin saltos)', fN(mk([{numero:'VICINIA LAS AMÉRICAS – 00001'}])) === 'VICINIA LAS AMÉRICAS – 00002');
  ok('proyecto sin pedidos arranca en 00001', fN(mk([])) === 'VICINIA LAS AMÉRICAS – 00001');
} else ok('nextPedidoCode evaluable', false);
ok('el folio de OC del proyecto también se deriva', /_folioProj/.test(html) && /Math\.max\(0, \.\.\.\(\(p\.materiales\.ordenes \|\| \[\]\)\.map\(o => Number\(o\.folio\) \|\| 0\)\)/.test(html));

// ── 2. gate duro de eliminar pedidos ──
ok('deletePedido exige users.manage', /SOLO EL ADMIN PUEDE ELIMINAR PEDIDOS/.test(ex('function deletePedido(')));

// ── 3. dirección de oficinas ──
ok('dirección nueva en los seeds (4 sitios)', (html.match(/19 AVENIDA B, 0-03 VISTA HERMOSA 2, ZONA 15/g) || []).length >= 5 && (html.match(/SUSANA MONROY/g) || []).length >= 5);
// v983: matcher amplio — CUALQUIER dirección que contenga la vieja se reescribe (la entrada
// viva "OFICINAS PUNTO ROJO" tenía id propio y el exact-match de v978 no la tocaba)
ok('la dirección vieja solo queda en el self-heal (matcher + comentario)', (html.match(/4TA AVENIDA 20-51/g) || []).length <= 3 && /4TA AVENIDA 20-51\/i\.test/.test(html) && !/SERGIO HERNÁNDEZ/.test(html));

// ── 4. impresión de la SOLICITUD: solo SOLICITANTE + compartir como imagen ──
const iSol = html.indexOf('FORMATO DE SOLICITUD');
const zSol = html.slice(iSol - 7000, iSol + 9000);
ok('la solicitud ya NO lleva RECIBIDO POR (es solo una solicitud)', !/RECIBIDO POR/.test(zSol) && /SOLICITANTE<br>/.test(zSol));
// v980: el compartir se movió A LA APP (en Android la ventana de impresión no tiene share)
ok('botón COMPARTIR IMAGEN en el detalle del pedido (app)', /compartirSolicitudImg\(\)"/.test(html));
ok('comparte con la escalera de asistencia y html2canvas', /_imgCompartir/.test(html) && /html2canvas/.test(html));
ok('fallback desktop: descarga el PNG', /IMAGEN DESCARGADA/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
