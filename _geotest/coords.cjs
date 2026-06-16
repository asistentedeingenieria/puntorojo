/* TDD: parseCoordenadas(str) — el admin fija la ubicación de la obra PEGANDO coordenadas.
   Acepta DMS (14°34'56.9"N 90°31'27.3"W), decimal de Google Maps (14.582472, -90.524250)
   y "Oeste = O". Devuelve {lat,lng} en decimal o null si no es válido. PURA. */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const mP=html.match(/function parseCoordenadas\([\s\S]*?\n\}/);
const mV=html.match(/function _coordValida\([\s\S]*?\n\}/);
if(!mP){ console.log('NO parseCoordenadas FOUND'); process.exit(2); }
if(!mV){ console.log('NO _coordValida FOUND'); process.exit(2); }
const parse=new Function(mV[0]+'\n'+mP[0]+'\nreturn parseCoordenadas;')();

let pass=0, fail=0;
const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
const near=(a,b)=> a!=null && b!=null && Math.abs(a-b)<1e-4;
const LAT=14.5824722, LNG=-90.5242500; // essenza

// DMS (lo que pasó el user)
let r=parse('14°34\'56.9"N 90°31\'27.3"W');
ok('DMS essenza lat', r && near(r.lat,LAT));
ok('DMS essenza lng (W = negativo)', r && near(r.lng,LNG));
// DMS con "O" de Oeste (español)
let r2=parse('14°34\'56.9"N 90°31\'27.3"O');
ok('DMS con O (Oeste) = W', r2 && near(r2.lng,LNG));
// DMS sur/este
let r3=parse('14°34\'56.9"S 90°31\'27.3"E');
ok('DMS S = lat negativa', r3 && near(r3.lat,-LAT));
ok('DMS E = lng positiva', r3 && near(r3.lng,Math.abs(LNG)));
// DMS sin segundos
let r4=parse('14°34\'N 90°31\'W');
ok('DMS sin segundos', r4 && near(r4.lat,14+34/60) && near(r4.lng,-(90+31/60)));
// decimal Google Maps (coma + espacio)
let d1=parse('14.5824722, -90.5242500');
ok('decimal coma+espacio', d1 && near(d1.lat,LAT) && near(d1.lng,LNG));
// decimal sin espacio
let d2=parse('14.5824722,-90.5242500');
ok('decimal sin espacio', d2 && near(d2.lat,LAT) && near(d2.lng,LNG));
// decimal separado por espacio
let d3=parse('14.5824722 -90.5242500');
ok('decimal separado por espacio', d3 && near(d3.lat,LAT) && near(d3.lng,LNG));
// decimal con hemisferio
let d4=parse('14.5824722 N, 90.5242500 W');
ok('decimal con hemisferio W = negativo', d4 && near(d4.lat,LAT) && near(d4.lng,LNG));
// inválidos
ok('texto basura => null', parse('hola que tal')===null);
ok('vacío => null', parse('')===null);
ok('null => null', parse(null)===null);
ok('fuera de rango => null', parse('200, 90')===null);

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
