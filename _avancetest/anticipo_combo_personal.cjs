/* v840: el combo "¿PARA QUIÉN ES EL PRÉSTAMO?" (SOLICITAR ANTICIPO) debe listar TODO el personal.
   _antColabNombres() juntaba solo colaboradoresGlobal + planilla.colaboradores; faltaba
   state.personalGlobal (el PERSONAL de asistencia). Fix: incluirlo (sin dados de baja). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0; const ok = (n, c) => c ? pass++ : (fail++, console.log('FAIL ' + n));

const m = html.indexOf('function _antColabNombres(');
let src=''; if(m>=0){ let i=html.indexOf('{',m), d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0){ src=html.slice(m,i+1); break; } } } }
ok('extraída _antColabNombres', !!src);

if (src){
  const fn = new Function('window', src + '\nreturn _antColabNombres;')({ state:{
    personalGlobal:[{nombre:'ANA PERSONAL'},{nombre:'BETO BAJA',baja:true},{nombre:'CARLOS AUGUSTO MARROQUIN SIAN'}],
    colaboradoresGlobal:[{nombre:'DANIEL COLAB'}],
    projects:[{planilla:{colaboradores:[{nombre:'ESVIN PLANILLA'}]}}]
  }});
  const list = fn();
  ok('incluye el PERSONAL global', list.indexOf('ANA PERSONAL')>=0 && list.indexOf('CARLOS AUGUSTO MARROQUIN SIAN')>=0);
  ok('sigue incluyendo colaboradores + planilla', list.indexOf('DANIEL COLAB')>=0 && list.indexOf('ESVIN PLANILLA')>=0);
  ok('excluye dados de baja del personal', list.indexOf('BETO BAJA')<0);
  ok('sin PREAPP y ordenado', list.indexOf('PREAPP')<0 && list.length===4);
}

// estructural: la fuente personalGlobal está cableada (sin baja)
ok('fuente personalGlobal en _antColabNombres', /window\.state\.personalGlobal[\s\S]{0,120}!p\.baja[\s\S]{0,40}add\(/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
