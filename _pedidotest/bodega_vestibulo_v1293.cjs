/* v1293 · FASE A del rediseño APROBADO de BODEGA CENTRAL (Antonio, 27-ago: eligió el
   patrón "VESTÍBULO" del muestrario — "una cosa a la vez, nada abruma"):
   Al entrar, en vez del scroll infinito de 7 secciones, un HUB sereno: buscador grande,
   línea HOY (por recibir · por autorizar · pre-pago · negativos, en palabras) y 5
   filas-frase (EXISTENCIAS / HERRAMIENTAS / ABASTECIMIENTO / TRASIEGOS Y PRE-PAGO /
   MOVIMIENTOS). Tocar una fila muestra SOLO esa sección con ‹ VOLVER A BODEGA.
   CÓMO (cero cambios de datos, regla de la memoria de reorg): las secciones existentes
   de la plantilla de _abrirPanelBodega se envuelven en zonas [data-bzona]; un estado
   window._bodegaVista (sobrevive los ~17 repintados cerrar+reabrir) decide qué zona se
   ve; el hub se arma con _bodegaHubHTML() (conteos DERIVADOS de los mismos helpers del
   panel) y se refresca en el gancho v1248 de applyRemote. El buscador del hub delega en
   el filtro real (#_bodegaViewFiltro) para no duplicar lógica. AJUSTES intactos
   (data-aj posicional sobre _bodegaPanelRows — no se re-ordena nada). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* ── 1. el hub ── */
const zHub = ex('function _bodegaHubHTML(');
ok('_bodegaHubHTML existe', zHub.length > 400);
ok('las 5 filas-frase con navegación', ['EXISTENCIAS','HERRAMIENTAS','ABASTECIMIENTO','TRASIEGOS','MOVIMIENTOS'].every(t => zHub.indexOf(t) >= 0) && /_bodegaIrA\(/.test(zHub));
ok('conteos DERIVADOS de los helpers del panel (no contadores nuevos)', /_bodegaSaldos/.test(zHub) && /_herrSaldos/.test(zHub) && /_bodegaOcsPorRecibir/.test(zHub) && /_prepagoSinDespachar/.test(zHub));
ok('línea HOY con lo accionable', /HOY/.test(zHub) && /por recibir|POR RECIBIR/i.test(zHub));
ok('buscador del hub', /_bodegaHubBuscarGo/.test(zHub));

/* ── 2. las zonas en la plantilla ── */
const iPanel = html.indexOf('function _abrirPanelBodega(');
const zPanel = html.slice(iPanel, iPanel + 26000);
ok('hub y VOLVER en la plantilla', /id="_bodegaHub"/.test(zPanel) && /id="_bodegaVolver"/.test(zPanel) && /_bodegaHubHTML\(\)/.test(zPanel));
ok('las 5 zonas marcadas', ['existencias','herr','abasto','tras','movs'].every(z => zPanel.indexOf('data-bzona="' + z + '"') >= 0));
ok('pre-pago y trasiegos comparten la zona tras', /_bodegaPrepagoWrap"[^>]*data-bzona="tras"|data-bzona="tras"[^>]*id="_bodegaPrepagoWrap"/.test(zPanel) && /_trasiegosWrap"[^>]*data-bzona="tras"|data-bzona="tras"[^>]*id="_trasiegosWrap"/.test(zPanel));
ok('la cola del panel aplica la vista (tras _comprasSetTab)', (function(){ const a = zPanel.indexOf('_comprasSetTab(window._comprasTab'); const b = zPanel.indexOf('_bodegaAplicarVista()', a); return a > 0 && b > a; })());
ok('AJUSTES intactos (data-aj posicional sigue)', /data-aj="\$\{i\}"/.test(zPanel) && /_bodegaPanelRows = lista/.test(zPanel));

/* ── 3. el conmutador de vistas, FUNCIONAL ── */
const zAp = ex('function _bodegaAplicarVista(');
ok('_bodegaAplicarVista existe', zAp.length > 200);
if (zAp.length > 200) {
  try {
    const mk = (vista) => {
      const zs = ['existencias','herr','abasto','tras','movs'].map(z => ({ dataset: { bzona: z }, style: {} }));
      const hub = { style: {} }, vol = { style: {} };
      const doc = { getElementById: id => id === '_bodegaPanelModal' ? { querySelectorAll: () => zs } : (id === '_bodegaHub' ? hub : (id === '_bodegaVolver' ? vol : null)) };
      new Function('document', 'window', zAp + '\n_bodegaAplicarVista();')(doc, { _bodegaVista: vista });
      return { zs, hub, vol };
    };
    const enHub = mk('');
    ok('en el hub: todas las zonas ocultas, hub visible, volver oculto', enHub.zs.every(z => z.style.display === 'none') && enHub.hub.style.display !== 'none' && enHub.vol.style.display === 'none');
    const enAb = mk('abasto');
    ok('en una vista: SOLO su zona visible + volver', enAb.zs.filter(z => z.style.display !== 'none').map(z => z.dataset.bzona).join(',') === 'abasto' && enAb.hub.style.display === 'none' && enAb.vol.style.display !== 'none');
  } catch(e){ ok('conmutador evaluable', false); console.log('  ' + e.message); }
}
ok('_bodegaIrA exportado y sube el scroll', /window\._bodegaIrA = function/.test(html) && /scrollTop = 0/.test(html.slice(html.indexOf('window._bodegaIrA'), html.indexOf('window._bodegaIrA') + 500)));

/* ── 4. el buscador del hub delega en el filtro real ── */
const iGo = html.indexOf('window._bodegaHubBuscarGo = function');
const zGo = html.slice(iGo, iGo + 700);
ok('delega en _bodegaViewFiltro + _bodegaViewFiltrar', iGo > 0 && /_bodegaViewFiltro/.test(zGo) && /_bodegaViewFiltrar\(/.test(zGo));

/* ── 5. gancho v1248: el hub se refresca al llegar cambios remotos ── */
const iAR = html.indexOf("_trasiegosWrap');");
const zAR = html.slice(iAR, iAR + 2600);
ok('applyRemote refresca el hub con guard de input enfocado', /_bodegaHub/.test(zAR) && /_bodegaHubHTML\(\)/.test(zAR) && /activeElement/.test(zAR));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
