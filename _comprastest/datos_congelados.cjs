/* FASE 1 · T1 — CONGELADOR DE DATOS (regla de Antonio, dicha TRES veces: "no me toques la
   información actual, no se borra nada").

   Este test pasa en VERDE ANTES de empezar la Fase 1 y se corre después de CADA paso: si un
   find-replace descuidado de "BODEGA CENTRAL" toca un literal de DATOS (la serie de pedidos,
   el proveedor _bodega, las OCs históricas, las claves de localStorage), acá revienta.
   Los strings de UI (menú, títulos, toasts) SÍ pueden cambiar a COMPRAS — esos no están acá. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— la serie de pedidos de abastecimiento —');
/* la numeración es DERIVADA del texto 'BODEGA – N' (v964): cambiarlo rompe el correlativo */
ok("los pedidos siguen naciendo 'BODEGA – N'", (html.match(/'BODEGA – '/g) || []).length >= 2);
ok('el parser del correlativo sigue leyendo ese guión', /–\\s\*\(\\d\+\)|–\\s\*\(\\d\+\)/.test(ex('function _bodegaNextNum(')) || /BODEGA/.test(ex('function _bodegaNextNum(')));

console.log('\n— el proveedor interno y las OCs históricas —');
ok("el despacho sigue siendo el proveedor { id: '_bodega' }", /id: '_bodega', nombre: 'BODEGA CENTRAL'/.test(html));
ok("el pedido de abastecimiento sigue con apto: 'BODEGA CENTRAL'", /apto: 'BODEGA CENTRAL'/.test(html));
/* las OCs viejas guardaron oc.proyecto='BODEGA CENTRAL'; _ocProyectoLabel las reconoce por
   ese texto — si el reconocedor cambia, el historial se re-etiqueta mal */
ok('el reconocedor histórico de OCs de bodega sigue', /BODEGA CENTRAL/.test(ex('function _ocProyectoLabel(')));

console.log('\n— la clave del permiso —');
/* menu.bodega está GUARDADA en los arrays perms de los usuarios en Firestore: cambiar la
   CLAVE les quitaría el acceso a todos. Solo el label puede cambiar. */
ok("la clave sigue siendo 'menu.bodega'", /key: 'menu\.bodega'/.test(html));
ok('y las funciones de permiso la siguen leyendo', /can\('menu\.bodega'\)/.test(ex('function _puedeVerBodega(')));

console.log('\n— las claves de localStorage (preferencias ya guardadas) —');
ok('bodega_historial_visible', /bodega_historial_visible/.test(html));
ok('oc_historial_visible_', /oc_historial_visible_/.test(html));
ok('pedidos_historial_visible_', /pedidos_historial_visible_/.test(html));

console.log('\n— el almacén físico se sigue llamando bodega —');
/* ABASTECER BODEGA CENTRAL nombra el ALMACÉN, no la ubicación del menú */
ok('el modal de abastecimiento conserva su nombre', /ABASTECER BODEGA CENTRAL/.test(html));
ok('los contenedores de datos no se renombraron', /state\.bodegaMat/.test(html) && /bodegaMovs/.test(html));
ok('el id del panel tampoco (10 sitios de repintado lo citan)', (html.match(/_bodegaPanelModal/g) || []).length >= 10);
ok('ni la función de abrir (repintados + entradas)', (html.match(/_abrirPanelBodega\(\)/g) || []).length >= 8);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
