/* v923 (control de precios — decisión de Antonio): en la OC NADIE puede digitar precios.
   El precio viene ÚNICAMENTE del catálogo de precios; los cambios van por la solicitud
   de precios existente (proponer → autorizar). ÚNICA EXCEPCIÓN: postes A MEDIDA
   (it.aMedida, fabricación sin precio de catálogo) siguen digitables con su memoria v909.
   - renderOcItems: input de precio disabled salvo aMedida.
   - updateOcPrecio: guard duro (aunque alguien re-habilite el input por consola).
   - _promoverEventual: como ya no hay precio digitado, la solicitud de ALTA pregunta
     el precio propuesto además del proveedor. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. el input de precio va bloqueado salvo postes a medida ──
const srcRender = extractFn('renderOcItems');
/* v1249: la celda del precio pasó a un IIFE con gate _libre (aMedida/eventual/bodega/tras)
   + candado solo-si-protege (sin precio de catálogo ⇒ editable). El primer it.aMedida de la
   función es el BADGE del nombre (a ~4400 chars del input) — el ancla correcta es el gate.
   La propiedad v923 SE CONSERVA: con precio de catálogo, disabled + guard en updateOcPrecio. */
ok('input de precio condicionado por aMedida', /const _libre = it\.aMedida[\s\S]{0,1500}updateOcPrecio/.test(srcRender));
ok('bloqueado con disabled + aviso de catálogo', /disabled/.test(srcRender) && /catálogo de precios/i.test(srcRender));

// ── 2. guard duro en updateOcPrecio ──
const srcUpd = extractFn('updateOcPrecio');
ok('updateOcPrecio rechaza items que no son a medida', /aMedida/.test(srcUpd) && /SOLICITUD/.test(srcUpd));
if (srcUpd) {
  const env = 'var ocWorkingItems=[{aMedida:false,precio:5,qty:2},{aMedida:true,precio:0,qty:3}];'
    + 'var _toast=\'\'; function showToast(m){ _toast=m; }'
    + 'function updateOcTotal(){}'
    + 'var document={getElementById:function(){return null;}};';
  const f = new Function(env + srcUpd + '\nupdateOcPrecio(0, "9"); var a=ocWorkingItems[0].precio; var t1=_toast; updateOcPrecio(1, "9"); return { a: a, t1: t1, b: ocWorkingItems[1].precio };')();
  ok('item de catálogo: el precio NO cambia y avisa', f.a === 5 && /SOLICITUD/.test(f.t1));
  ok('poste a medida: el precio SÍ se digita', f.b === 9);
}

// ── 3. la solicitud de ALTA pregunta el precio propuesto ──
const srcProm = extractFn('_promoverEventual');
ok('_promoverEventual pide el precio propuesto', /_precioProp/.test(srcProm) && /PRECIO/.test(srcProm));
ok('la solicitud viaja con el precio propuesto (no it.precio)', /_crearSolicitudPrecio\('ALTA'[^)]*_precioProp/.test(srcProm.replace(/\n/g, ' ')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
