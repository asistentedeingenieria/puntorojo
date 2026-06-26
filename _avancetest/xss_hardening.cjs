/* v849: XSS hardening. Campos de texto controlados por usuario (colaboradores, observaciones de
   pedidos, razón de solicitudes, excepción, receptor) deben renderizarse escapados (esc()/escPag())
   antes de entrar a innerHTML. Test estructural (asegura el wrap) + funcional (el esc global
   neutraliza un payload). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0;
const ok = (n, c) => c ? pass++ : (fail++, console.log('FAIL ' + n));
const count = (needle) => html.split(needle).length - 1;

// ── A) Listado de colaboradores (personal.edit escribe, admin ve) ──
ok('colab nombre escapado',   html.indexOf('esc(c.nombre||') >= 0);
ok('colab empresa escapado',  html.indexOf('esc(c.empresa)') >= 0);
ok('colab cargo escapado',    html.indexOf('esc(c.cargo') >= 0);
ok('colab dpi escapado',      html.indexOf('esc(c.dpi') >= 0);
ok('colab telefono escapado', html.indexOf('esc(c.telefono') >= 0);
ok('colab nombre crudo eliminado', html.indexOf('>${c.nombre||\'\'}') < 0);

// ── B) Observaciones / orden de cambio de pedidos (3 renders + print) ──
ok('observaciones escapado (>=3 sitios)', count('esc(pd.observaciones)') >= 3);
ok('ordenCambio escapado (>=2 sitios)',   count('esc(pd.ordenCambio)') >= 2);
ok('observaciones crudo eliminado', html.indexOf('"${pd.observaciones}"') < 0);

// ── C) Razón de solicitud de eliminar foto (texto, no solo el title) ──
ok('razonShort escapado (>=2 tablas)', count('esc(razonShort)') >= 2);
ok('razonShort crudo eliminado', html.indexOf('>${razonShort}</td>') < 0);

// ── D) Modal de aprobar excepción ──
ok('exc.obrero escapado',              html.indexOf('esc(exc.obrero') >= 0);
ok('exc.notaDecision escapado',        html.indexOf('esc(exc.notaDecision)') >= 0);
ok('exc.decididoPorNombre escapado',   html.indexOf('esc(exc.decididoPorNombre') >= 0);
ok('exc.solicitadoPorNombre escapado', html.indexOf('esc(exc.solicitadoPorNombre') >= 0);

// ── E) Receptor QR ──
ok('receptor nombre escapado',   html.indexOf('esc(r.nombre)') >= 0);
ok('receptor cargo escapado',    html.indexOf('esc(r.cargo') >= 0);
ok('receptor contacto escapado', html.indexOf('esc(r.contacto)') >= 0);

// ── Funcional: el esc global neutraliza un payload de texto ──
function extractAt(startIdx){ let i=html.indexOf('{',startIdx),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(startIdx,i+1); } } return ''; }
const escSrc = extractAt(html.indexOf('function esc(s)'));
ok('esc global existe', !!escSrc);
if (escSrc) {
  const escFn = new Function(escSrc + '\nreturn esc;')();
  const payload = '<img src=x onerror=alert(1)>';
  const out = escFn(payload);
  ok('esc neutraliza < del payload', out.indexOf('<') < 0);
  ok('esc neutraliza > del payload', out.indexOf('>') < 0);
  ok('esc preserva texto legible', out.indexOf('img src') >= 0);
}

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
