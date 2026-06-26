# AUDITORÍA DE SEGURIDAD — CLOUD FUNCTIONS PUNTO ROJO
(jun 2026 · auditoría adversarial multiagente, 30 hallazgos crudos → 8 consolidados)

Archivo auditado: `functions/index.js` (637 líneas) + `functions-auth/index.js`. Severidad = la
ajustada adversarialmente por un 2º agente verificador. Contexto: las Firestore/Storage Rules ya se
endurecieron (appState/aiQuestions/notifyByPerm create = hasAnyPerm). App Check en MONITOR (no bloquea).

## Tabla por severidad

| # | Sev | Hallazgo | Función | Precondición | Impacto |
|---|---|---|---|---|---|
| C1 | CRÍTICO | Fan-out sin límites: `toPerms:['*']` + `users.get()` no acotado + `Promise.all` sin concurrencia + sin caps → DoS de Firestore para TODA la app | `onNotifyByPerm` | Interno con hasAnyPerm escribe varios docs | Decenas de miles de ops en segundos → cuota agotada → no se guardan planillas/asistencia/pagos |
| A1 | ALTO | Triggers no validan autoría/permiso del creador → phishing/spam/suplantación a admins (push+email) | `onNotifyByPerm`, `onExcepcionPagoCreada` | Interno con hasAnyPerm | Notificación/email "del sistema" a admins; ingeniería social; sin rastro de origen |
| A2 | ALTO | `getReceptorAcuses` itera TODOS los `state.projects` ignorando `assignedProjectIds`/`isMaster` | `getReceptorAcuses` | Token+secret de cualquier receptor | Un receptor ve estructura de obra de proyectos que NO le tocan (proyectos=clientes, torres, aptos, supervisores) |
| A3 | ALTO | Endpoint público: auth por token+secret en body, secret en CLARO en Firestore, sin rate limit, sin expiración; secret viaja en la URL del QR | `getReceptorAcuses` | Token+secret filtrado (foto del QR, link) | Acceso ilimitado a acuses; sin rotación; fuerza bruta de costo viable |
| A4 | ALTO | `onAiQuestion` sin rate limit por uid → abuso de costo de la API Anthropic | `onAiQuestion` | Interno con hasAnyPerm crea muchos docs | Quema la API key; cuota agotada deja sin IA a los legítimos |
| M1 | MEDIO | Email de excepción: escape HTML parcial (`razon`/`notaDecision`), sin tope de longitud, `supervisorEmail`/`adminEmails` del doc (cliente) en vez de derivados del servidor | `onExcepcionPago*` | Interno que solicita excepción | Tracking CSS vía `background:url()`; timeout con razón gigante; redirección de avisos a email externo |
| M2 | MEDIO | `onAiQuestion` filtra diagnóstico (`_diag` status/`e.message`) al cliente | `onAiQuestion` | Usuario que dispara error de IA | Fuga de estado operativo de la API (429), facilita A4 |
| M3 | MEDIO | `getReceptorAcuses` devuelve `e.message` crudo en el 500 | `getReceptorAcuses` | Credenciales válidas + provocar error | Mapeo de estructura Firestore |
| B1 | BAJO | `uid` de `aiQuestions` no validado contra el creador (se lee del doc) | `onAiQuestion` | Interno que conoce otro uid | Atribución falsa / evasión futura de límite por uid |
| B2 | BAJO | Backend confía en el `contexto` que arma el cliente | `onAiQuestion` | Cliente con DevTools | Bajo (el atacante ya tiene local lo que envía); riesgo real = costo (cubierto por A4) |

## Orden de implementación

**Fase 0 — Reglas (consola, mitigación inmediata sin deploy):**
1. `notifyByPerm`: hasAnyPerm + caps de tamaño + prohibir `'*'` + `createdByUid==auth.uid` → tapa C1 + entrada de A1.
2. `excepcionesPago`: `createdByUid==auth.uid` + permiso emisor → entrada de A1/M1.
3. `aiQuestions`: `uid==auth.uid` → B1 (blinda A4).

**Fase 1 — Backend (un deploy de functions):** C1 concurrencia+caps · A1 `creatorHasPerm()`+auditoría · A2 filtro por `assignedProjectIds` · A4 rate limit.

**Fase 2 — Endpoint receptor (A3) + saneo input (M1):** rate limit in-memory + expiración/revocación; escape HTML completo + longitudes + emails derivados del servidor.

**Fase 3 — Fugas (M2/M3) + defensa en profundidad (B2).**

Cada cambio de `functions/index.js` lleva su test `.cjs` (TDD) + `firebase deploy --only functions`.
Los cambios de reglas se pegan en consola.

## Notas
- Los 5 hallazgos de `getReceptorAcuses` → A2 (autz por proyecto) + A3 (auth/rate/secret) + M3 (fuga).
- Los ~6 de `onNotifyByPerm` → C1 (DoS/caps) + A1 (autoría/phishing).
- La "exposición de ANTHROPIC_API_KEY por logging" se descartó: la key NO aparece en `e.message`; el riesgo real es la fuga de `_diag` (M2).
- A VERIFICAR al implementar: que el objeto receptor realmente tenga `assignedProjectIds`/`isMaster`; las líneas exactas (desfase pequeño); que la regla viva de notifyByPerm ya sea hasAnyPerm.
