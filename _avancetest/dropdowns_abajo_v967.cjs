/* v967 (pedido de Antonio 23-jul): TODOS los listados desplegables abren HACIA ABAJO con
   scroll interno — nada de popups nativos que abren hacia arriba y tapan la pantalla.
   - Los <select> nativos se interceptan en DESKTOP (hover+pointer fine) y abren el picker
     v925 anclado al select (siempre debajo, max 280px, con buscador). En touch queda el
     nativo de Android (ya es lista deslizable). Escape: data-nativo.
   - _abrirPicker SIEMPRE abre hacia abajo, recortando su alto al espacio disponible. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFrom(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. interceptor global de selects ──
const iInt = html.indexOf('v967: SELECTS SIEMPRE HACIA ABAJO');
ok('interceptor v967 existe', iInt > -1);
const zInt = html.slice(iInt, iInt + 3000);
ok('captura mousedown de cualquier select', /addEventListener\('mousedown'/.test(zInt) && /closest\('select'\)/.test(zInt.replace(/"/g, "'")));
ok('solo DESKTOP (touch conserva el nativo de Android)', /hover: hover/.test(zInt) && /pointer: fine/.test(zInt));
ok('escape data-nativo', /data-nativo/.test(zInt));
ok('abre el picker v925 anclado', /_abrirPicker\(/.test(zInt));
ok('al elegir setea value y dispara change (inline onchange sigue vivo)', /\.value = /.test(zInt) && /dispatchEvent/.test(zInt) && /'change'/.test(zInt.replace(/"/g, "'")));
ok('ignora multiple/size/disabled', /multiple/.test(zInt) && /disabled/.test(zInt));

// ── 2. _abrirPicker SIEMPRE hacia abajo con alto recortado al espacio ──
const zPk = extractFrom('function _abrirPicker(');
ok('el picker ya no se voltea hacia arriba', !/style\.bottom =/.test(zPk));
ok('alto recortado al espacio disponible (scroll interno)', /maxHeight/.test(zPk) && /innerHeight/.test(zPk));
ok('mantiene el tope compacto 280px', /max-height:280px/.test(zPk));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
