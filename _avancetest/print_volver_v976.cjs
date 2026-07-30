/* v976 (pedido de Antonio 26-jul): al dar IMPRIMIR / GUARDAR PDF no había manera de
   regresar a la app (la ventana de impresión queda sin botón de vuelta en el celular).
   Las DOS vistas de impresión (orden de compra y solicitud de pedido) llevan un botón
   ← VOLVER A LA APP: window.close() con fallback a history.back() (cubre PWA/WebView
   donde la "ventana nueva" en realidad navega en el mismo view). El botón es .no-print
   (no sale en el papel/PDF). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── orden de compra ──
const iOc = html.indexOf('<title>Orden de Compra No.');
ok('doc de OC existe', iOc > 0);
const zOc = html.slice(iOc, iOc + 16000);
ok('OC: botón VOLVER A LA APP', /VOLVER A LA APP/.test(zOc));
/* v1053: history.back() era un no-op (la ventana nace de window.open('') sin historial) y el
   rescate viejo dependía de window.closed, que Android reporta mal. El VOLVER vive ahora en
   _docVolverOnclick: close + navegar al origen a los 350ms si sigue viva. */
ok('OC: cierra la ventana con fallback a history.back()', /\$\{_docVolverOnclick\(\)\}/.test(zOc));
ok('OC: el volver también sale en BORRADOR (fuera del ternario showDraft)', /no-print"[^>]*>\s*<button[^>]*onclick="\$\{_docVolverOnclick\(\)\}/.test(zOc.replace(/\n/g,' ')));
ok('OC: IMPRIMIR sigue solo cuando NO es borrador', /\$\{!showDraft \? '<button[^']*window\.print\(\)/.test(zOc));

// ── solicitud de pedido ──
const iSol = html.indexOf('FORMATO DE SOLICITUD');
ok('doc de solicitud existe', iSol > 0);
const zSol = html.slice(iSol - 5000, iSol + 1200);
ok('SOLICITUD: botón VOLVER A LA APP', /VOLVER A LA APP/.test(zSol));
ok('SOLICITUD: cierra con fallback a history.back()', /\$\{_docVolverOnclick\(\)\}/.test(zSol)); // v1053: mecanismo nuevo
ok('SOLICITUD: el botón no sale impreso (.no-print en el @media print del doc)', /\.no-print\{display:none/.test(zSol));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
