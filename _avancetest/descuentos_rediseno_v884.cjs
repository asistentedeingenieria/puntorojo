/* v884: rediseño del bloque DESCUENTOS de la tarjeta de liquidación (diseño aprobado por el user):
   agrupado por PERSONA con subtotal, chips PÓLIZA/ANTICIPO en columna fija, montos alineados en
   columna fija a la derecha, ✕ compacta (sin la palabra QUITAR) solo en los quitables, y el texto
   verde largo reemplazado por un "?" con tooltip. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

ok('filas en grilla de 3 columnas fijas', html.indexOf('grid-template-columns:62px 1fr 90px') >= 0);
ok('chip PÓLIZA morado', /background:#F3E8FF;color:#6B21A8[^>]*>PÓLIZA</.test(html));
ok('chip ANTICIPO azul', /background:#DBEAFE;color:#1E40AF[^>]*>ANTICIPO</.test(html));
ok('agrupa por persona con subtotal', html.indexOf('_grupos[k] = _grupos[k] || []') >= 0);
ok('✕ sola (sin palabra QUITAR) con el handler vivo', /eliminarDescuentoPlanilla[^>]*>✕<\/button>/.test(html) || /title="Quitar este descuento esta quincena"[^>]*>✕<\/button>/.test(html));
ok('ya no existe el botón QUITAR viejo', html.indexOf('title="Quitar este anticipo"') < 0);
ok('el texto verde largo se fue (queda tooltip ?)', html.indexOf('Sistema aplicó automáticamente. Las <strong>pólizas</strong>') < 0);
ok('tooltip de ayuda presente', html.indexOf('Las pólizas son obligatorias (no se eliminan). Los anticipos los puede quitar') >= 0);
ok('badge OBLIGATORIA viejo fuera de este bloque', html.indexOf('border-radius:3px;letter-spacing:.5px;margin-left:6px">OBLIGATORIA</span>') < 0);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
