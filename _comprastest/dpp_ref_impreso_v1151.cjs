/* v1151 (1/2) — DESPACHOS PRE-PAGO: orden por REF, correlativo propuesto y el impreso

   Antonio (6-ago, con el Excel de SISTEGUA como espécimen):
   1. "Reordenes las ordenes pre pago... El orden correcto es la foto 1" — la lista
      A DÓNDE SE HA IDO ordenaba por FECHA descendente; el orden correcto es por REF
      ascendente (8273-01 → 8273-12). OJO: comparación NATURAL — alfabéticamente
      '8273-10' < '8273-2' (la mentira de siempre, v992).
   2. "abajo del No. coloques siempre el numero de correlativo... 8273 siempre debe de
      ser el mismo" + respuestas: el prefijo es FIJO de la serie (no cambia por compra)
      y la app PROPONE el siguiente (pre-llenado, editable). Se deriva del MAYOR sufijo
      global entre los despachos pre-pago (el prefijo no se clava en el código: sale del
      último usado — si algún día cambia la serie, la app sigue sola).
   3. El impreso: título DESPACHO PRE-PAGO en UNA fila (quebraba por el guion), subtítulo
      LIBERACIÓN DE MATERIAL... en UNA fila, y el REF grande bajo el No. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* ══ 1. las piezas puras ══ */
console.log('— partir el REF y proponer el siguiente —');
const zP = ex(html, 'function _dppRefPartes(');
const zS = ex(html, 'function _dppSiguienteRef(');
ok('existen', !!zP && !!zS);
let partes = null, siguiente = null;
try {
  partes = new Function('return (' + zP + ')')();
  siguiente = new Function('return (function(){ ' + zP + '\n' + zS + '\nreturn _dppSiguienteRef; })()')();
} catch(e){}
ok('evalúan', typeof partes === 'function' && typeof siguiente === 'function');
if (partes) {
  ok('parte 8273-12', (function(){ const r = partes('8273-12'); return r && r.pref === '8273' && r.num === 12; })());
  ok('conserva el cero a la izquierda (8273-01 ⇒ pad 2)', (function(){ const r = partes('8273-01'); return r && r.num === 1 && r.pad === 2; })());
  ok('basura ⇒ null', partes('SIN GUION') === null && partes('') === null && partes(null) === null);
}
if (siguiente) {
  const desp = [
    { esPrepago:true, refExterna:'8273-09' },
    { esPrepago:true, refExterna:'8273-12' },
    { esPrepago:true, refExterna:'8273-10' },
    { esPrepago:true },                       /* sin REF: no estorba */
    { esPrepago:false, refExterna:'9999-99' } /* no es pre-pago: se ignora */
  ];
  ok('propone el siguiente GLOBAL (8273-13)', siguiente(desp) === '8273-13');
  ok('el pad se conserva (…-09 ⇒ …-10)', siguiente([{ esPrepago:true, refExterna:'8273-09' }]) === '8273-10');
  ok('sin despachos con REF no propone nada', siguiente([]) === '' && siguiente([{ esPrepago:true }]) === '');
}

console.log('\n— el comparador del orden natural —');
const zC = ex(html, 'function _dppCmpRef(');
ok('existe', !!zC);
let cmp = null;
try { cmp = new Function('return (function(){ ' + zP + '\n' + zC + '\nreturn _dppCmpRef; })()')(); } catch(e){}
ok('evalúa', typeof cmp === 'function');
if (cmp) {
  const a = { refExterna:'8273-02', ts: 900 }, b = { refExterna:'8273-10', ts: 100 }, sin = { ts: 50 };
  ok('8273-02 va ANTES que 8273-10 (numérico, no alfabético)', cmp(a, b) < 0 && cmp(b, a) > 0);
  ok('con REF va antes que sin REF', cmp(a, sin) < 0 && cmp(sin, a) > 0);
  ok('sin REF ordena por fecha ascendente', cmp({ ts: 1 }, { ts: 2 }) < 0);
  ok('la lista completa queda como la foto 1', (function(){
    const l = [{ refExterna:'8273-12' }, { refExterna:'8273-10' }, { refExterna:'8273-11' }, { refExterna:'8273-01' }, { refExterna:'8273-02' }];
    return l.slice().sort(cmp).map(x => x.refExterna).join(',') === '8273-01,8273-02,8273-10,8273-11,8273-12';
  })());
}
ok('la lista A DÓNDE SE HA IDO usa el comparador', /sort\(_dppCmpRef\)/.test(code));

/* ══ 2. el form propone el REF ══ */
console.log('\n— el form pre-llena el REF con el siguiente —');
ok('_dppForm nace con el REF propuesto', /_dppForm = \{[^}]*ref:\s*_refSug/.test(code) || /ref:\s*_dppSiguienteRef\(/.test(code));
ok('el input lo trae puesto (editable)', /placeholder="8273-10"[^>]*value=/.test(code) || /value="\$\{[^}]*_refSug[^}]*\}"[^>]*oninput="window\._dppForm\.ref/.test(code));

/* ══ 3. el impreso ══ */
console.log('\n— el impreso del despacho —');
ok('el título DPP va en UNA fila (nowrap, el guion lo quebraba)',
  /class="oc-title"\$\{oc\.esPrepago \? ' style="[^"]*white-space:nowrap/.test(code));
ok('el subtítulo LIBERACIÓN… también en una fila', /LIBERACIÓN DE MATERIAL YA PAGADO[\s\S]{0,200}white-space:nowrap|white-space:nowrap[^>]*>LIBERACIÓN DE MATERIAL YA PAGADO/.test(code) || /font-weight:700;white-space:nowrap">LIBERACIÓN DE MATERIAL/.test(code));
ok('el No. muestra el REF grande para el pre-pago', /esPrepago && oc\.refExterna[\s\S]{0,120}refExterna|refExterna[\s\S]{0,60}: _ocNumeroPartes\(oc\)\.oc/.test(code));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
