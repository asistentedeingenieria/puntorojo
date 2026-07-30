/* v880: cache local COMPRIMIDO (lz-string 1.5.0 oficial, incrustada). El state (~2.6MB) reventaba
   la cuota de localStorage en celulares ("CACHE LOCAL LLENO"); comprimido queda ~5x más chico.
   _cacheWrite/_cacheRead con marker 'LZ1|'; lee cachés viejos sin comprimir (compat). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── la librería incrustada funciona (eval del bloque real) ──
const iS = html.indexOf('/*LZSTRING-START*/'), iE = html.indexOf('/*LZSTRING-END*/');
ok('lz-string incrustada con markers', iS >= 0 && iE > iS);
let LZ = null;
if (iS >= 0 && iE > iS) {
  const libSrc = html.slice(iS + '/*LZSTRING-START*/'.length, iE);
  LZ = new Function(libSrc + '\nreturn LZString;')();
  const muestra = JSON.stringify({ nombre:'JOSÉ ÑANDÚ — ✓ · Ñ', pagos:Array.from({length:800},(_,i)=>({id:'pago-'+i, url:'https://firebasestorage.googleapis.com/v0/b/x/o/fotos%2Fapto'+i+'.jpg?alt=media&token=abc'+i, monto:i*1.5}))});
  const comp = LZ.compressToUTF16(muestra), deco = LZ.decompressFromUTF16(comp);
  ok('roundtrip exacto con unicode + JSON grande', deco === muestra);
  ok('comprime de verdad (<50%)', comp.length < muestra.length * 0.5);
}

// ── helpers con stub de localStorage ──
const wSrc = extractFn('_cacheWrite'), rSrc = extractFn('_cacheRead');
ok('_cacheWrite y _cacheRead existen', !!wSrc && !!rSrc);
if (wSrc && rSrc && LZ) {
  const store = {};
  /* v1073: la compresión pasó a DIFERIDA (bloqueaba 809 ms el hilo en cada guardado) — el
     sandbox declara las variables del scope y hace que el plazo corra al instante, así
     estas pruebas del formato (marker, roundtrip, compat) siguen valiendo igual. */
  const env = 'var STORAGE_KEY="k"; var _cachePend=null, _cacheTimer=null;'
    + ' var setTimeout=function(fn){ fn(); return 1; }, clearTimeout=function(){}, requestIdleCallback=function(fn){ fn(); };'
    + ' var localStorage={ setItem:function(k,v){ store[k]=String(v); }, getItem:function(k){ return (k in store)?store[k]:null; } };\n';
  const fns = new Function('store','LZString','console', env + extractFn('_cacheWriteAhora') + '\n' + wSrc + '\n' + rSrc + '\nreturn {w:_cacheWrite, r:_cacheRead};')(store, LZ, console);
  fns.w('{"hola":1}');
  ok('escribe comprimido con marker LZ1|', String(store.k).indexOf('LZ1|') === 0);
  ok('lee lo comprimido y devuelve el original', fns.r() === '{"hola":1}');
  store.k = '{"viejo":true}';
  ok('compat: lee cache viejo SIN comprimir', fns.r() === '{"viejo":true}');
  delete store.k;
  ok('sin cache → null', fns.r() === null);
}

// ── wiring: todos los caminos del cache pasan por los helpers ──
ok('boot lee con _cacheRead', html.indexOf('const raw = _cacheRead();') >= 0);
ok('ya no queda setItem directo del state', html.indexOf('localStorage.setItem(STORAGE_KEY, JSON.stringify(state))') < 0);
/* v1073 — ESTA ASERCIÓN ESTABA AL REVÉS Y ESCONDÍA UN BUG: las prefs de secciones
   colapsables NO deben pasar por _cacheWrite, porque ese helper escribe en STORAGE_KEY y
   les pisaba el cache del state completo (4 MB) cada vez que alguien colapsaba algo. */
ok('las prefs de secciones NO tocan el cache del state', !/savePrefs\(p\)\{ try\{_cacheWrite\(/.test(html) && /pr_secciones/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
