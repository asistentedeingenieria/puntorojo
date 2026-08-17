/* v1154 — LA FIRMA SE VE COMO TINTA SOBRE LA HOJA, NUNCA COMO LA FOTO DEL PAPEL

   Antonio (6-ago, con la solicitud firmada por Claudia — un rectángulo gris de foto sobre
   el documento): "quiero que NO salga la foto nunca. Quiero que elimines el fondo y dejes
   siempre solo la firma como tal para que se vea como que se firmó en la hoja."

   TÉCNICA: sin re-procesar ninguna imagen (aplica a TODAS las firmas ya guardadas):
   filter: grayscale(1) brightness(1.35) contrast(2.4) — empuja el papel gris a BLANCO y
   conserva el trazo oscuro — + mix-blend-mode: multiply — lo blanco se vuelve invisible
   contra la hoja y la línea de "SOLICITANTE" se ve A TRAVÉS del trazo, como tinta real.
   El registro de firma ya exige "HOJA EN BLANCO + LAPICERO NEGRO + BUENA FOTO" (v989),
   así que el umbral es generoso.

   UNA sola fuente (_FIRMA_TINTA) interpolada en los CINCO documentos HTML que pintan
   firma: OC (quien generó + quien autorizó), solicitud de pedido (solicitante), recibo de
   recepción (quien recibió) y acuse (receptor). El PDF de toma de inventario (jsPDF,
   doc.addImage) queda ANOTADO: los filtros CSS no aplican ahí — si Antonio lo pide, va
   con canvas. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— una sola fuente del tratamiento —');
ok('existe la constante _FIRMA_TINTA', /_FIRMA_TINTA\s*=/.test(html));
const mDef = html.match(/_FIRMA_TINTA\s*=\s*'([^']+)'/);
ok('lleva el filtro que blanquea el papel', !!mDef && /grayscale\(1\)/.test(mDef[1]) && /brightness\(/.test(mDef[1]) && /contrast\(/.test(mDef[1]));
ok('y multiply para que el blanco desaparezca contra la hoja', !!mDef && /mix-blend-mode:\s*multiply/.test(mDef[1]));

console.log('\n— aplicada en los CINCO documentos —');
const usos = (html.match(/\$\{_FIRMA_TINTA\}/g) || []).length;
/* v1238 (Antonio): la firma salió de la hoja del pedido (vive en verificar.html) —
   quedan CUATRO interpolaciones: OC ×2, recibo, acuse. */
ok('cuatro firmas la interpolan (OC ×2, recibo, acuse)', usos === 4);
ok('v1238: la solicitud ya no interpola la firma del solicitante',
  !/_miFirmaImg\(pd\.solicitanteUsername\)[\s\S]{0,220}\$\{_FIRMA_TINTA\}/.test(html));
ok('las dos firmas de la OC', /_miFirmaImg\(oc\.generadoPorUsername\)[\s\S]{0,260}\$\{_FIRMA_TINTA\}/.test(html)
  && /_firmaUsernameAutoriza\(oc\)[\s\S]{0,300}\$\{_FIRMA_TINTA\}/.test(html));
/* v1160: los src ahora pasan por _firmaTintaSrc(...) — el filtro CSS sigue en el style
   como FALLBACK mientras la binarización corre. La propiedad v1154 se conserva. */
ok('la del recibo de recepción', /src="\$\{_firmaTintaSrc\(firma\)\}"[\s\S]{0,140}\$\{_FIRMA_TINTA\}/.test(html));
ok('la del receptor del acuse', /src="\$\{_firmaTintaSrc\(firmaUrl\)\}"[\s\S]{0,160}\$\{_FIRMA_TINTA\}/.test(html));

console.log('\n— lo que no cambia —');
ok('el fallback de firma en letra script sigue (quien no registró firma)', /firma-script/.test(html));
ok('el PDF de toma de inventario queda anotado (jsPDF no toma CSS)', /cerradoFirma/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
