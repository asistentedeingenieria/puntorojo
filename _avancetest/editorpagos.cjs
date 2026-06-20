/* v769: las acciones del editor de planilla rechazada que abren un MODAL (await/then) y
   LUEGO escriben en p/pl DEBEN re-leer _activeProj()+pl del state ACTUAL despues del modal.
   Si no, un applyRemote durante el modal reasigna state y deja la referencia vieja huerfana:
   el push/filter cae en un objeto desconectado, saveState guarda el state vivo SIN el cambio
   y el toast dice "AGREGADO" aunque NO persistio. Ademas deben forzar la subida (forceUploadNow). */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

function extract(nombre){
  const m=html.match(new RegExp('window\\.'+nombre+'\\s*=\\s*(?:async )?function[\\s\\S]*?\\n  \\};'));
  return m?m[0]:'';
}

['_v289QuitarPago','_v289AgregarPagosDisponibles','_v328GenerarPagoNuevoYAgregar'].forEach(nombre=>{
  const body=extract(nombre);
  ok(nombre+' existe', !!body);
  const i=body.indexOf('prConfirm');
  ok(nombre+' usa prConfirm (gap async)', i>=0);
  const after=i>=0?body.slice(i):'';
  ok(nombre+' re-lee _activeProj() DESPUES del modal', after.indexOf('_activeProj(')>=0);
  ok(nombre+' re-lee la planilla (planillasArmadas.find) DESPUES del modal', /planillasArmadas[\s\S]*?\.find/.test(after));
  ok(nombre+' fuerza subida (forceUploadNow)', /forceUploadNow/.test(body));
});

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
