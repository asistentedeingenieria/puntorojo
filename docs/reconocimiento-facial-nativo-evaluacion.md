# Reconocimiento facial NATIVO — documento de evaluación (camino B)

> Esto es para **decidir si conviene hacerlo**, no la planificación técnica detallada (esa
> viene después, si se aprueba). Fecha: jun 2026. Estado actual: v677 (web, face-api, GPU ~150ms).

## 1. Qué problema resuelve y qué ganás

Hoy el reconocimiento corre en **JavaScript dentro del navegador del celular** (librería face-api).
Medido en el equipo real: **~150 ms por detección, usando la GPU (webgl)**. Eso ya es el **piso**
de esta librería en un celular — no se puede bajar mucho más en JavaScript.

El camino **nativo** mueve el trabajo pesado a **código nativo de Android** usando la GPU/NPU del
celular directo. Ganás:

- **Velocidad: ~30–50 ms** (el "instantáneo tipo Hikvision"). 3–4 veces más rápido.
- **Más precisión:** se usa un modelo de reconocimiento más moderno → separa mejor a personas de
  rasgos parecidos (justo el problema que tenemos con la población de la obra).
- **Funciona sin internet** (todo en el celular) — encaja con que las obras no tienen internet.

## 2. Qué significa "nativo" en concreto (arquitectura)

La app seguiría siendo la misma (web) para TODO: planillas, asistencia, reportes, geocerca, etc.
**Solo la pantalla de ESCANEAR cambia:** se reemplaza por una **pantalla de cámara nativa** que:

1. Abre la cámara nativa (rápida, fluida).
2. Detecta el rostro al instante (Google ML Kit, nativo).
3. Calcula el "código" del rostro con un modelo nativo (TensorFlow Lite, ej. MobileFaceNet).
4. Lo compara contra los registrados y **devuelve a la app quién es** (+ confianza).
5. La app web hace lo de siempre con ese dato (marca entrada/salida, geocerca, sube a la nube).

Es decir: un **"complemento" (plugin) nativo** que hace solo el reconocimiento; el resto sigue igual.

## 3. LA TRAMPA MÁS IMPORTANTE: hay que RE-REGISTRAR a todos

El modelo nativo es **distinto** al de face-api. Los "códigos" de cara guardados hoy (los de las
58+ personas) **NO sirven** con el modelo nuevo — son incompatibles. Por lo tanto:

> **Pasar a nativo obliga a re-registrar la cara de TODAS las personas.**

Lado bueno: se re-registran con el modelo nuevo (mejor) + el flujo en vivo con auto-prueba que ya
construimos → quedarían registros de mucha mejor calidad. Pero es trabajo de campo real (58+ personas).

## 4. Esfuerzo realista (honesto)

Esto **no** es como los cambios web que venimos haciendo (que se prueban con tests y se publican en
30 segundos). Es desarrollo **nativo de Android**, con varias diferencias importantes:

- Programar el plugin nativo (Kotlin: cámara CameraX + ML Kit + TensorFlow Lite + emparejado).
- Empaquetar el modelo (~5–10 MB) dentro de la app.
- Reconstruir el **AAB** y reinstalar para cada prueba (no hay "publicar en 30s"; el ciclo es lento).
- Probar en celulares reales (distintos Android, cámaras, luz).
- Re-registrar a todas las personas.

**Estimación honesta: 2 a 4 semanas** de trabajo enfocado para alguien con experiencia en Android nativo.
Yo (Claude) **puedo escribir el código**, pero con dos límites honestos:
- El ciclo es **lento** (compilar AAB + instalar + probar en celular), no los 30s del web.
- **No puedo probar el comportamiento en el dispositivo desde acá** como pruebo el web (no hay tests
  de cámara/GPU del lado mío) → más idas y vueltas con vos probando en el celular.

## 5. Opciones para hacerlo

| Opción | Qué es | Pro | Contra |
|---|---|---|---|
| **B-propio** | Plugin nativo con ML Kit + TensorFlow Lite (MobileFaceNet), gratis | Sin costo de licencia; control total | Más trabajo de programación; mantenerlo |
| **B-SDK** | SDK comercial de rostro on-device (Luxand, Regula, etc.) | Menos programación (ya hace detectar+reconocer); soporte | **Cuesta licencia** (anual/por dispositivo); igual hay que integrarlo |
| **No hacerlo** | Quedarse en v677 | Cero trabajo/costo; ya sin el cuelgue de arranque | Sigue en ~150ms (no "instantáneo") |

> Nube (AWS/Azure Face) queda **descartado**: necesita internet y las obras no tienen.

## 6. Riesgos

- **Re-registrar a todos** (trabajo de campo + coordinación).
- **Iteración lenta** (builds nativos), más demora que el web.
- **Un componente más que mantener** (el plugin nativo) en cada actualización de la app.
- Posibles diferencias entre modelos de celular (cámaras/Android distintos) → más pruebas.
- Si se elige SDK comercial: **costo recurrente** de licencia.

## 7. Costo vs beneficio — recomendación honesta

**A favor:** es el único camino al "instantáneo de verdad", y de paso mejora la precisión y sigue
funcionando sin internet. Si el reconocimiento facial es **central** para la operación y el ~0.5s
actual genuinamente molesta/frena en obra, **vale la pena**.

**En contra:** es semanas de trabajo + re-registrar a 58+ personas + un ciclo de desarrollo mucho más
lento, justo después de invertir en el flujo web. Si v677 (que ya mató el cuelgue del arranque) resulta
"suficiente" en el uso diario, quizás **no justifica** el salto todavía.

**Mi recomendación:** usar **v677 una o dos semanas en obra de verdad**. Si el ~150ms sigue siendo un
problema real (no solo un número que molesta en la pantalla), entonces sí encarar el camino nativo —
y elegir primero entre **B-propio** (gratis, más trabajo) y **B-SDK** (paga, menos trabajo) según
presupuesto. Si decidís avanzar, el siguiente paso es la **planificación técnica detallada** (tareas,
modelo exacto, plugin, re-registro) antes de tocar código.

## 8. Puntos de decisión (lo que tenés que responder para avanzar)

1. ¿El ~0.5s actual **molesta de verdad en obra**, o es soportable?
2. ¿Estás dispuesto a **re-registrar a todas las personas** (es obligatorio para nativo)?
3. Si avanzás: ¿**B-propio** (gratis, más semanas) o **B-SDK** (con costo de licencia, menos trabajo)?
4. ¿Quién lo construye: **yo** (más idas y vueltas por el ciclo lento) o **un programador Android** dedicado?
