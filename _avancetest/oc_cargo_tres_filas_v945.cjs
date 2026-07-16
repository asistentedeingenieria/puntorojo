/* v945 (pedido de Antonio con print del pie de firma): bajo el nombre del revisor,
   TRES filas separadas, centradas y en orden:
     AUTORIZADO POR — DEPTO. DE FINANZAS
     REVISIÓN Y VISTO BUENO
     AUTORIZADO DIGITALMENTE · FECHA · HORA
   (antes: una línea "AUTORIZADO POR — REVISIÓN Y VISTO BUENO" + el selloDigital crudo
   "AUTORIZADO DIGITALMENTE POR NOMBRE · fecha hora" que envolvía feo en 2 líneas).
   La fecha/hora sale de oc.autorizadoTs; OCs legacy sin ts caen al selloDigital crudo. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const src = extractFn('printOrdenCompra');

const i1 = src.indexOf('AUTORIZADO POR — DEPTO. DE FINANZAS');
const i2 = src.indexOf('>REVISIÓN Y VISTO BUENO<');
const i3 = src.indexOf('AUTORIZADO DIGITALMENTE ·');
ok('fila 1: AUTORIZADO POR — DEPTO. DE FINANZAS', i1 > -1);
ok('fila 2: REVISIÓN Y VISTO BUENO (fila propia)', i2 > i1);
ok('fila 3: AUTORIZADO DIGITALMENTE · fecha · hora', i3 > i2);
ok('fecha y hora salen de autorizadoTs', /autorizadoTs[^}]*toLocaleDateString\('es-GT'\)/.test(src.slice(i2)));
ok('legacy sin ts cae al selloDigital crudo', src.indexOf('oc.selloDigital', i2) > -1);
ok('ya no existe la línea combinada vieja', src.indexOf('AUTORIZADO POR — REVISIÓN Y VISTO BUENO') === -1);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
