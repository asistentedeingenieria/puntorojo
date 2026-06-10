# Asistencia por reconocimiento facial (modo kiosko) — Diseño

**Fecha:** 2026-06-09
**Proyecto:** PUNTO ROJO (PWA, `puntorojo.app`)
**Estado:** Diseño aprobado en brainstorming, pendiente de revisión del usuario.

## Objetivo

Registrar la asistencia de personal de obra **escaneando caras con el celular**: la app identifica a la persona, detecta si es su **entrada** o **salida** del día y la marca con la **hora exacta**, sin que el trabajador tenga que cargar nada (la cara es el carnet).

## Decisiones tomadas (brainstorming)

| Tema | Decisión |
|---|---|
| Método | **Reconocimiento facial en el dispositivo** (face-api.js, en el navegador). No nube, no terceros. |
| Operación | **Modo kiosko**: un solo cel/tablet en la entrada; un encargado lo sostiene y la gente pasa la cara una por una. |
| Enrolamiento | **Captura dedicada**: una vez por persona, 1–3 tomas en vivo desde la app. |
| Foto de referencia | **Sí**, una **miniatura recortada auto-capturada** durante el enrolamiento (para el cuadro "confirmar candidato"). El usuario no provee nada. |
| Regla entrada/salida | 1ra marca del día = **entrada**; siguientes = **salida**, actualizando a la **última hora**. |
| Anti-suplantación | El encargado presente con el kiosko es la "prueba de vida" (ve a la persona real). Liveness técnico (parpadeo/giro) queda para una fase futura opcional. |

## Alcance

**Fase 1 (este diseño):** enrolamiento de caras + modo kiosko de escaneo + marcado de entrada/salida con hora + fallback de confirmación manual.

**Fase 2 (futuro, fuera de este spec):** reportes de horas trabajadas (entrada→salida), exportaciones, liveness técnico, afinamiento de umbrales con datos reales.

**Fuera de alcance:** marcado desde el cel propio de cada trabajador; nómina automática por horas; geocerca/GPS.

## Arquitectura y componentes

Todo vive en el archivo único `index.html` de la PWA, dentro de la sección **PERSONAL → ASISTENCIA**.

### Componentes

1. **Enrolamiento de cara** (en la ficha de persona, `_personaModalGlobal`, o un modal dedicado "REGISTRAR CARA"):
   - Abre la cámara (getUserMedia), guía a tomar 1–3 capturas de frente.
   - Por cada toma: detecta 1 cara, calcula el **descriptor** (vector de 128 floats) con face-api.js, y recorta una **miniatura** del rostro.
   - Muestra **casilla de consentimiento** (dato biométrico) que debe marcarse para guardar.
   - Sube la miniatura a Firebase Storage y guarda descriptor(es) + URL en la persona.
   - Gateado por permiso de edición de personal (admin / `personal.edit`).

2. **Modo kiosko / Escanear** (botón "ESCANEAR CARAS" en ASISTENCIA, pantalla a pantalla completa):
   - El encargado elige la **obra** una vez (proyecto de la app u "OTRA" + descripción), como en la asistencia manual actual.
   - Cámara en vivo; detección periódica (throttle ~400–600 ms).
   - Para cada cara detectada: calcula descriptor → compara contra todos los enrolados (FaceMatcher, distancia euclidiana).
   - **Confianza alta** (distancia < umbral estricto): marca automáticamente y muestra confirmación grande (foto + nombre + "ENTRADA/SALIDA · HH:MM") con sonido; **debounce** de ~5 segundos por identidad para no doble-marcar la misma cara.
   - **Confianza media** (entre umbral estricto y uno laxo, o varios candidatos cercanos): muestra **2–3 candidatos** con miniatura → el encargado toca el correcto; o "MARCAR MANUAL" (lista de personal) o "DESCARTAR".
   - **Sin match**: ofrece "MARCAR MANUAL".
   - Gateado por permiso de marcar asistencia (`personal.asistencia`).

3. **Lógica de entrada/salida** (función pura, testeable):
   - Dado `(personaId, fecha, hora)`: si no hay registro del día → marca **entrada**. Si ya hay entrada → marca/actualiza **salida** a `hora`. Idempotente para re-escaneos seguidos (debounce + "ya marcado hace X").

### Modelo de datos

Extiende los modelos globales existentes (viajan en `saveState` + `CloudSync`, como `personalGlobal`/`asistenciaGlobal`).

```js
// personalGlobal[i] — campos nuevos:
{
  // ...campos existentes (nombre, cargo, empresa, tipo, ...),
  face: {
    descriptors: number[][],   // 1–3 vectores de 128 floats (Array, serializable)
    thumbURL: string,          // miniatura de referencia (Firebase Storage)
    consent: { at: ts, by: 'uid|email' },
    enrolledAt: ts
  } | undefined
}

// asistenciaGlobal['YYYY-MM-DD'][personaId] — extendido:
{
  presente: true,
  obraId: '<projId|OTRA>',
  obraDesc: '',
  entrada: 'HH:MM' | null,
  salida:  'HH:MM' | null,
  via: 'cara' | 'manual',
  // compat: el campo `hora` existente se mapea a `entrada` en migración suave
}
```

Migración suave: registros viejos con `{presente, hora}` se leen como `entrada = hora`, `salida = null`. No se borra nada.

### Tecnología

- **face-api.js** (CDN, como las demás libs en `index.html`). Modelos: **`tinyFaceDetector`** (elegido por velocidad en celulares de gama media, suficiente para kiosko), `faceLandmark68Net`, `faceRecognitionNet`.
- **Pesos de modelos (~6 MB):** se **hospedan en el repo** (carpeta `face-models/`) y se agregan a `CORE_ASSETS` del `sw.js` para que queden **cacheados y funcionen offline**. Sin esto, el kiosko no arranca sin internet.
- **Matching:** `FaceMatcher` con distancia euclidiana. Umbrales configurables: estricto ~0.48 (auto), laxo ~0.58 (candidatos). Se afinan con uso real (Fase 2).
- **Loop de cámara:** stream + detección throttled; al marcar, se bloquea esa identidad ~5 s (debounce).
- **Offline:** detección/match son on-device; el marcado se guarda en estado local y sincroniza con Firebase cuando hay red (igual que el resto de la app).

## Permisos

- **Enrolar cara:** admin o `personal.edit` (editar lista de personal).
- **Escanear / marcar:** `personal.asistencia` (el mismo de marcar asistencia; ya tiene guardas).
- Reutiliza el permiso existente del PDF de asistencia para reportes.

## Manejo de errores / casos borde

- Cámara denegada / sin cámara → mensaje claro + caer a marcado manual.
- Modelos no cargados (sin internet en primer arranque) → aviso "conéctate una vez para descargar el reconocimiento".
- Persona sin cara enrolada → nunca hace match; se marca manual; sugerencia de enrolar.
- Dos caras en cuadro → procesa la más grande/cercana; ignora el resto hasta el próximo frame.
- Re-escaneo inmediato → debounce evita doble marca; muestra "ya marcado".
- Cambio de día → la primera marca del nuevo día es entrada otra vez.

## Privacidad y consentimiento

- Los descriptores faciales y la miniatura son **datos biométricos**: se guardan solo tras marcar **consentimiento** en el enrolamiento, registrando quién y cuándo.
- Todo se almacena en el **Firebase del usuario** (no se envía a terceros). Se puede **eliminar** la cara de una persona (borra descriptors + miniatura).

## Pruebas

- **Unitarias (puras):** lógica entrada/salida (primera=entrada, siguientes=salida-última, cambio de día, idempotencia con debounce); selección de candidatos por umbral; migración suave de `hora`→`entrada`. Se agregan a `_recetatest/tests.js`.
- **Manuales:** enrolar 2–3 personas reales, escanear, verificar marca correcta, fallback de candidatos, offline tras primer arranque.

## Expectativa realista

La precisión on-device es **buena pero no perfecta** en obra (sol, casco, polvo, caras parecidas). El fallback de "confirmar candidato" del encargado cubre los casos dudosos. Se suelta como **v1** y se afina con uso real.

## Criterios de éxito (Fase 1)

1. Se puede enrolar la cara de una persona (con consentimiento) y queda sincronizada.
2. En modo kiosko, al pasar una cara enrolada se identifica y marca **entrada** (1ra) o **salida** (siguiente) con la **hora**, mostrando confirmación.
3. Cuando hay duda, el encargado confirma entre candidatos o marca manual; nunca se queda trabado.
4. Funciona offline tras el primer arranque (modelos cacheados) y sincroniza al volver la red.
5. No rompe la asistencia manual existente ni los reportes/PDF actuales.
