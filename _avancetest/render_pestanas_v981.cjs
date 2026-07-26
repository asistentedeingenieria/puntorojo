/* v981 BUG (Antonio 26-jul): crear un pedido (o generar OC) y entrar a LISTA DE PEDIDOS
   mostraba la lista VIEJA (o vacía) hasta salir de la pestaña y volver.
   Causa raíz: setPedidoTab('lista') solo alternaba display — el caso 'nuevo' sí
   renderizaba su form, pero 'lista' mostraba el DOM viejo; el pedido nuevo nace en un
   modal (PEDIR DE RECETA) que no refresca ese panel. setMatTab sí renderiza al entrar
   (por eso salir y volver "lo arreglaba").
   Fix: 'lista' renderiza SIEMPRE al entrar + pedirEtapaCompleta refresca la lista al
   crear (cinturón). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zTab = ex('function setPedidoTab(');
ok("setPedidoTab('lista') renderiza la lista al entrar", /tab === 'lista'[\s\S]{0,80}renderPedidosList\(\)/.test(zTab));
ok("el caso 'nuevo' sigue renderizando su form", /tab === 'nuevo'[\s\S]{0,80}renderPedidoForm\(\)/.test(zTab));
ok('pedirEtapaCompleta refresca la lista al crear (cinturón)', /renderPedidosList/.test(ex('async function pedirEtapaCompleta(')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
