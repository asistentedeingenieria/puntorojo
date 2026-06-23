# Asistente IA "Preguntá a Punto Rojo" — despliegue (v801)

Un botón flotante **"Preguntá"** (abajo a la izquierda) abre un chat donde cualquier
usuario pregunta en palabras sobre el **proyecto activo**. La app arma una **foto
resumida y filtrada por permiso** (cada quien solo ve lo que su permiso le permite) y
la manda a una Cloud Function que le pregunta a **Claude (Haiku)**. **Solo lee — no
ejecuta acciones.**

> El front (botón + panel) ya funciona desde el deploy de Netlify. Mientras NO
> despliegues la función + la API key, el panel muestra "El asistente todavía no está
> configurado." No rompe nada.

## Lo que tenés que hacer vos (una sola vez)

### 1. API key de Anthropic
Entrá a **console.anthropic.com → API Keys → Create Key**. Copiá la key (empieza con
`sk-ant-...`). Necesitás saldo/billing en esa cuenta.

### 2. Instalar el SDK + guardar la key + desplegar
Desde la carpeta del repo:

```
cd functions
npm install @anthropic-ai/sdk
cd ..
firebase functions:secrets:set ANTHROPIC_API_KEY
# (pega la key cuando lo pida)
firebase deploy --only functions
```

### 3. Hacer pública la función `askAI` (igual que getReceptorAcuses)
La función es un endpoint HTTP. Después del deploy, en **Google Cloud Console → Cloud
Run → askAI → Security**, agregá el principal **`allUsers`** con el rol **`Cloud Run
Invoker`**. (Esto es lo mismo que ya hiciste con `getReceptorAcuses`; la cuenta
corporativa no deja setearlo desde `firebase deploy`.)

## Probar
1. Recargá la app (tomá v801). Vas a ver el botón **"Preguntá"** abajo a la izquierda.
2. Abrilo y preguntá algo del proyecto activo, p. ej.:
   - "¿A quién le pagué el apto 5 de la torre B en la etapa 3 y cuándo?"
   - "¿Quiénes tienen saldo de anticipo pendiente?"
3. Si dice "todavía no está configurado" → faltó el deploy o la key.
   Si dice "No pude responder" → revisá **Cloud Functions → Logs → askAI**.

## Qué ve el modelo (privacidad)
- Solo la **foto del proyecto activo filtrada por TU permiso** (pagos solo si tenés
  `view.planilla`, etc.). Nada fuera de tu permiso viaja a la API.
- La foto incluye: estructura (torres/niveles/aptos), **pagos** (persona, ubicación,
  etapa, monto, fecha) y **anticipos** (saldo por persona). La **asistencia de hoy**
  queda para una próxima versión (v1.1).
- Costo: modelo **Haiku** (barato), foto con tope de tamaño, respuesta acotada.

## Notas técnicas
- Cliente: `_aiBuildContext(p, can, extras)` (pura, filtra por permiso) + `_aiAsk()`
  (manda idToken + contexto al endpoint) + UI inyectada (`_aiInjectUI`).
- Backend: `exports.askAI` en `functions/index.js` (verifica el idToken de Firebase,
  llama a Anthropic con system prompt estricto: "respondé solo con el contexto").
- Si `npm install @anthropic-ai/sdk` trae una versión que rompe, fijá una reciente:
  `npm install @anthropic-ai/sdk@latest`.
