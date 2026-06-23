# Asistente IA "Preguntá a Punto Rojo" — despliegue (v806)

Un botón flotante **"Preguntá"** (abajo a la izquierda) abre un chat donde cualquier
usuario pregunta en palabras sobre el **proyecto activo**. La app arma una **foto
resumida y filtrada por permiso** y la guarda en Firestore; la Cloud Function
**`onAiQuestion`** le pregunta a **Claude (Haiku)** y escribe la respuesta de vuelta.
**Solo lee — no ejecuta acciones.**

> **Por qué por Firestore y no por un endpoint web:** la organización tiene activada la
> política "Domain restricted sharing" que **prohíbe funciones públicas** (`allUsers`).
> Por eso la IA NO usa un endpoint público: el cliente escribe la pregunta en la
> colección `aiQuestions` y la función (disparada por Firestore, sin necesidad de ser
> pública) responde en el mismo documento. Mismo mecanismo que el push.

## Lo que tenés que hacer vos (una sola vez)

### 1. API key de Anthropic
**console.anthropic.com → API Keys → Create Key**. Necesitás saldo/billing en esa cuenta.

### 2. Guardar la key + desplegar
```
cd functions
npm install @anthropic-ai/sdk
cd ..
firebase functions:secrets:set ANTHROPIC_API_KEY   (pegá tu key sk-ant-...)
firebase deploy --only functions
```
Si el deploy pregunta **"Would you like to proceed with deletion?"** respondé **N (No)**
para no borrar funciones que se mantienen (`deleteAuthOnUserDoc`, y la vieja `askAI` si
quedó). El deploy crea/actualiza `onAiQuestion` y `onNotifyByPerm`.

### 3. Reglas de Firestore (Firebase Console → Firestore → Rules)
Agregá estos dos bloques dentro de `match /databases/{database}/documents { ... }` y **Publish**:
```
match /aiQuestions/{id} {
  allow create: if request.auth != null;
  allow read:   if request.auth != null && resource.data.uid == request.auth.uid;
  allow update, delete: if false;
}
match /notifyByPerm/{id} {
  allow create: if request.auth != null;
  allow read, update, delete: if false;
}
```
(El segundo bloque es para el push en tiempo real.)

> **YA NO hace falta** el paso de Cloud Run / `allUsers` — al no ser pública, la política
> de organización deja de bloquearla.

## Probar
1. Recargá la app (v806). Vas a ver el botón **"Preguntá"** abajo a la izquierda.
2. Preguntá algo del proyecto activo, p. ej.: *"¿a quién le pagué el apto 5 de la torre B
   en la etapa 3 y cuándo?"*.
3. Si dice **"todavía no está configurado"** → faltó la key o el deploy.
   Si dice **"tardando demasiado"** o **"no pude responder"** → revisá **Cloud Functions →
   Logs → `onAiQuestion`** (y que la cuenta de Anthropic tenga saldo).

## Notas técnicas
- Cliente: `_aiBuildContext(p, can, extras)` (pura, filtra por permiso) + `_aiAsk()`
  (escribe en `aiQuestions` y escucha la respuesta por `onSnapshot`, timeout 45s) + UI
  inyectada (`_aiInjectUI`).
- Backend: `exports.onAiQuestion` (trigger `onDocumentCreated` en `aiQuestions/{id}`),
  modelo `claude-haiku-4-5`, secreto `ANTHROPIC_API_KEY`.
- La foto incluye estructura, **pagos** y **anticipos** (la asistencia de hoy queda para v1.1).
