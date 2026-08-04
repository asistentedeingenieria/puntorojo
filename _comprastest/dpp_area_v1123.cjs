/* v1123 — EL ÁREA A LA QUE VA EL MATERIAL (Antonio, 4-ago):
   "Aquí necesito que se pueda poner el área para dónde va dirigido esta plancha."
   Sus despachos en papel lo traen desde siempre, escrito a mano sobre el impreso:
       Señores:  SISTEGUA, S.A.
       Fecha:    3 de agosto de 2026
       Proyecto: ESSENZA - FASE 2
       Área:     TORRE 4, NIVEL 12, ETAPA 3        ← esto es lo que falta capturar
   Sin el área, el que recibe en la obra no sabe a qué torre subir el material.

   Va junto con el N° DE ORDEN (8273-XX) que el proveedor le pone al papel: Antonio lo
   pidió para el desglose del resumen ("arriba a la derecha está el número que le
   corresponde a cada orden para poder registrarlo"), y hasta hoy solo se podía escribir
   por consola — el campo existía en la lista pero nadie podía llenarlo desde la app. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
/* los tests que miran el HTML deben mirar el código SIN comentarios: ya mordió tres veces
   (DUBAI, max-width:560px, v972) al encontrar el token buscado dentro de un comentario */
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zC = ex(code, 'window._dppCrearDesdeMadre = async function(');
ok('existe el generador de despachos', zC.length > 1000);

console.log('\n— el formulario lo pregunta —');
ok('el modal pide el ÁREA', /ÁREA/.test(zC));
ok('dice para qué sirve (a dónde va dirigido)', /torre|nivel|etapa|dirigid/i.test(zC));
ok('el área se captura por oninput (prConfirm destruye el modal antes del await)',
  /_dppForm\.area\s*=\s*this\.value/.test(zC));
ok('el formulario arranca con el campo declarado', /_dppForm\s*=\s*\{[^}]*area\s*:/.test(zC));
ok('el modal pide el N° de orden del proveedor', /N.{0,3}\s*DE ORDEN|REFERENCIA/i.test(zC));
ok('la referencia también se captura por oninput', /_dppForm\.ref\s*=\s*this\.value/.test(zC));

console.log('\n— y se guardan en el despacho —');
ok('el despacho guarda areaDestino', /areaDestino\s*:/.test(zC));
ok('el despacho guarda refExterna', /refExterna\s*:/.test(zC));
ok('el área se guarda en MAYÚSCULAS, como todo el impreso', /areaDestino[^,]*toUpperCase\(\)/.test(zC));
ok('son opcionales: sin área el despacho igual se genera',
  !/if\s*\(\s*!\s*(form|window\._dppForm)\.area\s*\)\s*return/.test(zC));

console.log('\n— el papel lo imprime —');
/* el bloque Señores/Fecha/Proyecto del impreso de OC, compartido por los despachos */
const info = code.slice(code.indexOf('<dt>Señores:</dt>'), code.indexOf('<dt>Señores:</dt>') + 1400);
ok('el impreso tiene una línea Área', /<dt>Área:<\/dt>/.test(info));
ok('sale debajo de Proyecto, como en su formato', info.indexOf('<dt>Proyecto:</dt>') < info.indexOf('<dt>Área:</dt>'));
ok('solo aparece si el despacho trae área (no deja una línea vacía)', /areaDestino[\s\S]{0,120}<dt>Área:/.test(info));

console.log('\n— el área viaja al resumen —');
const zR = ex(code, 'function _dppResumenPorObra(');
ok('cada documento del desglose lleva su área', /area\s*:\s*String\(o\.areaDestino/.test(zR));
const zA = ex(code, 'window._dppAbrirResumen = function(');
ok('y el resumen la muestra junto al número de orden', /dc\.area/.test(zA));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
