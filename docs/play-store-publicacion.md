# Publicar Punto Rojo en Google Play — Instructivo

App: **Punto Rojo** · Paquete: `com.puntorojosa.puntorojo` · Carga la PWA en vivo (`puntorojo.app`).
La app YA está creada en Play Console con un AAB en **prueba interna**. Esto es lo que falta.

> **Idea clave:** el AAB es solo "la cáscara" que abre `puntorojo.app`. El contenido se actualiza
> solo (no hace falta re-subir el APK por cada cambio). Solo necesitás un AAB nuevo si cambia algo
> nativo (ícono, splash, plugins, versión de Android). Para el contenido NO.

---

## 0) Dónde está la firma (keystore) — verificá y respaldá

La firma se guarda en **dos lugares** y conviene que sepas dónde:

1. **GitHub → repo `puntorojo` → Settings → Secrets and variables → Actions.**
   Deben existir estos 4 secrets (verás solo los nombres, no los valores):
   - `ANDROID_KEYSTORE_BASE64` (el keystore en base64)
   - `ANDROID_KEYSTORE_PASSWORD`
   - `ANDROID_KEY_ALIAS`
   - `ANDROID_KEY_PASSWORD`
   Si están, el build firma solo. Como la prueba interna funcionó, ya estaban bien.

2. **El archivo del keystore + las contraseñas (RESPALDO IMPORTANTE).**
   Se generó con el workflow `generate-keystore.yml`. Para recuperarlo:
   GitHub → pestaña **Actions** → workflow **Generate keystore** → la corrida que lo creó →
   sección **Artifacts** → descargá el `keystore` + `keystore-info.txt` (tiene las contraseñas).
   **Guardá esos dos archivos en un lugar seguro** (tu disco + una copia en la nube privada).
   ⚠️ Los artifacts de Actions se borran a los ~30–90 días; si ya no está, ver el punto siguiente.

3. **¿Y si perdés el keystore?** No es catástrofe: como Play usa **Play App Signing** (Google
   guarda la llave real de firma), podés **resetear la llave de subida** desde
   Play Console → **Prueba y versiones → Integridad de la app → Firma de apps** → "Solicitar
   restablecimiento de la clave de carga". O sea: no te quedás trabado para siempre.

---

## FASE 1 — Que tu gente la use YA (prueba interna, sin revisión)

En **Play Console** (consola web), seleccioná la app **Punto Rojo**:

1. Menú izquierdo → **Prueba y versiones → Pruebas → Prueba interna**.
2. Pestaña **Verificadores (Testers)** → creá o elegí una **lista de correos** → agregá los
   **emails de Google (Gmail)** de tu gente (cada celular debe iniciar sesión en Play con ese mismo
   correo). Guardá.
3. Si todavía no hay una versión activa, en **Versiones** subí el AAB (mirá "Construir un AAB nuevo"
   abajo) o usá el que ya está. Dale **Revisar versión → Iniciar lanzamiento a prueba interna**.
4. Copiá el **enlace de aceptación** (en la pestaña Verificadores, "Copiar vínculo").
5. Pasáles ese link a tu gente. Cada uno: abre el link → "Become a tester / Aceptar" → le sale
   un botón **"Descargar en Google Play"** → instala como app normal.
6. **Offline:** la primera vez con internet (carga y cachea); de ahí en adelante funciona sin
   internet (lo maneja el service worker de la PWA). El primer login de cada celular sí necesita
   internet una vez.

**Listo: con esto ya la usan, sin esperar revisión.** Las pruebas internas no pasan por revisión de Google.

---

## FASE 2 — Pública en la tienda (producción, en paralelo)

Producción SÍ pasa revisión (la 1ª vez, días/semanas). Completá en Play Console:

### a) Ficha de Play Store (Presencia en la tienda → Ficha principal)
- **Nombre de la app:** Punto Rojo
- **Descripción corta** (máx 80): ver "Textos listos" abajo.
- **Descripción larga** (máx 4000): ver "Textos listos" abajo.
- **Ícono:** 512×512 PNG (usá el logo en alta).
- **Gráfico de funciones:** 1024×500 PNG.
- **Capturas de pantalla del teléfono:** mínimo **2** (recomendado 4–8). Sacá capturas de:
  pantalla de asistencia, escaneo de caras, KPIs, y la lista. (1080×1920 aprox.)
- **Categoría:** "Productividad" o "Empresa".

### b) Política de privacidad (Presencia → Detalles de la app)
- URL: **https://puntorojo.app/privacidad** (ya está publicada y actualizada con caras/GPS/DPI).

### c) Clasificación de contenido (cuestionario)
- App tipo "Utilidad/Productividad/Empresa". Respondé **NO** a violencia, sexo, drogas, apuestas,
  lenguaje fuerte, etc. Resultado esperado: apta para todos.

### d) Seguridad de los datos (Data safety) — respuestas dato por dato
Marcá que la app **recopila** y los datos van **cifrados en tránsito** y el usuario **puede pedir
eliminación** (sí). NINGUNO se "comparte con terceros" con fines comerciales (marcá **No compartidos**).

| Dato | ¿Se recopila? | Tipo | Propósito |
|---|---|---|---|
| Nombre | Sí | Info personal | Funcionalidad de la app |
| Email | Sí | Info personal | Gestión de cuenta / Funcionalidad |
| Teléfono | Sí (opcional) | Info personal | Funcionalidad |
| ID de gobierno (DPI) | Sí | Info personal | Funcionalidad (identificación del personal) |
| Ubicación aproximada/precisa | Sí | Ubicación | Funcionalidad de la app (geocerca de asistencia) |
| Fotos | Sí | Fotos y videos | Funcionalidad (foto de DPI / evidencia) |
| **Datos biométricos / faciales** | Sí | Info personal sensible | Funcionalidad (reconocimiento para marcar asistencia) |
| Registros de actividad/asistencia | Sí | Actividad en la app | Funcionalidad |

- "¿Se recopilan o comparten datos?" → **Sí, se recopilan**; **No se comparten**.
- "¿Cifrado en tránsito?" → **Sí** (HTTPS/Firebase).
- "¿Los usuarios pueden solicitar eliminación?" → **Sí** (vía el correo de la política).

### e) Público objetivo y contenido
- Edad objetivo: **18+** (herramienta laboral). No dirigida a niños.

### f) Acceso a la app (App access) — para el revisor
Como la app pide login, dale a Google **un usuario y clave de prueba** para que pueda entrar a
revisarla (creá un usuario "REVISOR GOOGLE" con permisos de solo lectura/asistencia y poné ahí
el usuario+clave). Si no, la rechazan por "no se pudo acceder".

### g) Crear la versión de Producción
- **Prueba y versiones → Producción → Crear versión** → subí el AAB (o **promové** el de prueba
  interna) → completá las notas → **Enviar a revisión**.

---

## Construir un AAB nuevo (solo si lo necesitás)

Solo hace falta si cambia algo NATIVO o si Play pide una versión nueva. Pasos:

1. **Subí el `versionCode`** en `android/app/build.gradle` (debe ser MAYOR al último subido; hoy
   está en `245` → poné `246`, y `versionName "1.0.245"`).
2. Hacé commit + push a `main`. El workflow **Build Android AAB** corre solo (vigila `android/**`,
   `public/**`, `capacitor.config.json`). También podés correrlo a mano: GitHub → **Actions** →
   "Build Android AAB" → **Run workflow**.
3. Cuando termine (verde), entrá a la corrida → **Artifacts** → descargá **`puntorojo-release-aab`**
   (ese es el AAB firmado para subir a Play) — o **`puntorojo-debug-apk`** para probar en un cel sin Play.
4. En Play Console, subí ese `.aab` en la pista que quieras (interna o producción).

> Yo (Claude) puedo hacer el paso 1 y 2 por vos (subir versionCode + push). Los pasos 3 y 4 (bajar
> el AAB y subirlo a Play) los hacés vos, porque requieren tu cuenta de GitHub/Google.

---

## Textos listos para copiar (ficha)

**Descripción corta (≤80):**
> Control de asistencia y planillas de personal de obra, con reconocimiento facial.

**Descripción larga:**
> Punto Rojo es la herramienta interna de control de asistencia y planillas para el personal de
> obra de la empresa. Permite marcar entrada y salida con reconocimiento facial, verificar que la
> marca se haga dentro de la obra mediante geocerca (GPS), y llevar el registro diario de asistencia
> por proyecto. Los encargados ven el personal de su obra, descargan reportes en PDF, y administran
> planillas, pagos, anticipos y descuentos. Funciona sin conexión: una vez abierta con internet,
> sigue operando offline y sincroniza cuando vuelve la señal.
>
> Aplicación de uso interno de la empresa, destinada a su personal y administradores. No está
> dirigida al público general.

---

## Resumen de quién hace qué

- **Claude (yo):** política de privacidad (hecha), textos de ficha (hechos), subir versionCode +
  push para un AAB nuevo, ajustes de la app.
- **Vos:** en Play Console — agregar testers y mandar el link (Fase 1); cargar ícono/gráfico/capturas,
  completar clasificación + seguridad de datos + acceso del revisor, y enviar a revisión (Fase 2);
  descargar el AAB de GitHub Actions y subirlo a Play.
