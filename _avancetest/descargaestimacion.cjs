/* v776: la descarga del Excel de estimación salía corrupta. Causa: al subir se guardaba el
   .xlsx pasado por _limpiarExcelEstimacion (cirugía XML/zip que borra pestañas), que corrompía
   el archivo. Fix: guardar el ORIGINAL (file) byte-perfecto; y la descarga valida r.ok + fallback. */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// descarga robusta
const m = html.match(/window\.descargarEstimacionExcel\s*=\s*async function[\s\S]*?\n  \};/);
ok('descargarEstimacionExcel existe', !!m);
const body = m?m[0]:'';
ok('descarga valida r.ok', /r\.ok/.test(body));
ok('descarga tiene fallback window.open', body.indexOf('window.open(ex.url')>=0);

// el upload guarda el ORIGINAL (file), no el blob limpiado, en la ruta estimaciones/
const i = html.indexOf("firebase.storage().ref('estimaciones/'");
ok('bloque de guardado de estimaciones existe', i>=0);
const region = i>=0 ? html.slice(Math.max(0,i-400), i+400) : '';
ok('guarda el archivo ORIGINAL (.put(file)', /\.put\(\s*file\b/.test(region));
ok('ya NO guarda el _xblob limpiado', region.indexOf('.put(_xblob')<0);

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
