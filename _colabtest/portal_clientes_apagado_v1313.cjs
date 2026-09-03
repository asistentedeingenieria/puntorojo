/* v1313 (Antonio, 28-ago): "todo lo de clientes y reportes de clientes — ocultar y apagar
   SIN borrar datos; ya no quiero reportes automáticos". El mapa (wf_cfedcb58) separó dos
   mundos: (1) el PORTAL DE CLIENTES (clientes.html, invitaciones, mensajes, firmas desde el
   portal, CF pública getReceptorAcuses, reporte semanal AUTOMÁTICO viejo v148) — muerto de
   facto, se APAGA; (2) receptores de obra + QR + acuses de recepción — corazón interno de
   entrega/pago, se CONSERVA. El reporte semanal MANUAL v1108 (el de Antonio) se conserva.
   Un solo interruptor PORTAL_CLIENTES_ACTIVO=false; reactivar = true. Cero borrado. */
const fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = R('index.html'), cli = R('clientes.html'), bienv = R('bienvenida.html'), sw = R('sw.js'), fn = R('functions/index.js');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* 1) el interruptor y la clase raíz */
ok('interruptor apagado', /const PORTAL_CLIENTES_ACTIVO = false;/.test(html));
ok('clase raíz portal-off cuando está apagado', /if \(!PORTAL_CLIENTES_ACTIVO\) document\.documentElement\.classList\.add\('portal-off'\)/.test(html));
ok('CSS oculta las zonas del portal', html.includes('.portal-off .portal-cliente{display:none!important}'));

/* 2) zonas de UI del portal marcadas (y las internas NO) */
ok('MIS ACUSES FIRMADOS (CF pública) oculto', /id="rqrAcusesSection" class="portal-cliente"/.test(html));
ok('pestaña MENSAJES DEL CLIENTE oculta', /id="cliTabMsg" class="portal-cliente"/.test(html));
ok('panel de mensajes oculto', /id="cliPaneMsg" class="portal-cliente"/.test(html));
ok('sección PORTAL CLIENTE del receptor oculta', /<div class="portal-cliente" style="border-top:2px solid var\(--line\);margin-top:18px;padding-top:14px">/.test(html));
ok('RECEPTORES DE OBRA sigue visible', /id="cliTabRec"(?![^>]*portal-cliente)/.test(html) && html.includes('id="cliPaneRec">'));
ok('el REPORTE SEMANAL manual (v1108) sigue', html.includes('window._repAbrir()') && !/portal-cliente[^>]*_repAbrir|_repAbrir[^>]*portal-cliente/.test(html));

/* 3) procesos automáticos apagados por el interruptor */
ok('auto-reporte semanal viejo apagado', /if \(PORTAL_CLIENTES_ACTIVO\) \{ try \{ _startAutoReporteTimer\(\);/.test(html));
ok('polling de mensajes apagado', /if \(PORTAL_CLIENTES_ACTIVO\) \{ try \{ _startInboxPolling\(\);/.test(html));
ok('firmas del portal apagadas (arranque + timer)', /if \(PORTAL_CLIENTES_ACTIVO\) \{[\s\S]{0,400}processPendingAcuseSignatures\(\)[\s\S]{0,300}_pendingSigsTimer/.test(html));
ok('sync de registros del portal apagado (post-login)', /if \(PORTAL_CLIENTES_ACTIVO\) setTimeout\(\(\) => \{ try \{ syncClientRegistrations\(\)/.test(html));
ok('sync de registros apagado (al abrir receptores)', /if\(PORTAL_CLIENTES_ACTIVO\) setTimeout\(function\(\)\{ try\{ syncClientRegistrations\(\)/.test(html));
ok('_fetchReceptorAcuses no llama la CF', /window\._fetchReceptorAcuses = async function\(\)\{\s*\n\s*if \(!PORTAL_CLIENTES_ACTIVO\) return;/.test(html));

/* 4) el portal público redirige a la app (sin borrar los archivos) */
ok('clientes.html redirige', /<head>\s*<script>[^<]*location\.replace\('https:\/\/puntorojo\.app\/'\)/.test(cli));
ok('bienvenida.html redirige', /<head>\s*<script>[^<]*location\.replace\('https:\/\/puntorojo\.app\/'\)/.test(bienv));
ok('sw.js ya no precachea el portal', !sw.includes("'./clientes.html'") && !sw.includes("'./bienvenida.html'"));

/* 5) la función pública queda apagada (410) sin borrar código */
ok('functions: interruptor', /const PORTAL_CLIENTES_ACTIVO = false;/.test(fn));
ok('getReceptorAcuses responde 410 desactivado', /getReceptorAcuses[\s\S]{0,900}if \(!PORTAL_CLIENTES_ACTIVO\) \{ res\.status\(410\)/.test(fn));

/* 6) nada de datos: ninguna orden de borrado nueva */
ok('sin borrado de colecciones', !/collection\('clientRegistrations'\)[\s\S]{0,80}\.delete\(\)/.test(html.slice(html.indexOf('v1313'))));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
