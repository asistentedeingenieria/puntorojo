/* v1312 · CASO MODELO I EN 0 (Antonio, 28-ago): tecleó los costos por etapa del modelo I
   (MODELOS Y COSTOS) y hoy están en 0 salvo la etapa 2 — los aptos I salen "SIN MONTO".
   CAUSA (SEXTA mordida del patrón LWW, familia v953/v972/v1039/v1064/v1070):
   `planilla.modelos` no llevaba _ts, no estaba en NINGÚN union-merge (snapshot entrante
   pisaba el array entero) y el editor guardaba solo con debounce, sin forzar subida.
   Solo sobrevivió el valor que ya había llegado a la nube (374.7).
   FIX: (a) updatePlanillaModeloCosto sella m._ts y FUERZA subida (es plata);
   (b) addPlanillaModelo nace con _ts; (c) _mergePlanillaProyecto une modelos por KEY,
   gana el _ts mayor, lo local-nuevo no se pierde. No hay borrado de modelos en la UI
   ⇒ sin lápidas. aptoModelMap/etapas quedan anotados como pendiente (mismo hoyo, menos
   tráfico). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* 1) setter blindado */
/* hay defs repetidas por parches IIFE — manda la ÚLTIMA (patrón "5 defs de pagarEtapaPlanilla") */
const set = html.slice(html.lastIndexOf('window.updatePlanillaModeloCosto = function'), html.lastIndexOf('window.addPlanillaModelo=async function'));
ok('setter sella m._ts', set.includes('m._ts = Date.now()') || set.includes('m._ts=Date.now()'));
ok('setter fuerza subida (plata)', set.includes('CloudSync.forceUploadNow()'));
ok('sin tope hardcodeado idx<5', !set.includes('idx<5') && set.includes('m.costos.length'));

/* 2) el modelo nace sellado */
ok('addPlanillaModelo crea con _ts', /modelos\.push\(\{key:'MOD_'\+uid\(\),nombre:name,costos:\[0,0,0,0,0\],_ts:Date\.now\(\)\}\)/.test(html));

/* 3) merge por key con _ts — funcional, con las funciones REALES extraídas */
const sMerge = (html.match(/function _mergePlanillaProyecto\(lp, rp\)\{[\s\S]*?\n\}/) || [])[0];
const sById = (html.match(/function _mergeById\(localList, remoteList, tombSet\)\{[\s\S]*?\n\}/) || (html.match(/function _mergeById\([^)]*\)\{[\s\S]*?\n\}/) || []))[0];
ok('funciones extraídas', !!sMerge && !!sById);
if (sMerge && sById) {
  const merge = new Function(sById + '\n' + sMerge + '\n return _mergePlanillaProyecto;')();
  const lp = { planilla: { modelos: [
    { key: 'MOD_I', nombre: 'I', costos: [1243.31, 374.7, 314.9, 500.19, 0], _ts: 2000 },
    { key: 'MOD_NUEVO', nombre: 'Z', costos: [1,2,3,4,5], _ts: 1500 } ] } };
  const rp = { planilla: { modelos: [
    { key: 'MOD_I', nombre: 'I', costos: [0, 374.7, 0, 0, 0] },
    { key: 'MOD_K', nombre: 'K', costos: [9,9,9,9,9], _ts: 900 } ] } };
  const changed = merge(lp, rp);
  const I = (rp.planilla.modelos || []).find(m => m.key === 'MOD_I');
  const K = (rp.planilla.modelos || []).find(m => m.key === 'MOD_K');
  const Z = (rp.planilla.modelos || []).find(m => m.key === 'MOD_NUEVO');
  ok('lo tecleado local (con _ts) le gana al remoto sin sello', I && I.costos[0] === 1243.31 && I.costos[3] === 500.19);
  ok('el modelo remoto sin rival local queda intacto', K && K.costos[0] === 9);
  ok('modelo local que la nube no conocía se agrega', Z && Z.costos[4] === 5);
  ok('marca changed para re-subir', changed === true);
  /* el remoto MÁS nuevo gana al local viejo */
  const lp2 = { planilla: { modelos: [ { key: 'MOD_I', nombre: 'I', costos: [1,1,1,1,1], _ts: 100 } ] } };
  const rp2 = { planilla: { modelos: [ { key: 'MOD_I', nombre: 'I', costos: [7,7,7,7,7], _ts: 500 } ] } };
  merge(lp2, rp2);
  ok('remoto más nuevo gana', rp2.planilla.modelos[0].costos[0] === 7);
  /* sin modelos locales: no toca nada */
  const rp3 = { planilla: { modelos: [ { key: 'A', nombre: 'A', costos: [1] } ] } };
  merge({ planilla: {} }, rp3);
  ok('sin modelos locales no estorba', rp3.planilla.modelos.length === 1);
} else { fail += 6; }

/* 4) cambio de sync ⇒ ritual v892 (piso) */
const m = html.match(/APP_SYNC_VERSION = (\d+)/);
ok('APP_SYNC_VERSION >= 948', m && Number(m[1]) >= 948);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
