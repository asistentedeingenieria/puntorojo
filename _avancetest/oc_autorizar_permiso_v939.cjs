/* v939 (reporte de Antonio con foto del toast "SOLO ERLIN KARINA TRIGUEROS O EL ADMIN
   PUEDEN AUTORIZAR OC"): un WRAPPER de v314 re-definía window.autorizarOrden DESPUÉS
   de la función v919 (la última definición gana) y metía un candado por NOMBRE
   (isErlinUser) antes del chequeo de permiso — el revisor con compras.revisar quedaba
   bloqueado y el admin ni lo notaba. Fix: se ELIMINA el wrapper; manda la función v919
   (compras.revisar || users.manage + separación quien-generó-no-autoriza). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. el candado por nombre desapareció ──
ok('ya no existe el toast "SOLO ERLIN..."', html.indexOf('SOLO ERLIN KARINA TRIGUEROS') === -1);
ok('el wrapper v314 se eliminó (_autorizarOrdenBase)', html.indexOf('_autorizarOrdenBase') === -1);
ok('nadie re-define window.autorizarOrden (la v919 manda)', html.indexOf('window.autorizarOrden = ') === -1);

// ── 2. la función v919 sigue intacta ──
const src = extractFn('autorizarOrden');
ok('gate por PERMISO: compras.revisar o admin', /can\('compras\.revisar'\)/.test(src) && /can\('users\.manage'\)/.test(src));
ok('separación: quien generó NO autoriza la suya (admin exento)', /generadoPorUsername/.test(src));
ok('ofrece registrar la firma si falta (v926/v934)', /_pedirFirmaSiFalta\(\)/.test(src));
ok('estampa el sello digital al autorizar', /selloDigital/.test(src));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
