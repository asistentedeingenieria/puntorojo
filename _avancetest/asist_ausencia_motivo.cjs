/* v839: MARCAR AUSENCIA — motivo nuevo "NO HAY ÁREA PARA EL"; si eligen OTRO el detalle es
   OBLIGATORIO; el detalle se guarda en MAYÚSCULAS (y se escribe en mayúsculas en vivo). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0; const ok = (n, c) => c ? pass++ : (fail++, console.log('FAIL ' + n));

// nuevo chip de motivo en el modal
ok('chip "NO HAY ÁREA PARA EL" en el modal', /data-tipo="NO HAY ÁREA PARA EL"[^>]*onclick="_amSelTipo\('NO HAY ÁREA PARA EL'\)"[^>]*>NO HAY ÁREA PARA EL</.test(html));

// el textarea de detalle se escribe en MAYÚSCULAS en vivo
ok('detalle en mayúsculas en vivo (oninput)', /id="amDetalle"[^>]*oninput="[^"]*toUpperCase\(\)/.test(html));

// _guardarAusenciaMotivo: OTRO exige detalle + lo guarda en mayúsculas
const m = html.indexOf('function _guardarAusenciaMotivo(');
let g=''; if(m>=0){ let i=html.indexOf('{',m), d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0){ g=html.slice(m,i+1); break; } } } }
ok('_guardarAusenciaMotivo extraída', !!g);
ok('detalle .trim().toUpperCase()', /\.value\|\|''\)\.trim\(\)\.toUpperCase\(\)/.test(g) || /\.trim\(\)\.toUpperCase\(\)/.test(g));
ok('OTRO exige detalle (no vacío)', /_amTipo===['"]OTRO['"]\s*&&\s*!detalle/.test(g));
ok('mensaje de error si OTRO sin detalle', /ESCRIB[IÍ] LA RAZ[OÓ]N|ESCRIBE LA RAZ[OÓ]N|DETALLE OBLIGATORIO/i.test(g));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
