/* v905 (pedido 13-jul, VLA arranca en la app):
   (1) parseRecetaEstandar — el importador entiende el FORMATO ESTÁNDAR de receta (el Excel
       de Antonio, que será el de TODOS los proyectos): hojas SOTANOS / N01..N17, fila de
       encabezado [MATERIAL | NOMBRE REAL (COMPRA) | U | ambientes... | TOTAL NIVEL], etapas
       como filas de sección en la columna MATERIAL. Guarda el nombre real de compra (item.nc).
       Reglas: "referencia, no se compra" NO se importa; sub-ítems "• X" pierden la viñeta;
       "(PENDIENTE...)" se salta; RESUMEN se ignora; "201 - A1'" matchea APARTAMENTO 201.
   (2) Postes a MEDIDA ESPECIAL por proyecto: p.materiales.postesMedida {modo:'especial',metros}
       — _metrosAPies (×3.28084, 2 dec) y _nombreCompraConMedida reescriben el nombre de compra
       de los POSTES en pedidos/OC. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. parser del formato estándar (con las dependencias REALES extraídas) ──
const deps = extractFn('_aptoNorm') + '\n' + extractFn('resolveAptoId') + '\n';
const srcParser = extractFn('parseRecetaEstandar');
ok('parseRecetaEstandar existe', !!srcParser);
if (srcParser && deps.length > 20) {
  const parse = new Function(deps + srcParser + '\nreturn parseRecetaEstandar;')();
  const towers = [{ id:'t1', name:'TORRE ÚNICA', levels:[
    { id:'l-s', name:'SÓTANOS', aptos:[{id:'a-s6',name:'SÓTANO 06'},{id:'a-s5',name:'SÓTANO 05'}] },
    { id:'l-2', name:'NIVEL 02', aptos:[{id:'a-pas',name:'PASILLOS'},{id:'a-201',name:'APARTAMENTO 201'}] }
  ]}];
  const sheets = {
    'RESUMEN': [ ['','RESUMEN — MATERIAL POR NIVEL'], ['','MATERIAL','NOMBRE REAL (COMPRA)','U','SOTANOS','N02','GRAN TOTAL'] ],
    'N02': [
      ['','RECETA DE MATERIALES — NIVEL 02'],
      ['','MATERIAL','NOMBRE REAL (COMPRA)','U','PASILLOS',"201 - A1'",'TOTAL NIVEL'],
      ['','1RA ETAPA'],
      ['','Canal de 2 1/2" cal 26','CANAL DE 2 ½" X 10\' (0.35) CAL. 26','u',0,10,10],
      ['','Mezcla para enchape (cubeta) — referencia, no se compra','','u',1,1,2],
      ['','   • Masilla','PASTA REDIMIX USG 21.8 KG CAJA','caja',0,3,3],
      ['','2NDA ETAPA'],
      ['','Madera gabinete cocina — MEDIDA PENDIENTE','(PENDIENTE — definir medida)','u',0,0,0],
      ['','Plancha ultra','TABLAYESO 12.7mm X 1.22m X 2.4m','u',2,0,2]
    ],
    'SOTANOS': [
      ['','RECETA — SOTANOS'],
      ['','MATERIAL','NOMBRE REAL (COMPRA)','U','SOTANO 06','SOTANO 05','TOTAL NIVEL'],
      ['','3ERA ETAPA'],
      ['','Listón','CANAL LISTON 7/8" X 12\' (0.35)','u',5,0,5]
    ]
  };
  const { recetaV2, avisos } = parse(sheets, towers);
  ok('RESUMEN se ignora (solo 2 niveles)', Object.keys(recetaV2.niveles).length === 2);
  ok('N02 mapea a NIVEL 02 por número', !!recetaV2.niveles['l-2']);
  ok('SOTANOS mapea a SÓTANOS (con tilde)', !!recetaV2.niveles['l-s']);
  const e0 = (recetaV2.niveles['l-2']||{})[0] || [];
  const canal = e0.find(l => /^Canal/.test(l.m));
  ok('canal con nombre de compra y aptos por número', !!canal && canal.nc === 'CANAL DE 2 ½" X 10\' (0.35) CAL. 26' && canal.aptos['a-201'] === 10 && !('a-pas' in canal.aptos));
  ok('la fila "referencia, no se compra" NO se importa', !e0.some(l => /referencia/i.test(l.m)));
  const masilla = e0.find(l => /Masilla/i.test(l.m));
  ok('sub-ítem pierde la viñeta y trae nc', !!masilla && masilla.m === 'Masilla' && /REDIMIX/.test(masilla.nc||''));
  const e1 = (recetaV2.niveles['l-2']||{})[1] || [];
  ok('"MEDIDA PENDIENTE" se salta', !e1.some(l => /gabinete/i.test(l.m)));
  ok('2NDA ETAPA cae en etapa 1', e1.some(l => l.m === 'Plancha ultra' && l.aptos['a-pas'] === 2));
  ok('3ERA ETAPA de sótanos en etapa 2', ((recetaV2.niveles['l-s']||{})[2]||[]).some(l => l.m === 'Listón'));
  ok('sin avisos con fixture limpio', avisos.length === 0);
}

// ── 2. postes a medida especial ──
const srcHelpers = extractFn('_postesMedidaDe') + '\n' + extractFn('_metrosAPies') + '\n' + extractFn('_nombreCompraConMedida');
ok('helpers de postes existen', /_postesMedidaDe/.test(srcHelpers) && /_metrosAPies/.test(srcHelpers) && /_nombreCompraConMedida/.test(srcHelpers));
if (srcHelpers.length > 60) {
  const mod = new Function(srcHelpers + '\nreturn { _postesMedidaDe, _metrosAPies, _nombreCompraConMedida };')();
  ok('3.20 m = 10.50 pies', mod._metrosAPies(3.2) === 10.5);
  const pEsp = { materiales: { postesMedida: { modo:'especial', metros: 3.2 } } };
  const pStd = { materiales: {} };
  const nc = 'POSTE DE 2½" X 10\' (0.35) CAL. 26';
  const out = mod._nombreCompraConMedida(nc, pEsp);
  ok('POSTE reescrito con pies + sufijo', /X 10\.5'/.test(out) && /MEDIDA ESPECIAL 3\.2 m/.test(out));
  ok('CANAL no se toca', mod._nombreCompraConMedida('CANAL DE 2 ½" X 10\'', pEsp) === 'CANAL DE 2 ½" X 10\'');
  ok('modo estándar no toca nada', mod._nombreCompraConMedida(nc, pStd) === nc);
}

// ── 3. cableado ──
ok('el importador detecta el formato estándar', /esEstandar \? parseRecetaEstandar\(sheets/.test(html));
ok('detección por nombres de hoja N##/SOTANOS', /\^\(N\\d\{1,2\}\|SOTANOS\?\)\$/.test(html));
ok('el render muestra el nombre de compra', /l\.nc \?/.test(html));
ok('botón para configurar la medida de postes', /configurarPostesMedida/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
