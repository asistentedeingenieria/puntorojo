/* v864: FIX visual de GERENCIA en móvil. renderGerencia reusaba .colab-name/.colab-obra: el lado
   derecho (.colab-obra) es flex:0 0 auto (NO se encoge) y en GERENCIA lleva una cadena larga
   (CARGO · EMPRESA · DPI · TEL) → acaparaba el ancho y dejaba el nombre en ~0; con
   overflow-wrap:anywhere el nombre se partía LETRA POR LETRA (texto vertical).
   Fix: layout apilado propio (.ger-row columna, .ger-name/.ger-sub) con word-break:normal. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── markup: renderGerencia usa el layout apilado, NO las clases que colapsan el nombre ──
const src = extractFn('renderGerencia');
ok('renderGerencia existe', !!src);
if (src) {
  ok('render usa fila apilada .ger-row', src.indexOf('ger-row') >= 0);
  ok('render usa .ger-name y .ger-sub', src.indexOf('ger-name') >= 0 && src.indexOf('ger-sub') >= 0);
  ok('render ya NO usa colab-name (colapsaba a 1 letra)', src.indexOf('colab-name') < 0);
  ok('render ya NO usa colab-obra (flex:0 0 auto acaparaba el ancho)', src.indexOf('colab-obra') < 0);
  ok('render sigue abriendo el modal con onclick', src.indexOf('_gerenciaModal(') >= 0);
}

// ── CSS: .ger-row apila; .ger-name NO parte a mitad de palabra ──
ok('.ger-row existe y apila en columna', /\.ger-row\{[^}]*flex-direction:\s*column/.test(html));
ok('.ger-name usa word-break:normal', /\.ger-name\{[^}]*word-break:\s*normal/.test(html));
ok('.ger-name NO usa overflow-wrap:anywhere (eso parte letra por letra)', !/\.ger-name\{[^}]*overflow-wrap:\s*anywhere/.test(html));
ok('.ger-sub existe (detalle muted)', /\.ger-sub\{/.test(html));

// ── header del panel: una sola etiqueta coherente con el apilado ──
ok('header del panel es una etiqueta única', html.indexOf('<div class="colab-headbar"><span>NOMBRE / CARGO</span></div>') >= 0);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
