/* v1089 — cuatro pedidos de Antonio (31-jul), en su orden:
   1. "en la bodega central me está marcando la OC 6, la cual NO corresponde aquí porque esa
      es una OC de la bodega de pre-pago. NECESITO QUE ESO SEA APARTE SIEMPRE".
   2. "NO está agarrando las firmas correctamente. Date cuenta como no está firmando" — los
      documentos anteriores a v1086 no guardaron el username del autorizador.
   3. "donde dice de qué obra a qué obra pasa con la flecha, quiero eso en una misma fila y
      no que se vaya para abajo".
   4. "en pólizas NO me debe de salir los kpis de asistencia". */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. la bodega central NO mezcla el pre-pago —');
const zR = ex('function _bodegaOcsPorRecibir(');
ok('POR RECIBIR excluye la madre COMPRA ANTICIPADA', /_ocEsPrepagoMadre\(oc\)\) return;/.test(zR));
ok('el guard va ANTES de mirar el estado (no depende del orden)', zR.indexOf('_ocEsPrepagoMadre') < zR.indexOf("!== 'AUTORIZADA'"));
let f = null;
try { f = new Function('state','window','_ocEsPrepagoMadre', 'return (' + zR + ')'); } catch(e){}
ok('se puede ejecutar aislada', !!f);
if (f) {
  const madre = { id: 'm1', numero: 'BODEGA – OC 6', formaPago: 'COMPRA ANTICIPADA', status: 'AUTORIZADA' };
  const normal = { id: 'o1', numero: 'BODEGA – OC 1', formaPago: 'CRÉDITO 15 DÍAS', status: 'AUTORIZADA' };
  const st = { bodegaMat: { ordenes: [madre, normal] }, projects: [], bodegaMovs: [] };
  const esM = o => /COMPRA\s*ANTICIPADA/i.test(String((o || {}).formaPago || ''));
  const r = f(st, { _bodegaYaTieneMov: () => false }, esM)();
  ok('EL CASO DE ANTONIO: la OC 6 (pre-pago) NO sale en POR RECIBIR', !r.some(x => x.id === 'm1'));
  ok('la OC normal SÍ sigue saliendo', r.some(x => x.id === 'o1'));
}

console.log('\n— 2. la firma del autorizador se rescata en los documentos viejos —');
const zF = ex('function _firmaUsernameAutoriza(');
let fu = null;
try { fu = new Function('return (' + zF + ')')(); } catch(e){}
ok('existe _firmaUsernameAutoriza y es pura', !!fu && zF.length > 200);
if (fu) {
  ok('si el documento guardó el username, se usa ese', fu({ autorizadoPorUsername: 'ANA' }) === 'ana');
  /* el trasiego viejo: lo autorizó la MISMA persona que lo generó */
  ok('documento viejo: rescata el username del generador si es la misma persona',
    fu({ autorizadoPor: 'ANTONIO CARAVANTES MÖNKEMÜLLER', generadoPor: 'ANTONIO CARAVANTES MÖNKEMÜLLER', generadoPorUsername: 'antonio' }) === 'antonio');
  /* si son personas DISTINTAS no se inventa: mejor sin firma que con la equivocada */
  ok('si autorizó otra persona, NO se pone la firma del generador',
    fu({ autorizadoPor: 'ERLIN KARINA TRIGUEROS', generadoPor: 'SUSANA MONROY', generadoPorUsername: 'susana' }) === '');
  ok('sin datos devuelve vacío', fu({}) === '' && fu(null) === '');
}
ok('el impreso usa el rescate en la firma del autorizado', /_miFirmaImg\(_firmaUsernameAutoriza\(oc\)\)/.test(html));
ok('la firma del generado sigue por su propio username', /_miFirmaImg\(oc\.generadoPorUsername\)/.test(html));

console.log('\n— 3. el encabezado obra → obra, en una sola línea —');
/* la 1ª ocurrencia es el TÍTULO; el subtítulo con las obras viene en la línea siguiente */
const iT = html.indexOf('oc.esTrasiego ?');
const zT = iT > -1 ? html.slice(iT, iT + 900) : '';
ok('el subtítulo del trasiego no se parte', /white-space:nowrap/.test(zT));
ok('sigue mostrando origen → destino', /origenProyectoNombre/.test(zT) && /destinoProyectoNombre/.test(zT));

console.log('\n— 4. los KPIs de asistencia no se quedan pegados en pólizas —');
const zA = ex('window._adminSetTab = function');
ok('al salir de PERSONAL se limpia el recuadro', /getElementById\('persKpis'\)/.test(zA) && /innerHTML = ''/.test(zA));
ok('la limpieza corre ANTES de pintar la pestaña nueva', zA.indexOf('persKpis') < zA.indexOf('_adminTab = t'));
ok('en PERSONAL no se limpia (ahí sí van)', /t !== 'personal'/.test(zA));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
