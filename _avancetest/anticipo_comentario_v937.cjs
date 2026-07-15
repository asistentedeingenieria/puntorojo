/* v937 (pedido de Antonio con print de SOLICITUDES DE ANTICIPO): compras puede dejar
   un COMENTARIO en una solicitud (p. ej. "no existe / no está el producto") y le llega
   NOTIFICACIÓN a quien pidió (campanita + push vía _antSolicNotif, ambos sistemas) y a
   gerencia. El comentario queda visible en la tarjeta. La mutación sella s._ts (regla
   v891 — solicitudesAnticipo va por union merge id+_ts). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
function extractAssign(sig){ let m=html.indexOf(sig); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. modal COMENTAR (compras o gerente) ──
const srcAbrir = extractAssign('window._antAbrirComentar = function');
ok('_antAbrirComentar existe', !!srcAbrir);
ok('gate: compras (anticipos.cotizar) o gerente', /anticipos\.cotizar/.test(srcAbrir) && /_antEsGerente\(\)/.test(srcAbrir));
ok('usa el modal estándar del módulo', /_antModalWrap\(/.test(srcAbrir));
ok('campo de texto del comentario', /antComTexto/.test(srcAbrir));

// ── 2. guardar el comentario + notificar ──
const srcCom = extractAssign('window.comentarSolicitudAnticipo = function');
ok('comentarSolicitudAnticipo existe', !!srcCom);
ok('guarda {ts, por, cuando, texto} en s.comentarios', /comentarios/.test(srcCom) && /texto/.test(srcCom) && /por:/.test(srcCom) && /cuando:/.test(srcCom));
ok('sella s._ts (union merge id+_ts, regla v891)', /_ts = Date\.now\(\)/.test(srcCom));
ok('notifica a quien PIDIÓ (email) y a gerencia', /_antSolicNotif\(/.test(srcCom) && /solicitadoPor\]/.test(srcCom) && /planilla\.authorize/.test(srcCom));
ok('guarda + sube + re-render (patrón del módulo)', /_antSolicSave\(\)/.test(srcCom));
ok('comentario vacío no pasa', /COMENTARIO|ESCRIB/.test(srcCom));

// ── 3. la tarjeta muestra los comentarios + botón ──
const srcRender = extractFn('_antSolicRender');
ok('los comentarios se ven en la tarjeta', /s\.comentarios/.test(srcRender));
ok('botón COMENTAR en la tarjeta (gate compras/gerente)', /_antAbrirComentar\(/.test(srcRender) && /COMENTAR</.test(srcRender));
ok('el botón sale en los estados activos', /pendiente_cotizacion'\|\|s\.estado==='pendiente_autorizacion'\|\|s\.estado==='autorizada'/.test(srcRender.replace(/\s+/g,'')) || /estado!=='cancelada'/.test(srcRender));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
