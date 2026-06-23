# Asistente IA "Preguntá a Punto Rojo" (v1)

**Fecha:** 2026-06-22
**Estado:** Aprobado por el user (Antonio). Listo para plan de implementación.

## Objetivo

Un asistente de IA dentro de la app al que cualquier usuario le pueda **preguntar
en palabras** sobre los datos del proyecto activo y obtener una respuesta. Ejemplos:
"¿a quién le pagué el apto 5 de la torre B en la etapa 3 y cuándo?", "¿ya llegaron
todos hoy a la obra?". **Solo lee y responde — no ejecuta acciones ni cambia datos.**

## Decisiones (brainstorming aprobado)

1. **Alcance de datos:** TODO, pero del **proyecto activo** (el seleccionado arriba).
2. **Qué hace:** **solo responde** (lectura). Sin acciones en v1.
3. **Quién lo usa:** **todos los usuarios**, pero cada uno recibe respuestas **solo
   sobre los datos que su permiso le deja ver** (filtro por permiso antes de mandar).
4. **Modelo:** Claude **Haiku** (rápido y económico) para v1.
5. **Acceso a datos:** **foto filtrada** (camino A) — la app arma un resumen de los
   datos visibles y lo manda con la pregunta. (Tool-use queda para v2 si hace falta.)

## Arquitectura

```
[Usuario escribe pregunta]
   → app (cliente) arma _aiBuildContext(): foto RESUMIDA del proyecto activo,
     filtrada por can() (solo dominios que el usuario puede ver)
   → llama a la Cloud Function callable askAI({pregunta, contexto})
   → askAI (servidor) valida auth, llama a la API de Anthropic con la API key
     (secreto del servidor), system prompt + contexto + pregunta, modelo Haiku
   → devuelve {respuesta}
   → la app muestra la respuesta en el panel de chat
```

### Componentes (3 unidades, límites claros)

1. **`_aiBuildContext()` (cliente, index.html).** Devuelve un objeto JSON compacto
   con los datos del proyecto activo que el usuario actual PUEDE ver. Cada dominio se
   incluye solo si `can(...)` lo permite:
   - **Pagos por etapa / planillas** (apto, modelo, etapa, persona, fecha, monto) →
     si `can('view.planilla')` (o permisos de planilla).
   - **Asistencia de hoy** (presentes/ausentes por obra) → si `can('view.personal')`
     / permisos de asistencia.
   - **Anticipos** (saldos por persona) → si tiene permiso de ver anticipos.
   - **Avance físico**, **materiales/OCs**, **pólizas** → cada uno tras su permiso.
   - Incluye el **nombre del proyecto** y un **mini-diccionario** de qué significa cada
     campo, para que el modelo entienda la estructura.
   - **Resumido, no volcado crudo:** agrega/recorta para no pasar un tope de tamaño
     (ver "Costo"). Es una función pura testeable (recibe state + un `can` inyectable).

2. **`askAI` (Cloud Function gen2, en `functions/`).** Callable de Firebase
   (`httpsCallable`). Recibe `{pregunta, contexto}`. Valida que el usuario esté
   autenticado. Llama a la API de Anthropic (`@anthropic-ai/sdk`) con:
   - API key desde el **secreto** `ANTHROPIC_API_KEY` (NUNCA en el cliente).
   - **system prompt**: "Sos el asistente de Punto Rojo. Respondé SOLO con los datos
     provistos en el contexto. Si el dato no está, decí claramente que no lo tenés
     (puede ser por permiso o porque no es del proyecto activo). Respondé en español,
     conciso." 
   - modelo `claude-haiku-4-5`, `max_tokens` acotado.
   Devuelve `{respuesta}`.

3. **UI de chat (index.html).** Un **botón flotante "Preguntá"** visible en toda la
   app (cerca de la campanita / esquina). Abre un panel: input de pregunta + botón
   enviar + área de respuesta, con 3-4 **ejemplos sugeridos**. Estado de carga
   mientras la función responde.

## Privacidad y costo

- **Privacidad:** la foto filtrada (solo lo que el usuario puede ver) **viaja a la API
  de Anthropic** (mismo proveedor que ya usás). No se manda data fuera del permiso.
- **Costo:** cada pregunta consume tokens. Se controla con: **modelo Haiku**, **foto
  resumida con tope de tamaño** (~30-40k tokens máx), y `max_tokens` de salida acotado.
  (Un tope por usuario/día queda para v2 si el costo crece.)

## Infra — lo que hace el user (yo escribo el código)

Yo escribo **todo el código** (`_aiBuildContext`, la Cloud Function `askAI`, la UI).
El user hace estos 3 pasos (tocan su backend/cuenta, no los puedo hacer yo):
1. Crear una **API key** en `console.anthropic.com`.
2. Guardarla como secreto: `firebase functions:secrets:set ANTHROPIC_API_KEY`.
3. Desplegar: `firebase deploy --only functions`.
**Honesto:** no puedo probar end-to-end sin la función desplegada + la key; el user
lo verifica al desplegar. El front (botón + panel) sí se prueba antes (muestra un
estado claro si la función aún no está).

## Manejo de errores

- Función no configurada / sin key → respuesta clara: "El asistente todavía no está
  configurado." (la UI lo muestra, no rompe nada).
- Sin internet → "Necesitás internet para preguntarle al asistente."
- Error de la API → "No pude responder ahora, probá de nuevo."
- Pregunta sobre datos fuera del permiso o de otro proyecto → el modelo responde
  "No tengo ese dato" (lo fuerza el system prompt) en vez de inventar.

## Testing

- **Puro (.cjs):** `_aiBuildContext(state, can)` — con un `can` falso, el contexto
  incluye/excluye los dominios correctos; respeta el tope de tamaño; sin proyecto
  activo devuelve algo vacío seguro.
- **Estructural:** existe el botón "Preguntá", el nombre de la callable `askAI`, y la
  función en `functions/index.js`.
- **Cloud Function:** prueba de armado del request (system prompt + modelo) sin pegarle
  a la API real; el end-to-end lo valida el user al desplegar.

## Fuera de alcance v1 (YAGNI)

- Ejecutar acciones (marcar pagos, etc.).
- Cruzar TODOS los proyectos en una pregunta.
- Historial persistente de conversaciones.
- Voz / streaming de la respuesta.
