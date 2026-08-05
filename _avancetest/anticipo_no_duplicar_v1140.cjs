/* v1140 — LA MISMA SOLICITUD DE ANTICIPO NO SE PUEDE MANDAR DOS VECES

   Antonio, 4-ago: "aquí en solicitudes de anticipos tenemos varias veces la misma solicitud.
   Debe de ser solo una solicitud y NO se deben de repetir." Eran TRES copias idénticas de la
   misma (Martín Ortiz · botas de seguridad · pidió Claudia Muñoz).

   POR QUÉ PASÓ: con el canal de escritura saturado (el doc de asistencia de 770 KB), la subida
   quedaba colgada y la persona no veía confirmación. Volvía a mandar. Cada intento crea un
   registro con id propio, así que el union-merge los conserva TODOS. v1139 atacó la causa —el
   candado se libera solo—, pero eso no impide que alguien toque el botón dos veces por
   impaciencia o por un doble toque en un celular.

   EL CANDADO: si ya existe una solicitud VIVA del mismo colaborador con la misma descripción,
   no se crea otra y se avisa que ya está. No es por tiempo: una solicitud repetida a los diez
   minutos es tan duplicada como una a los diez segundos.

   LO QUE NO BLOQUEA: una solicitud del mismo colaborador con OTRA descripción (dos pares de
   botas distintos son dos solicitudes legítimas), y una repetida después de que la anterior se
   canceló o se entregó (ahí sí se está pidiendo de nuevo, a propósito). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const z = ex(code, 'function _antSolicYaExiste(');
ok('existe el detector de solicitud repetida', z.length > 120);
ok('es PURA (recibe la lista, no la busca)', /function _antSolicYaExiste\(lista/.test(z) && !/state\./.test(z));

let f = null;
try { f = new Function(z + '\nreturn _antSolicYaExiste;')(); } catch(e){ console.log('   (no compiló: '+e.message+')'); }

if (f) {
  const S = (colab, desc, estado) => ({ colaboradorNombre:colab, descripcion:desc, estado:estado||'pendiente_cotizacion' });
  const BOTAS = '1 PAR DE BOTAS DE SEGURIDAD SAFETY #1 COUNTRY S3, TALLA 40';
  const lista = [ S('MARTIN ORTIZ SOL', BOTAS) ];

  console.log('\n— el caso de Antonio —');
  ok('detecta la repetida', f(lista, 'MARTIN ORTIZ SOL', BOTAS) === true);
  ok('no le importan mayúsculas ni espacios de más',
    f(lista, '  martin ortiz sol ', '  1 par de botas de seguridad safety #1 country s3,  talla 40 ') === true);

  console.log('\n— lo que SÍ debe dejar pasar —');
  ok('otra descripción del mismo colaborador es otra solicitud',
    f(lista, 'MARTIN ORTIZ SOL', 'GUANTES ANTI CORTE') === false);
  ok('otro colaborador con la misma descripción también', f(lista, 'OTRO SEÑOR', BOTAS) === false);
  ok('si la anterior se canceló, se puede volver a pedir',
    f([S('MARTIN ORTIZ SOL', BOTAS, 'cancelada')], 'MARTIN ORTIZ SOL', BOTAS) === false);
  ok('si la anterior ya se entregó, también',
    f([S('MARTIN ORTIZ SOL', BOTAS, 'entregada')], 'MARTIN ORTIZ SOL', BOTAS) === false);
  ok('una en curso (autorizada, sin entregar) SÍ bloquea',
    f([S('MARTIN ORTIZ SOL', BOTAS, 'autorizada')], 'MARTIN ORTIZ SOL', BOTAS) === true);

  console.log('\n— bordes —');
  ok('lista vacía no bloquea nada', f([], 'X', 'Y') === false);
  ok('null no lo tumba', f(null, 'X', 'Y') === false);
  ok('sin descripción no bloquea (no hay con qué comparar)', f(lista, 'MARTIN ORTIZ SOL', '') === false);
  ok('una solicitud basura en la lista no lo tumba', f([null, {}], 'X', 'Y') === false);
}

console.log('\n— el candado está puesto donde se crea —');
const zC = ex(code, 'window._antSolicEnviar = async function(') || code;
ok('se consulta antes de crear la solicitud',
  /_antSolicYaExiste\([\s\S]{0,200}return/.test(code));
ok('avisa que ya existe en vez de crearla en silencio', /YA HAY UNA SOLICITUD/.test(code));
ok('el aviso sale en rojo', /YA HAY UNA SOLICITUD[\s\S]{0,120}'red'/.test(code));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
