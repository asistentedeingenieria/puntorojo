/* v888: en RETENCIONES los botones de fila/persona ya no dicen ENVIAR sino LIBERAR
   (pedido del user: "en vez de enviar debe de decir LIBERAR RETENCIÓN").
   Solo texto visible — los handlers enviarRetencionIndividual/enviarRetencionPersona
   y el flujo (preview → gerente autoriza) NO cambian. El botón grande del proyecto
   ("ENVIAR LIQUIDACIÓN ... AL GERENTE DE PROYECTOS") se queda: describe otro paso. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

ok('botón de fila dice LIBERAR RETENCIÓN', /enviarRetencionIndividual\('\$\{h\(pg\.id\)\}'\)[^>]*>LIBERAR RETENCIÓN<\/button>/.test(html));
ok('ya no existe ENVIAR ESTA', html.indexOf('>ENVIAR ESTA<') < 0);
ok('botón por persona dice LIBERAR TODAS DE', /enviarRetencionPersona\('\$\{nameEsc\}'\)[^>]*>LIBERAR TODAS DE \$\{h\(name\)\}/.test(html));
ok('ya no existe ENVIAR TODAS DE', html.indexOf('>ENVIAR TODAS DE ${h(name)}') < 0);
ok('handler enviarRetencionIndividual intacto', html.indexOf('window.enviarRetencionIndividual = async function(pagoId)') >= 0);
ok('handler enviarRetencionPersona intacto', html.indexOf('window.enviarRetencionPersona = async function(name)') >= 0);
ok('botón del proyecto (al gerente) intacto', html.indexOf('ENVIAR LIQUIDACIÓN DE RETENCIONES AL GERENTE DE PROYECTOS') >= 0);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
