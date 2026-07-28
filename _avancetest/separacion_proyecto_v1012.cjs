/* v1012 — NO MEZCLAR PROYECTOS (pedido de Antonio 28-jul).
   "la lista de pedidos quiero que este ordenada cada una en su proyecto NO mezclar, al igual
    que ordenes de compras e inventarios y avance por proyecto."

   LA VERDAD DEL MAPEO: ninguna lista concatena proyectos y el sync no puede mover un pedido
   de obra. Lo que se ve mezclado SE GUARDÓ mezclado. INVENTARIOS y AVANCE POR APARTAMENTO
   están limpios — no se tocan.

   Las causas reales que cierra esta versión:
   1. LA SEGUNDA PUERTA, que seguía abierta: un pedido con OFICINA CENTRAL — ABASTECIMIENTO
      hecho desde el formulario de la obra se guardaba DENTRO de la obra. El desvío de
      contenedor solo existía para PROYECTO PEQUEÑO / REPARACIÓN. Encima no aparecía en
      bodega: al revés de lo que uno espera.
   2. Los pedidos manuales anteriores a v1002 siguen dentro de las obras y salían DOS VECES
      (en la lista de la obra anfitriona Y en PROYECTOS VARIOS).
   3. Los KPIs contaban TODO el contenedor mientras la lista escondía los RECIBIDO en el
      historial: con 3 pedidos y 2 recibidos el número decía 3 y había 1 tarjeta.

   NADA SE BORRA: los pedidos ajenos que ya están guardados se filtran de la vista y se avisa
   dónde están. Antonio fue explícito dos veces: no eliminar información existente. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. el criterio de "este pedido es de esta obra" —');
const zEs = ex('function _pedidoEsDeEstaObra(');
ok('existe el criterio, en un solo lugar', zEs.length > 60);
let fEs = null;
try {
  fEs = new Function('_pedidoEsAbastecimiento', 'return (' + zEs + ')')(
    pd => String((pd && pd.proyectoPedido) || '').indexOf('OFICINA CENTRAL') >= 0
  );
} catch(e){ console.log('   (no evaluable: ' + e.message + ')'); }
if (fEs) {
  const OBRA = { id: 'p1', name: 'Vicinia Las Américas' };
  ok('el pedido normal de la obra entra', fEs({ proyectoPedido: 'VICINIA LAS AMÉRICAS' }, OBRA) === true);
  ok('sin marca de proyecto también entra (pedidos viejos)', fEs({ }, OBRA) === true);
  ok('el manual de TIFFANY NO entra', fEs({ proyectoPedido: 'TIFFANY' }, OBRA) === false);
  ok('el de abastecimiento a bodega NO entra', fEs({ proyectoPedido: 'OFICINA CENTRAL — ABASTECIMIENTO' }, OBRA) === false);
  ok('no se confunde por mayúsculas ni espacios', fEs({ proyectoPedido: '  vicinia las américas ' }, OBRA) === true);
  ok('aguanta un pedido nulo', fEs(null, OBRA) === false);
  ok('sin obra activa no revienta', fEs({ proyectoPedido: 'X' }, null) === false);
} else {
  ['normal','sin marca','tiffany','bodega','mayúsculas','nulo','sin obra'].forEach(n => ok(n + ' (evaluable)', false));
}

const zSubmit = ex('function submitPedido(');
console.log('\n— 1b. RENOMBRAR LA OBRA NO PUEDE ESCONDER SUS PEDIDOS —');
/* Hallazgo crítico de la revisión: comparar por NOMBRE congelaba la identidad. Si el admin
   corregía el nombre de la obra (una tilde, un guión, agregar "TORRE B"), TODOS sus pedidos
   salían de la lista, sus órdenes también, y el aviso mandaba a buscarlos a PROYECTOS VARIOS
   donde no están. La identidad va por ID; el nombre queda solo para los pedidos legacy. */
ok('el pedido guarda el id de su obra', /proyectoId: p\.id/.test(zSubmit));
if (fEs) {
  const OBRA = { id: 'p1', name: 'Vicinia Las Américas' };
  ok('con id propio, el nombre viejo ya no importa',
     fEs({ proyectoId: 'p1', proyectoPedido: 'VICINIA LAS AMERICAS SIN TILDE' }, OBRA) === true);
  ok('y un pedido de OTRA obra con id sigue afuera',
     fEs({ proyectoId: 'p9', proyectoPedido: 'VICINIA LAS AMÉRICAS' }, OBRA) === false);
  ok('el legacy sin id sigue cayendo al nombre', fEs({ proyectoPedido: 'VICINIA LAS AMÉRICAS' }, OBRA) === true);
}
ok('al renombrar la obra se re-estampan sus pedidos', /function _reestamparPedidosProyecto\(/.test(html));
const zRe = ex('function _reestamparPedidosProyecto(');
ok('sella _ts (union-merge v972: sin sello el cambio se pierde)', /_ts = Date\.now\(\)/.test(zRe));
ok('no toca los MANUAL ni los de OFICINA', /proyectoManual/.test(zRe) && /_pedidoEsAbastecimiento|OFICINA/.test(zRe));
ok('saveProjectSpecs lo llama', /_reestamparPedidosProyecto\(/.test(ex('function saveProjectSpecs(')));

console.log('\n— 2. la lista y los números miran lo mismo —');
const zLista = ex('function renderPedidosList(');
ok('la lista filtra por obra', /_pedidoEsDeEstaObra\(/.test(zLista));
ok('los KPIs cuentan sobre lo filtrado', zLista.indexOf('_pedidoEsDeEstaObra') < zLista.indexOf('pedKpis'));
/* el KPI decía "3 · ESTE PROYECTO" con 1 tarjeta en pantalla porque contaba los recibidos
   que el historial esconde; ahora el total dice cuántos están a la vista */
ok('el total distingue lo activo de lo archivado', /activos|_act\.length/.test(zLista.slice(zLista.indexOf('pedKpis') - 700, zLista.indexOf('pedKpis') + 900)));
ok('avisa cuando hay pedidos guardados que no son de la obra', /_ajenos/.test(zLista));
/* Segundo crítico: el early return del estado vacío estaba ANTES del aviso, así que con TODOS
   los pedidos filtrados la pantalla decía "No hay pedidos registrados todavía" y cero pistas. */
ok('el aviso se pinta aunque no quede ni un pedido a la vista',
   zLista.indexOf('_ajenos') < zLista.indexOf('No hay pedidos registrados'));
/* y el aviso no puede mentir: un pedido de la obra que quedó fuera por otra razón NO está en
   PROYECTOS VARIOS ni en BODEGA CENTRAL */
ok('el aviso no promete una vista donde el pedido no está', !/se ven en <b>PROYECTOS VARIOS<\/b> o <b>BODEGA CENTRAL<\/b>, según corresponda/.test(zLista));
ok('el KPI de MATERIALES cuenta lo mismo que la lista', /_pedidoEsDeEstaObra/.test(ex('function renderMateriales(')));

console.log('\n— 3. la segunda puerta queda cerrada —');
ok('el pedido de OFICINA ya no se guarda en la obra', /proyectoTipo === 'OFICINA'/.test(zSubmit));
ok('se guarda en el contenedor de bodega', /_bodegaMatStore\(\)\.pedidos\.push/.test(zSubmit));
ok('y se numera con la serie de bodega', /BODEGA – /.test(zSubmit) && /_bodegaNextNum\(/.test(zSubmit));
ok('el de PROYECTO PEQUEÑO sigue yendo a varios', /_variosMatStore\(\)\.pedidos\.push/.test(zSubmit));
ok('el de la obra sigue igual', /p\.materiales\.pedidos\.push/.test(zSubmit));
/* el contador legacy del proyecto no debe avanzar por un pedido que no se guardó ahí */
ok('no consume el correlativo de la obra si se desvía', /pedidoCounter/.test(zSubmit));

console.log('\n— 4. las órdenes de compra, igual —');
const zOrd = ex('function renderOrdenesList(');
ok('la lista de OCs filtra por obra', /_ocEsDeEstaObra\(|_pedidoEsDeEstaObra\(/.test(zOrd));

console.log('\n— 4b. BODEGA DE LA OBRA como destino del pedido —');
/* Antonio, señalando el desplegable TORRE/NIVEL: "necesito aqui poder cargar a bodega del
   proyecto el pedido". Es para consumibles (agua, limpieza) que no son de ningún nivel. */
ok('el centinela no lleva "|" (lo parte updateAptoSelect)', /const PF_NIVEL_BODEGA = '__BODEGA_OBRA__'/.test(html));
ok('ni caracteres raros (va dentro de un selector CSS)', /^[A-Z_]+$/.test('__BODEGA_OBRA__'.replace(/^_+|_+$/g, '') || 'X'));
const zForm = ex('function renderPedidoForm(');
ok('la opción está en el desplegable', /PF_NIVEL_BODEGA}">\$\{PF_NIVEL_BODEGA_LBL/.test(zForm));
ok('va arriba de los niveles', zForm.indexOf('PF_NIVEL_BODEGA') < zForm.indexOf('niveles.map'));
const zApto = ex('function updateAptoSelect(');
ok('el apto se limpia y dice NO APLICA', /PF_NIVEL_BODEGA/.test(zApto) && /NO APLICA/.test(zApto));
/* la trampa: sin rama propia, el value desconocido caía en el find, no lo hallaba y hacía
   return DEJANDO pegado el apto anterior — el pedido salía "BODEGA DE LA OBRA · APTO 304" */
ok('y se limpia ANTES del find que hacía return', zApto.indexOf('PF_NIVEL_BODEGA') < zApto.indexOf('p.towers.find'));
ok('el pedido guarda el destino como FLAG, no como texto', /destinoBodega: _destinoBodegaObra/.test(zSubmit));
ok('el flag sale del value, no de parsear el rótulo', /_destinoBodegaObra = \(nivelVal === PF_NIVEL_BODEGA\)/.test(zSubmit));
/* solo NUEVO PEDIDO: un pedido de receta sin recetaLevelId rompe cobertura, candado y avance */
ok('PEDIR DE RECETA no lo ofrece', !/PF_NIVEL_BODEGA/.test(ex('function renderRecetaV2(')));

console.log('\n— 5. lo que NO se toca —');
ok('no se borra ningún pedido', !/pedidos\.splice|delete .*pedidos\[/.test(zLista));
ok('INVENTARIOS sigue como estaba', !/_pedidoEsDeEstaObra/.test(ex('function renderInventarios(')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
