/* v1036 — PEDIR CANTIDAD PARCIAL DE LA RECETA, CON SALDO.
   Antonio: "cuando se seleccione ELEGIR MATERIALES DEL NIVEL, después deje poder seleccionar
   el material y al mismo tiempo qué cantidad vamos a mandar. NO debe de poder pedir más de lo
   que la receta le permite y se debe de ir registrando. Si pide plancha y selecciona que solo
   quiere 70 y se hace el pedido, después ya debe de solo aparecer la diferencia."

   LO QUE YA EXISTÍA (y por eso esto es chico): desde v909 cada pedido de receta guarda
   `recetaQty` = {claveOriginal: cantidadExacta}, y `_etapaItemsParaPedir` ya resta lo cubierto
   (`qtyFinal -= cob[key].total`). Esa contabilidad estaba artificialmente limitada a los
   pedidos POR APARTAMENTO y a las recepciones parciales. El saldo NO se guarda: se DERIVA de
   los pedidos que existen — por eso borrar un pedido devuelve el saldo solo, gratis.

   DECISIONES DE ANTONIO (29-jul):
   - Cantidad escrita a mano se manda LITERAL: no se aproxima al múltiplo (MILES) ni se pisa
     con el fulminante derivado. Si escribió 600 y le salieran 1000, la app le mintió.
   - Solo en ELEGIR MATERIALES DEL NIVEL. Nivel completo y por apartamento quedan igual.
   - El saldo baja al HACER el pedido, no al recibirlo. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* ───────── el techo, como función PURA ───────── */
console.log('\n— 1. NO se puede pedir más de lo que la receta permite —');
const zC = ex('function _cantidadPedida(');
let cant = null;
try { cant = new Function('return (' + zC + ')')(); } catch(e){}
ok('existe el techo como función pura', typeof cant === 'function');
if (typeof cant === 'function') {
  ok('pide lo que eligió si cabe', cant(70, 100) === 70);
  /* ⚠️ EL CORAZÓN DEL PEDIDO DE ANTONIO: el max del input se saltea escribiendo, así que el
     techo de verdad tiene que estar del lado del generador */
  ok('NUNCA más de lo permitido', cant(500, 100) === 100);
  ok('justo el tope se respeta', cant(100, 100) === 100);
  ok('sin elegir nada = todo lo permitido', cant(null, 100) === 100 && cant('', 100) === 100);
  ok('basura = todo lo permitido', cant('abc', 100) === 100 && cant(0, 100) === 100 && cant(-5, 100) === 100);
  ok('sin decimales', cant(70.9, 100) === 70);
  ok('no inventa si no hay permitido', cant(50, 0) === 0);
} else { ['cabe','tope','justo','sin elegir','basura','decimales','cero'].forEach(n => ok(n, false)); }

/* ───────── la contabilidad derivada ───────── */
console.log('\n— 2. lo pedido se registra por CANTIDAD, no por sí/no —');
const zCubre = ex('function _pedidoCubre(');
const zCob   = ex('function _coberturaAptosEtapa(');
const zYa    = ex('function _itemsYaPedidosEtapa(');
let cubre=null, cob=null, ya=null;
try {
  cubre = new Function('return (' + zCubre + ')')();
  cob   = new Function('_pedidoCubre', 'return (' + zCob + ')')(cubre);
  ya    = new Function('return (' + zYa + ')')();
} catch(e){ console.log('   (no evaluable: ' + e.message + ')'); }

const pedidoNivel = (qty, extra) => Object.assign({
  esDeReceta: true, recetaLevelId: 'L1', recetaEtapaIdx: 0, recetaAptoId: '',
  items: { 'TABLAYESO': qty }, recetaKeys: ['TABLAYESO'], recetaQty: { TABLAYESO: qty },
}, extra || {});

if (cob && ya) {
  /* un pedido de NIVEL por 70 tiene que CONTAR 70 — antes ni siquiera entraba a la cuenta */
  ok('un pedido de nivel suma su cantidad', (cob([pedidoNivel(70)], 'L1', 0).TABLAYESO || {}).total === 70);
  ok('dos pedidos parciales se acumulan', (cob([pedidoNivel(70), pedidoNivel(20)], 'L1', 0).TABLAYESO || {}).total === 90);
  ok('y NO cierra la clave (si no, el saldo nunca se ofrece)', !ya([pedidoNivel(70)], 'L1', 0).TABLAYESO);
  /* ⚠️ RETROCOMPATIBILIDAD: los pedidos anteriores a v909 no tienen recetaQty. Si dejaran de
     cerrar la clave, el día del deploy VDC y VLA re-ofrecen material YA COMPRADO. */
  const viejo = { esDeReceta: true, recetaLevelId: 'L1', recetaEtapaIdx: 0, items: { 'TABLAYESO': 100 }, recetaKeys: ['TABLAYESO'] };
  ok('un pedido VIEJO sin recetaQty sí cierra la clave', !!ya([viejo], 'L1', 0).TABLAYESO);
  ok('y no aporta cantidad', !cob([viejo], 'L1', 0).TABLAYESO);
  ok('los de otra etapa no se mezclan', !cob([pedidoNivel(70)], 'L1', 1).TABLAYESO);
} else { ['suma','acumula','no cierra','viejo cierra','viejo sin cantidad','otra etapa'].forEach(n => ok(n, false)); }

console.log('\n— 3. lo RECIBIDO no puede borrar lo pedido —');
if (cubre) {
  ok('sin recepción cuenta lo pedido', cubre({ recetaQty: { A: 100 } }).A === 100);
  ok('si falta llegar una OC, sigue contando lo pedido', cubre({ recetaQty: { A: 100 }, recepcion: { faltanEntregas: true, recetaRecibido: { A: 30 } } }).A === 100);
  /* ⚠️ SOBRE-COMPRA SILENCIOSA: recetaRecibido solo trae las claves que matchearon en el modal
     de recepción (los postes con medida especial son justo donde ese match es más frágil). Si
     REEMPLAZA en vez de fusionar, la clave que no matcheó vuelve a ofrecerse ENTERA como si
     nunca se hubiera pedido — y se compra dos veces. */
  const fus = cubre({ recetaQty: { A: 100, POSTE: 50 }, recepcion: { recetaRecibido: { A: 30 } } });
  ok('lo recibido manda en su clave', fus.A === 30);
  ok('pero NO borra las claves que no matchearon', fus.POSTE === 50);
} else { ['sin recepcion','faltan','recibido manda','no borra'].forEach(n => ok(n, false)); }

console.log('\n— 4. de punta a punta: pido 70 de 100 y me quedan 30 —');
const zEtapa = ex('function _etapaItemsParaPedir(');
try {
  const receta = { TABLAYESO: 100 };
  const armar = (pedidos) => new Function(
    '_recetaEtapaResuelta','_recetaV2EtapaNivelPorApto','_itemsYaPedidosEtapa','_coberturaAptosEtapa',
    '_recetaEsMiles','_recetaAprox','_recetaMilesMult','_recetaDerivarFulminantes',
    'return (' + zEtapa + ')')(
      () => ({ src: receta, usarTotalesPDF: true, deRecetaV2: true }),
      () => ({}), ya, cob,
      () => false, n => n, () => 1, () => null
    )({ materiales: { pedidos: pedidos } }, { id:'T1' }, { id:'L1', aptos:[{id:'a1'}] }, 0);
  const sinPedir = armar([]);
  ok('sin pedidos aparece el total', sinPedir.length === 1 && sinPedir[0].qtyFinal === 100);
  const con70 = armar([pedidoNivel(70)]);
  ok('con 70 pedidos queda la DIFERENCIA', con70.length === 1 && con70[0].qtyFinal === 30);
  const con100 = armar([pedidoNivel(100)]);
  ok('cubierto al 100% desaparece de la lista', con100.length === 0);
  const con70y30 = armar([pedidoNivel(70), pedidoNivel(30)]);
  ok('dos parciales que suman el total también lo cierran', con70y30.length === 0);
  /* borrar el pedido devuelve el saldo SOLO: es todo el argumento de derivar en vez de guardar */
  ok('sin el pedido el saldo vuelve entero', armar([]).length === 1);

  /* ⚠️ EL AGUJERO QUE ESTE CAMBIO ABRÍA: si los pedidos de nivel ya no cierran la clave,
     el modo POR APARTAMENTO volvía a ofrecer material que el NIVEL ya cubrió — doble compra.
     El apto tiene que mirar el saldo del nivel. */
  const armarApto = (pedidos) => new Function(
    '_recetaEtapaResuelta','_recetaV2EtapaNivelPorApto','_itemsYaPedidosEtapa','_coberturaAptosEtapa',
    '_recetaEsMiles','_recetaAprox','_recetaMilesMult','_recetaDerivarFulminantes',
    'return (' + zEtapa + ')')(
      () => ({ src: receta, usarTotalesPDF: true, deRecetaV2: true }),
      () => ({ TABLAYESO: 10 }), ya, cob,
      () => false, n => n, () => 1, () => null
    )({ materiales: { pedidos: pedidos } }, { id:'T1' }, { id:'L1', aptos:[{id:'a1'}] }, 0, 'a1');
  ok('nivel cubierto al 100% → el apto no ofrece nada', armarApto([pedidoNivel(100)]).length === 0);
  const apto70 = armarApto([pedidoNivel(70)]);
  ok('con saldo de sobra el apto pide lo suyo', apto70.length === 1 && apto70[0].qtyFinal === 10);
  const apto95 = armarApto([pedidoNivel(95)]);
  ok('si queda menos que el apto, se capa al saldo del nivel', apto95.length === 1 && apto95[0].qtyFinal === 5);
} catch(e){ console.log('   (no evaluable: ' + e.message + ')'); ['total','diferencia','cierra','dos parciales','vuelve','apto lleno','apto suyo','apto capado'].forEach(n => ok(n, false)); }

/* ───────── la pantalla ───────── */
console.log('\n— 5. la casilla de cantidad en ELEGIR MATERIALES —');
const zSel = ex('function _abrirSelectorItemsEtapa(');
ok('cada fila trae una casilla de cantidad', /_selItemQty/.test(zSel));
ok('con el saldo como tope', /max="/.test(zSel));
ok('sin decimales y mínimo 1', /min="1"/.test(zSel) && /step="1"/.test(zSel));
/* regla v976 ya pagada: menos de 16px hace zoom en iOS al enfocar */
/* ventana amplia: entre la clase y el estilo hay atributos y el comentario del v1038 */
ok('no hace zoom en el celular', /_selItemQty[\s\S]{0,900}?font-size:16px/.test(zSel));
/* regla v986/v1009: el markup inline SIN CLASE queda fuera del alcance del CSS responsive */
ok('la fila tiene clase', /_selItemRow/.test(zSel));
ok('tocar la casilla no desmarca el material', /stopPropagation/.test(zSel));

console.log('\n— 5b. v1038: no se puede ni ESCRIBIR más que el tope —');
/* Antonio (29-jul, con foto escribiendo 400 sobre un tope de 330): "quiero que NO deje pedir
   y escribir más de lo que la receta le dice". El max de HTML no impide teclear: la casilla
   se corrige SOLA al escribir. El toast del handler y el clamp del generador quedan como
   respaldo. */
const mIn = zSel.match(/_selItemQty[^>]*oninput="([^"]+)"/);
ok('la casilla se corrige mientras se escribe', !!mIn);
if (mIn) {
  const correr = (value, max) => {
    const el = { value: String(value), max: String(max) };
    new Function('event', mIn[1]).call(el);
    return String(el.value); // un input real siempre guarda texto
  };
  ok('escribir 400 con tope 330 la baja a 330 al instante', correr('400','330') === '330');
  ok('escribir menos del tope no se toca', correr('200','330') === '200');
  ok('vacía no se toca (se está escribiendo)', correr('','330') === '');
  ok('el tope exacto pasa', correr('330','330') === '330');
} else { ['400→330','200 igual','vacía','exacto'].forEach(n => ok(n, false)); }

console.log('\n— 6. el handler valida ANTES de mandar —');
const zPedir = ex('function _selItemPedir(');
/* las claves llevan comillas y apóstrofos (POSTE DE 2½" X 9.19'): buscar el input por
   selector con la clave adentro rompería. Se recorre la FILA. */
ok('lee cada fila, no arma selectores con la clave', /_selItemRow/.test(zPedir) && !/querySelector\('\._selItemQty\[data-key/.test(zPedir));
ok('rechaza cantidad en cero', /MAYOR A CERO|MAYOR QUE CERO/.test(zPedir));
ok('rechaza pasarse del tope', /NO PODÉS PEDIR MÁS/.test(zPedir));
ok('manda las cantidades elegidas', /qtyElegida/.test(zPedir));

console.log('\n— 7. el generador respeta lo elegido —');
const zGen = ex('async function pedirEtapaCompleta(');
ok('recibe las cantidades elegidas', /opts\.qtyElegida/.test(zGen));
ok('aplica el techo con la función pura', /_cantidadPedida\(/.test(zGen));
/* Antonio: "exacto lo que escribí" — ni múltiplo ni fulminante derivado le pisan el número */
ok('marca el pedido como cantidad puesta a mano', /recetaQtyManual/.test(zGen));
ok('la cantidad escrita no se aproxima al múltiplo', /_qtyManual|_manualKeys/.test(zGen));
ok('el fulminante derivado no pisa lo escrito', /FULMINANTE[\s\S]{0,300}?_manualKeys|_manualKeys[\s\S]{0,300}?FULMINANTE/.test(zGen));
ok('la contabilidad registra lo REALMENTE pedido', /recetaQty\[key\]/.test(zGen));

console.log('\n— 8. la re-sincronización no re-infla el pedido —');
/* ⚠️ EL RIESGO MÁS SILENCIOSO: _pedidoResyncConReceta corre SOLA cuando alguien edita la
   receta o toca el ≈. Sin este candado, el pedido de 70 se re-infla a 100 y la OC sale por
   100 sin que nadie lo haya pedido. */
const zRes = ex('function _pedidoResyncConReceta(');
ok('un pedido con cantidad a mano NO se re-sincroniza', /recetaQtyManual/.test(zRes));
ok('y se sale antes de tocar nada', /if \(pd\.recetaQtyManual\) return false/.test(zRes));

console.log('\n— 9. los textos ya no mienten —');
ok('el selector explica que se puede cambiar la cantidad', /cantidad/i.test(zSel.slice(zSel.indexOf('PEDIR ETAPA'), zSel.indexOf('PEDIR ETAPA') + 500)));
ok('el menú de modos ya no dice que no se puede tocar', !/la cantidad del nivel no se puede tocar/.test(html));
ok('ni que no se pueden modificar', !/salen de la receta y no se pueden modificar/.test(html));
ok('ni que no se pueden tocar', !/salen de la receta y no se pueden tocar/.test(html));

console.log('\n— 10. clientes viejos —');
/* cambia cómo se INTERPRETA un dato compartido: un celular con la versión vieja ve el pedido
   de 70 con la regla vieja (clave cerrada) y NO deja pedir los 30 que faltan */
ok('se subió la versión de sincronización', /APP_SYNC_VERSION = 918/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
