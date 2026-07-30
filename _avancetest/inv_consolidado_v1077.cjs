/* v1077 — TOTAL GLOBAL POR PRODUCTO en el PDF de inventario (Antonio, 30-jul):
   "si en la bodega hay 35 postes y en la torre 1 hay 40 postes y en la torre 2 hay 2 postes
   necesito que haya una suma que sea un total global que sume todas las cantidades".
   Formato elegido por Antonio (AskUserQuestion): tabla al final con DESGLOSE POR UBICACIÓN
   — una fila por material y columnas BODEGA | cada TORRE | TOTAL | VALOR. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. el consolidado se calcula aparte y es puro —');
const zC = ex('function _invConsolidado(');
let f = null;
try { f = new Function('return (' + zC + ')')(); } catch(e){}
ok('existe _invConsolidado', !!f && zC.length > 250);
if (f) {
  /* EL EJEMPLO DE ANTONIO: 35 en bodega + 40 en torre 1 + 2 en torre 2 = 77 */
  const g = {
    bodega: { orden: ['poste'], mats: { poste: { material: 'POSTE 2½"', cantidad: 35 } } },
    ordenTorres: ['t1', 't2'],
    torres: {
      t1: { nombre: 'TORRE 1', ordenMats: ['poste', 'tabla'], mats: { poste: { material: 'POSTE 2½"', total: 40 }, tabla: { material: 'TABLA', total: 10 } } },
      t2: { nombre: 'TORRE 2', ordenMats: ['poste'], mats: { poste: { material: 'POSTE 2½"', total: 2 } } }
    }
  };
  const r = f(g);
  ok('las columnas son BODEGA + cada torre', r.cols.length === 3 && r.cols[0].nombre === 'BODEGA' && r.cols[1].nombre === 'TORRE 1' && r.cols[2].nombre === 'TORRE 2');
  const poste = r.filas.find(x => /POSTE/.test(x.material));
  ok('suma global correcta: 35 + 40 + 2 = 77', poste && poste.total === 77);
  ok('el desglose por ubicación queda a la vista', poste && poste.porCol[0] === 35 && poste.porCol[1] === 40 && poste.porCol[2] === 2);
  const tabla = r.filas.find(x => x.material === 'TABLA');
  ok('un material de una sola ubicación también aparece', tabla && tabla.total === 10 && tabla.porCol[0] === 0 && tabla.porCol[1] === 10);
  ok('los materiales van ordenados alfabéticamente', r.filas.map(x => x.material).join('|') === ['POSTE 2½"', 'TABLA'].sort().join('|'));
  /* el mismo material escrito distinto NO se debe partir en dos filas */
  const g2 = { bodega: { orden: ['a'], mats: { a: { material: 'CLAVO 1"', cantidad: 5 } } },
    ordenTorres: ['t1'], torres: { t1: { nombre: 'T1', ordenMats: ['b'], mats: { b: { material: 'clavo 1"', total: 3 } } } } };
  const r2 = f(g2);
  ok('mismo material con distinta caja de letras = UNA fila', r2.filas.length === 1 && r2.filas[0].total === 8);
  ok('sin torres no revienta', f({ bodega: { orden: [], mats: {} }, ordenTorres: [], torres: {} }).filas.length === 0);
}

console.log('\n— 2. se dibuja en el PDF, antes del TOTAL GENERAL —');
const z = ex('function _invReporteDoc(');
ok('el PDF lo arma', /_invConsolidado\(g\)/.test(z));
ok('el título dice qué es', /TOTAL GLOBAL POR PRODUCTO/.test(z));
/* se compara contra el DIBUJO del total general, no contra la frase (aparece en comentarios) */
ok('va después del detalle y antes del TOTAL GENERAL', z.indexOf('_invConsolidado(g)') > z.indexOf('g.ordenTorres.forEach') && z.indexOf('_invConsolidado(g)') < z.indexOf("doc.text('TOTAL GENERAL'"));
/* v1080: entre el cálculo y el dibujo ahora va la medición de anchos — la ventana crece */
ok('respeta el salto de página limpio de v1075', /_invConsolidado\(g\)[\s\S]{0,3000}pageBreak: 'avoid'/.test(z));
ok('lleva su columna TOTAL y el valor en dinero', /TOTAL GLOBAL POR PRODUCTO[\s\S]{0,900}'TOTAL'/.test(z) && /_cFilas|cons\.filas/.test(z));
ok('no altera el TOTAL GENERAL (es un resumen, no suma de nuevo)', !/totalGeneral \+= (subC|cons)/.test(z));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
