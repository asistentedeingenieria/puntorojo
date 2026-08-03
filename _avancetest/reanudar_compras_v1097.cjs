/* v1097 — COMPRAS PUEDE REANUDAR LAS SOLICITUDES PAUSADAS (Antonio, 31-jul):
   "a la persona de compras que sube las cotizaciones ponele la opción de poder reanudar los
   pedidos que están pausados, para que ella pueda continuar cuando ya exista el producto".

   v976 metió el flag s.pausada con un solo gate para las dos acciones: anticipos.pausar (o
   admin). Pero quien SABE que el producto ya llegó es Compras — es quien cotiza, quien habla
   con el proveedor y quien deja los comentarios de "no hay existencias" en las tarjetas. Hoy
   tiene que pedirle a Antonio que reanude, y eso frena el circuito.

   REANUDAR se abre a anticipos.cotizar. PAUSAR *no* se toca: pausar es una decisión de
   gerencia (congela el pedido de una persona), reanudar es operativo (el producto ya está).
   Son dos permisos distintos a propósito, no un descuido. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 0. los permisos siguen siendo dos cosas distintas —');
ok('existe anticipos.cotizar (Compras)', /key: 'anticipos\.cotizar'/.test(html));
ok('existe anticipos.pausar', /key: 'anticipos\.pausar'/.test(html));

console.log('\n— 1. REANUDAR: lo puede hacer Compras —');
const zR = ex('window.reanudarSolicitudAnticipo = async function(');
ok('reanudarSolicitudAnticipo existe', zR.length > 100);
ok('acepta a quien cotiza', /anticipos\.cotizar/.test(zR));
ok('sigue aceptando a quien pausa y al admin', /anticipos\.pausar/.test(zR) && /_antEsAdmin\(\)/.test(zR));

console.log('\n— 2. PAUSAR no se amplió (sigue siendo decisión de gerencia) —');
const zP = ex('window.pausarSolicitudAnticipo = async function(');
ok('pausarSolicitudAnticipo existe', zP.length > 100);
ok('NO acepta a quien solo cotiza', !/anticipos\.cotizar/.test(zP));
ok('sigue exigiendo anticipos.pausar o admin', /anticipos\.pausar/.test(zP) && /_antEsAdmin\(\)/.test(zP));

console.log('\n— 3. el botón se le muestra a Compras —');
ok('hay una condición propia para reanudar (no reusa la de pausar)', /puedeReanudar/.test(html));
ok('puedeReanudar incluye a quien cotiza', /puedeReanudar\s*=[^;]*anticipos\.cotizar/.test(html));
ok('el botón REANUDAR usa puedeReanudar', /s\.pausada && puedeReanudar/.test(html));
ok('el botón PAUSAR sigue usando puedePausar', /puedePausar/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
