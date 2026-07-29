/* v1042 — DASHBOARD VISUAL DE GASTOS (pedido de Antonio: "un dashboard visual creativo que
   nos pueda reflejar cómo vamos").

   Reglas de la guía de visualización aplicadas y verificadas acá:
   - La pareja COMPRA/DESPACHO (#1D4ED8 / #166534) pasó el validador de paleta (ΔE 25.9 en
     deuteranopia, contraste ≥3:1 sobre el papel) — son los MISMOS colores que GASTOS ya usa,
     el color sigue a la entidad.
   - Barras horizontales apiladas con separador de 2px entre segmentos; leyenda siempre
     presente (2 series) + total directo al final de cada barra.
   - El TEXTO va en tinta (tokens), nunca del color de la serie — la identidad la lleva el
     cuadrito de la leyenda.
   - Un solo eje implícito (todas las barras comparten el máximo); nada de doble escala.
   - TOP PROVEEDORES y TOP MATERIALES: una sola serie cada uno → sin leyenda, el título nombra. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. los datos, PUROS y derivados —');
const zD = ex('function _comprasGastosDashDatos(');
let datos = null;
try { datos = new Function('state','_gastosDeProyecto','_cuentasPorPagar','return (' + zD + ')'); } catch(e){}
ok('existe', !!datos && zD.length > 400);
if (datos) {
  const st = { projects: [ { id:'p1', name:'OBRA A' }, { id:'p2', name:'OBRA B' } ] };
  const g = pid => pid === 'p1'
    ? { totalCompra: 100, totalDespacho: 50, total: 150, ordenes: [ { proveedorNombre:'SISTEGUA', monto: 100, items: [{ name:'POSTE', qty: 10, precio: 10 }] }, { proveedorNombre:'FERRE', monto: 50, items: [{ name:'CLAVO', qty: 50, precio: 1 }] } ] }
    : { totalCompra: 300, totalDespacho: 0, total: 300, ordenes: [ { proveedorNombre:'SISTEGUA', monto: 300, items: [{ name:'POSTE', qty: 30, precio: 10 }] } ] };
  const cxp = pid => pid === 'p1' ? { total: 80, totalVencido: 30 } : { total: 0, totalVencido: 0 };
  const r = datos(st, g, cxp)();
  ok('totales de empresa', r.total === 450 && r.totalCompra === 400 && r.totalDespacho === 50);
  ok('por pagar con su vencido', r.porPagar === 80 && r.vencido === 30);
  ok('las obras salen ordenadas por gasto', r.obras[0].nombre === 'OBRA B' && r.obras[0].total === 300);
  ok('proveedores acumulados y ordenados', r.proveedores[0].name === 'SISTEGUA' && r.proveedores[0].monto === 400);
  ok('materiales en dinero', r.materiales[0].name === 'POSTE' && r.materiales[0].monto === 400);
  ok('tope de 5 (no listas infinitas)', r.proveedores.length <= 5 && r.materiales.length <= 5);
} else { ['totales','cxp','orden','provs','mats','top5'].forEach(n => ok(n, false)); }

console.log('\n— 2. el dibujo respeta la guía —');
const zH = ex('function _comprasGastosDashHTML(');
ok('existe el builder', zH.length > 800);
/* v1043 (Antonio con foto: las tarjetas salían apiladas a lo ancho, "solo para unos números"):
   compactas, las 4 juntas en fila — cuadrícula propia, sin depender de .kpi-row (que dentro
   del panel no arma la grilla) */
ok('tarjetas compactas en cuadrícula propia', /repeat\(auto-fit,minmax\(1[4-9]\dpx,1fr\)\)/.test(zH));
/* se mira el MARKUP (class="...") — la palabra suelta vive en el comentario que explica por qué */
ok('sin la clase kpi-row (dentro del panel se apila)', !/class="kpi/.test(zH));
ok('la pareja validada, y solo en los RELLENOS', /#1D4ED8/.test(zH) && /#166534/.test(zH) && !/color:#1D4ED8/.test(zH) && !/color:#166534/.test(zH));
ok('leyenda con las dos series', /COMPRA</.test(zH) && /DESPACHO</.test(zH));
ok('separador de 2px entre segmentos', /gap:2px/.test(zH));
ok('total directo al final de cada barra (en tinta)', /fmtQ\(o\.total\)|fmtQ\(f\.total\)/.test(zH));
ok('tooltip por barra', /title="/.test(zH));
ok('sin datos no pinta barras vacías', /SIN GASTO REGISTRADO|Todavía no hay gasto/i.test(zH));

console.log('\n— 3. vive en la sección GASTOS de COMPRAS —');
const zT = ex('function _comprasSetTab(');
ok('el despacho lo pinta antes del resumen', /_comprasGastosDashHTML\(\) \+ _comprasGastosResumenHTML\(\)/.test(zT));
ok('respetando el permiso de montos', /_puedeVerGastos\(\)/.test(zT));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
