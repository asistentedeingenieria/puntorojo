# Plan de implementación: Resync de descuentos + dedup de pólizas

> **Para workers agénticos:** SUB-SKILL REQUERIDA: usar superpowers:executing-plans o subagent-driven-development. Pasos con checkboxes `- [ ]`.

**Goal:** Cuando cambia el catálogo de pólizas/anticipos, recalcular los descuentos de todas las planillas ABIERTAS de todos los proyectos; y que una póliza se cobre en UN solo proyecto por persona (la primera planilla abierta por fecha de envío).

**Arquitectura:** Se extrae una llave de normalización compartida y un constructor de mapa "persona→planilla dueña de la póliza". El motor existente `_v411AplicarDescuentosInline` recibe ese mapa y solo aplica la póliza en la planilla dueña. Una función `resyncDescuentosAbiertas()` recorre las planillas abiertas, recalcula, detecta entrada/salida de descuentos, persiste y notifica. Se engancha tras guardar cualquier póliza/anticipo.

**Tech stack:** HTML+JS vanilla, un solo archivo `index.html`. Sin framework de tests.

**Verificación (este proyecto NO tiene test harness):**
1. Sintaxis JS (`VERIFY-JS`, abajo).
2. Bump `CACHE_VERSION` + chip + push.
3. **Escenarios manuales** que el usuario corre en la app (cada tarea lista los suyos). Hasta que el usuario confirme el escenario, la tarea no está "terminada".

`VERIFY-JS`:
```bash
cd "/c/Users/Antonio Caravantes/Downloads/puntorojo-work" && node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=h.match(/<script[^>]*>([\s\S]*?)<\/script>/g);let i=0,errs=0;for(const blk of m){i++;const code=blk.replace(/^<script[^>]*>/,'').replace(/<\/script>$/,'');try{new Function(code)}catch(e){errs++;console.log('script #'+i+':',e.message.slice(0,140))}}console.log('errs='+errs)"
```
Criterio: `errs` no aumenta de 1 (hay 1 error preexistente en script #25).

**Estados ABIERTOS** (constante usada en todo el plan): `pendiente_pm`, `aprobada_inicial`, `pendiente_pm_final`.

---

## Task 1: Llave de normalización compartida + mapa de dueña de póliza

Base para el dedup. Funciones a nivel de módulo, insertadas **justo antes** de `function _v411AplicarDescuentosInline(pl, p){` (línea ~32997).

**Files:**
- Modify: `index.html` (insertar antes de `_v411AplicarDescuentosInline`)

- [ ] **Step 1: Insertar `_v464NormKey` y `_v464PolizaOwnerMap`**

```js
  // v465: llave de normalización compartida (misma que usa _v411 internamente)
  function _v464NormKey(s){
    return String(s||'').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim();
  }
  // v465: mapa persona(normalizada) -> planillaId DUEÑA de la póliza.
  // Dueña = planilla ABIERTA (de cualquier proyecto) con fechaEnvio más antigua
  // que incluye a esa persona. Tie-break determinístico por projectId+planillaId.
  const _V465_OPEN = { pendiente_pm:1, aprobada_inicial:1, pendiente_pm_final:1 };
  function _v464PolizaOwnerMap(){
    const _s = (typeof state !== 'undefined') ? state : window.state;
    const best = {}; // key -> { owner:planillaId, sort:composite }
    (_s && _s.projects || []).forEach(pr => {
      const pagos = (pr.planilla && pr.planilla.pagos) || [];
      (pr.planilla && pr.planilla.planillasArmadas || []).forEach(pl => {
        if (!_V465_OPEN[pl.estado]) return;
        const t = Date.parse(pl.fechaEnvio || pl.fechaCreacion || '');
        const sortNum = isFinite(t) ? t : 0;
        const composite = String(sortNum).padStart(16,'0') + '|' + String(pr.id||'') + '|' + String(pl.id||'');
        const personas = new Set();
        pagos.forEach(pg => {
          if (!Array.isArray(pl.pagosIds) || !pl.pagosIds.includes(pg.id)) return;
          const k = _v464NormKey(pg.colaborador);
          if (!k || k.replace(/[\s\-_]/g,'') === 'PREAPP') return;
          personas.add(k);
        });
        personas.forEach(k => { if (!best[k] || composite < best[k].sort) best[k] = { owner: pl.id, sort: composite }; });
      });
    });
    const owner = {};
    Object.keys(best).forEach(k => { owner[k] = best[k].owner; });
    return owner;
  }
  window._v464PolizaOwnerMap = _v464PolizaOwnerMap;
```

- [ ] **Step 2: Confirmar formato de fecha** — verificar que `nowStr()` (usado en `fechaEnvio`) sea parseable por `Date.parse`. Correr en consola del navegador: `Date.parse(nowStr())`. Si devuelve `NaN`, ajustar `_v464PolizaOwnerMap` para parsear el formato real (ej. `dd/mm/yyyy hh:mm` → reordenar antes de `Date.parse`). Documentar el resultado.

- [ ] **Step 3: `VERIFY-JS`** — esperado `errs=1`.

- [ ] **Step 4: Commit**
```bash
git add index.html && git commit -m "v465 paso 1: _v464NormKey + _v464PolizaOwnerMap (base del dedup de polizas)"
```

---

## Task 2: El motor aplica el dedup de póliza

`_v411AplicarDescuentosInline` recibe el mapa y solo aplica la póliza si esta planilla es la dueña.

**Files:**
- Modify: `index.html:32997` (firma de la función) y el bloque de pólizas (~33042-33061)

- [ ] **Step 1: Cambiar la firma y construir el mapa si no se pasa**

Reemplazar:
```js
  function _v411AplicarDescuentosInline(pl, p){
    try {
      if (!pl || !p) return { applied:0, reason:'no pl/p' };
```
por:
```js
  function _v411AplicarDescuentosInline(pl, p, polizaOwnerByPersona){
    try {
      if (!pl || !p) return { applied:0, reason:'no pl/p' };
      if (!polizaOwnerByPersona){ try { polizaOwnerByPersona = _v464PolizaOwnerMap(); } catch(e){ polizaOwnerByPersona = {}; } }
```

- [ ] **Step 2: Usar `_v464NormKey` internamente (consistencia de llaves)**

Reemplazar la línea del `_normKey` interno:
```js
      const _normKey = s => String(s||'').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[\s  ​]+/g,' ').trim();
```
por:
```js
      const _normKey = _v464NormKey; // v465: misma normalización que el owner map
```

- [ ] **Step 3: Aplicar la póliza SOLO en la planilla dueña**

Reemplazar:
```js
        if (polizas.length > 0){
```
por:
```js
        const _esDuenaPoliza = (polizaOwnerByPersona[c.key] === pl.id) || !polizaOwnerByPersona[c.key];
        if (polizas.length > 0 && _esDuenaPoliza){
```
(El `|| !polizaOwnerByPersona[c.key]` es red de seguridad: si por algún motivo no hay dueña registrada para esa persona —ej. planilla cerrada que no entró al mapa— se aplica igual, para no perder la póliza.)

- [ ] **Step 4: `VERIFY-JS`** — esperado `errs=1`.

- [ ] **Step 5: Commit**
```bash
git add index.html && git commit -m "v465 paso 2: _v411 aplica poliza solo en la planilla duena (dedup)"
```

---

## Task 3: `resyncDescuentosAbiertas()` con detección entra/sale + notificación

**Files:**
- Modify: `index.html` (insertar después de `window._v411AplicarDescuentosInline = _v411AplicarDescuentosInline;`, línea ~33101)

- [ ] **Step 1: Insertar la función orquestadora**

```js
  // v465: re-sincroniza los descuentos de TODAS las planillas ABIERTAS contra el
  // catálogo actual. Notifica a la gerente solo cuando ENTRA o SALE un descuento.
  window.resyncDescuentosAbiertas = function(){
    try {
      const _s = (typeof state !== 'undefined') ? state : window.state;
      if (!_s || !Array.isArray(_s.projects)) return;
      const ownerMap = _v464PolizaOwnerMap();
      const descKey = d => String(d.subtipo||'') + '|' + _v464NormKey(d.colaboradorNombre) + '|' + (d.anticipoId || (Array.isArray(d.polizaIds) ? d.polizaIds.slice().sort().join(',') : ''));
      let dirtyCount = 0;
      _s.projects.forEach(pr => {
        (pr.planilla && pr.planilla.planillasArmadas || []).forEach(pl => {
          if (!_V465_OPEN[pl.estado]) return;
          const autoBefore = (pl.descuentosPlanilla||[]).filter(d => d.autoAplicado);
          const beforeJSON = JSON.stringify(autoBefore.map(d => [descKey(d), d.monto]).sort());
          const beforeKeys = new Set(autoBefore.map(descKey));
          _v411AplicarDescuentosInline(pl, pr, ownerMap);
          const autoAfter = (pl.descuentosPlanilla||[]).filter(d => d.autoAplicado);
          const afterJSON = JSON.stringify(autoAfter.map(d => [descKey(d), d.monto]).sort());
          const afterKeys = new Set(autoAfter.map(descKey));
          if (beforeJSON === afterJSON) return; // nada cambió (ni monto)
          dirtyCount++;
          pl._resyncTs = Date.now();
          // ¿entró o salió un descuento? (diferencia de conjuntos de llaves)
          let entraSale = beforeKeys.size !== afterKeys.size;
          if (!entraSale){ afterKeys.forEach(k => { if (!beforeKeys.has(k)) entraSale = true; }); }
          if (!entraSale){ beforeKeys.forEach(k => { if (!afterKeys.has(k)) entraSale = true; }); }
          if (entraSale){
            try {
              if (typeof window.prAddNotif === 'function'){
                window.prAddNotif({
                  toPerms: ['planilla.authorize'],
                  title: 'DESCUENTOS ACTUALIZADOS',
                  body: (typeof _planillaTituloUpper === 'function' ? _planillaTituloUpper(pl) : ('PLANILLA '+(pl.numero||''))) + ' · cambió el catálogo de pólizas/anticipos.',
                  type: 'planilla.descuentos-resync'
                });
              }
            } catch(e){ console.warn('[v465] notif resync:', e); }
          }
        });
      });
      if (dirtyCount > 0){
        try { if (typeof saveState === 'function') saveState(); } catch(e){}
        try { if (typeof CloudSync !== 'undefined' && CloudSync.forceUploadNow) CloudSync.forceUploadNow().catch(()=>{}); } catch(e){}
        try { if (typeof renderPlanilla === 'function') renderPlanilla(); } catch(e){}
        try { showT('PLANILLAS ABIERTAS ACTUALIZADAS: '+dirtyCount, 'green'); } catch(e){}
      }
    } catch(e){ console.error('resyncDescuentosAbiertas:', e); }
  };
```

- [ ] **Step 2: `VERIFY-JS`** — esperado `errs=1`.

- [ ] **Step 3: Commit**
```bash
git add index.html && git commit -m "v465 paso 3: resyncDescuentosAbiertas con deteccion entra/sale + notif"
```

---

## Task 4: Enganchar el resync en los 8 puntos de guardado del catálogo

Después de cada `saveState()` de póliza/anticipo, llamar al resync.

**Files:**
- Modify: `index.html` — funciones: `agregarAnticipo` (~36649), `editarAnticipo` (~36658), `eliminarAnticipo` (~36720), `_guardarDesdeCaptura` (guardar póliza, usado por agregar+editar), `darDeBajaPoliza` (~37295), `reactivarPoliza` (~37315), `eliminarPoliza` (~37269).

- [ ] **Step 1: Localizar cada `saveState()` dentro de esas 7 funciones**

Para CADA una, inmediatamente DESPUÉS de su `saveState()` (y antes del `showT`/cierre), insertar:
```js
    try { if (window.resyncDescuentosAbiertas) window.resyncDescuentosAbiertas(); } catch(e){ console.warn('[v465] resync hook:', e); }
```
Nota: `_guardarDesdeCaptura` cubre agregar Y editar póliza (ambos lo llaman), así que con engancharlo ahí se cubren los dos. Confirmar leyendo cada función que el `saveState()` existe; si una usa `CloudSync.forceUploadNow` en vez de `saveState`, poner el hook después de esa.

- [ ] **Step 2: `VERIFY-JS`** — esperado `errs=1`.

- [ ] **Step 3: Bump versión**

`sw.js`: `CACHE_VERSION = 'v465-resync-descuentos-abiertas-y-dedup-polizas'`
`index.html`: chip `v464` → `v465`.

- [ ] **Step 4: Commit + push**
```bash
git add index.html sw.js && git commit -m "v465 paso 4: hooks de resync en guardar/editar/eliminar/baja poliza y anticipo + bump" && git push origin main
```

- [ ] **Step 5: CHECKPOINT escenario manual (usuario)**
  - Escenario A (resync): con una planilla en `pendiente_pm` que tiene la póliza de Juan, dar de baja la póliza de Juan en el catálogo → la planilla abierta deja de mostrar esa póliza y llega notificación a la gerente.
  - Escenario B (no notif por monto): cambiar el monto default de póliza → la planilla actualiza el monto pero NO llega notificación.
  - Escenario C (cerrada intacta): repetir con una planilla `archivada` → NO cambia.

---

## Task 5: Dedup también al ENVIAR una planilla nueva

Para que la 2.ª planilla de la persona no nazca con la póliza duplicada.

**Files:**
- Modify: `index.html:33165` (dentro de `_v226Enviar`)

- [ ] **Step 1: Pasar el owner map al motor en el envío**

Reemplazar:
```js
      const r412 = _v411AplicarDescuentosInline(planilla, p);
```
por:
```js
      const r412 = _v411AplicarDescuentosInline(planilla, p, _v464PolizaOwnerMap());
```
(La planilla nueva ya fue pusheada a `planillasArmadas` en la línea ~33154, así que entra en el mapa. Si es la 2.ª de la persona y tiene fechaEnvio más nueva, la 1.ª es dueña → esta salta la póliza.)

- [ ] **Step 2: `VERIFY-JS`** — esperado `errs=1`.

- [ ] **Step 3: Bump versión** — `v466-dedup-poliza-al-enviar-planilla-nueva` + chip.

- [ ] **Step 4: Commit + push**
```bash
git add index.html sw.js && git commit -m "v466 dedup de poliza al enviar planilla nueva (owner map)" && git push origin main
```

- [ ] **Step 5: CHECKPOINT escenario manual (usuario)**
  - Escenario D (dedup envío): una persona con planilla abierta en Proyecto A (que ya tiene su póliza). Armar y enviar una planilla en Proyecto B con la misma persona → la planilla de B NO incluye la póliza (solo A la tiene). Verificar en ambas.

---

## Self-review (cobertura vs spec)

| Requisito del spec | Tarea |
|---|---|
| Resync recorre planillas ABIERTAS de todos los proyectos | Task 3 (`_V465_OPEN` + loop) |
| Dispara al guardar catálogo (póliza/anticipo: alta/edición/baja) | Task 4 (7 hooks) |
| Dedup póliza: primera planilla por `fechaEnvio` | Task 1 (`_v464PolizaOwnerMap`) + Task 2 (gate) |
| Dedup también al enviar planilla nueva | Task 5 |
| El catálogo manda (recompute completo, ignora quites manuales) | Task 2 (`_v411` ya filtra `!autoAplicado` y reconstruye) |
| Notificar SOLO cuando entra/sale un descuento | Task 3 (set diff `beforeKeys`/`afterKeys`) |
| No tocar cerradas/pagadas | Task 3 (`_V465_OPEN` excluye aprobada/archivada/rechazada) |
| Pólizas siempre forzadas (no se respeta quite manual) | Task 2 (`_v411` re-aplica pólizas siempre, `bloqueado:true`) |

**Consistencia de tipos:** `_v464NormKey` se usa en Task 1, 2 (vía `_normKey = _v464NormKey`) y 3 (`descKey`) — misma normalización en todos lados, así las llaves del owner map calzan con `c.key` del motor. `_V465_OPEN` es la misma constante en Task 1 y 3.

**Nota de granularidad:** el código es concreto y completo. Los únicos pasos de "localizar" (Task 4 Step 1) son porque hay 7 funciones con el mismo patrón (insertar el hook tras `saveState`); el snippet a insertar es idéntico y está dado completo.
