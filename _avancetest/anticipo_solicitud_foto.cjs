/* v842: en SOLICITAR ANTICIPO, foto de referencia OPCIONAL para que compras vea qué se necesita.
   Se sube a Storage (anticipos-solicitud/), best-effort (la solicitud se crea aunque no haya foto
   o falle la subida). Compras la ve en la tarjeta y en el modal SUBIR COTIZACIÓN. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractAt(startIdx){ let i=html.indexOf('{',startIdx),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(startIdx,i+1); } } return ''; }
function extractFn(name){ const m=html.indexOf('function '+name+'('); return m<0?'':extractAt(m); }
function extractAssigned(name){ const m=html.indexOf('window.'+name+' = '); return m<0?'':extractAt(m); }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// 1) crearSolicitudAnticipo: async + subida opcional
const srcCrear = extractAssigned('crearSolicitudAnticipo');
ok('crearSolicitudAnticipo existe', !!srcCrear);
ok('es async (espera la subida)', srcCrear.indexOf('async function')>=0);
ok('lee el input #antSolFoto', srcCrear.indexOf('antSolFoto')>=0);
ok('foto OPCIONAL (guardada con if(file), sin return obligatorio)', /if\(file\)/.test(srcCrear));
ok('sube a anticipos-solicitud', srcCrear.indexOf('anticipos-solicitud')>=0);
ok('usa getDownloadURL', srcCrear.indexOf('getDownloadURL')>=0);
ok('guarda refFotoUrl en la solicitud', srcCrear.indexOf('refFotoUrl')>=0);
ok('sigue persistiendo con _antSolicSave', srcCrear.indexOf('_antSolicSave')>=0);
// que NO sea obligatoria: no debe abortar por falta de foto
ok('no exige la foto (sin "SUBÍ LA FOTO"/"FALTA FOTO")', srcCrear.indexOf('FALTA FOTO')<0 && srcCrear.indexOf('SUBÍ LA FOTO')<0);

// 2) _antAbrirSolicitar: input opcional en el modal
const srcAbrir = extractAssigned('_antAbrirSolicitar');
ok('_antAbrirSolicitar existe', !!srcAbrir);
ok('modal con input #antSolFoto', srcAbrir.indexOf('antSolFoto')>=0);
ok('acepta foto o PDF', srcAbrir.indexOf('image/*')>=0 && srcAbrir.indexOf('application/pdf')>=0);
ok('etiquetado como opcional', srcAbrir.toLowerCase().indexOf('opcional')>=0);

// 3) _antAbrirCotizar: compras ve la foto de referencia
const srcCot = extractAssigned('_antAbrirCotizar');
ok('_antAbrirCotizar existe', !!srcCot);
ok('cotizar muestra la foto de referencia', srcCot.indexOf('refFotoUrl')>=0 && srcCot.indexOf('FOTO DE REFERENCIA')>=0);

// 4) _antSolicRender: la tarjeta muestra la foto de referencia
const srcRen = extractFn('_antSolicRender');
ok('_antSolicRender existe', !!srcRen);
ok('tarjeta muestra la foto de referencia', srcRen.indexOf('refFotoUrl')>=0 && srcRen.indexOf('FOTO DE REFERENCIA')>=0);

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
