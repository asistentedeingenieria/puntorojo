# functions-auth — codebase SEPARADO (gen1)

Respaldo en la nube del código de la función **`deleteAuthOnUserDoc`**, que antes
vivía SOLO en `Downloads/puntorojo-functions` (fuera de git). Se subió al repo el
2026-06-21 para que no quede atrapada en una sola PC.

## Qué hace

- **`deleteAuthOnUserDoc`** (Firestore `onDelete` en `users/{uid}`, Cloud Functions
  **gen1** / `firebase-functions/v1`): al borrar un usuario en la app, borra también
  su cuenta de Firebase Authentication y limpia sus subcolecciones (notifs/tokens).

## ⚠️ NO es el mismo codebase que `../functions`

- `../functions` = codebase `default` (gen2): `onNotificationCreated` (push),
  `getReceptorAcuses`, `onExcepcionPago*`. Es el que despliega `firebase.json`.
- `functions-auth` = esta función gen1, que se desplegaba aparte desde la vieja
  carpeta suelta. **`firebase.json` NO la referencia todavía**, así que un
  `firebase deploy --only functions` desde la raíz NO la toca (ni la borra ni la
  redepliega). Su deploy sigue siendo independiente.

## Pendiente (hacer con cuidado, requiere probar un deploy)

Unificar ambos en `firebase.json` como dos codebases con nombres distintos (p. ej.
`default` y `authtrigger`) para desplegar todo con un comando sin que se borren
entre sí. No se hizo aún porque cambia el deploy y hay que verificarlo en vivo.

Ver `LEEME.txt` para los pasos de deploy manual actuales.
