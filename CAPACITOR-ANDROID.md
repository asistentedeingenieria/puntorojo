# Capacitor + Google Play — Guía para Punto Rojo

App nativa Android construida con **Capacitor** que envuelve la PWA de
`https://puntorojo.app`. La app de Play Store es solo un shell — todo el
contenido (HTML/JS/CSS) se sirve desde Cloudflare Pages, así que **los cambios
del día a día no requieren republicar la app** en Google Play.

---

## Arquitectura

```
[Telefono Android]  →  [APK/AAB Capacitor wrapper]
                                                  ↓
                                          carga adentro
                                                  ↓
                                       https://puntorojo.app
                                       (Cloudflare Pages, v166+)
```

- El AAB pesa ~3 MB (solo el shell + iconos + splash)
- Cuando hago `git push` a main, Cloudflare actualiza puntorojo.app
- La app Android lo recibe en el siguiente refresh sin pasar por Google Play
- Solo se republica el AAB cuando se cambia: ícono, permisos, plugins nativos,
  versionCode

---

## Stack

| Capa | Componente |
|------|------------|
| Hosting web | Cloudflare Pages → puntorojo.app |
| Wrapper | Capacitor 6 |
| Build CI | GitHub Actions (`.github/workflows/build-android.yml`) |
| Signing | Keystore en GitHub Secrets |
| Distribución | Google Play Console |

---

## Estructura de archivos relevantes

```
.
├── capacitor.config.json          ← config del wrapper (apunta a puntorojo.app)
├── package.json                    ← deps de Capacitor
├── public/                         ← fallback offline cuando no hay internet
│   └── index.html
├── assets-source/                  ← SVGs master del icono y splash
│   ├── icon.svg
│   ├── icon-foreground.svg
│   └── splash.svg
├── assets/                         ← PNGs generados desde los SVGs
│   ├── icon-only.png  (1024x1024)
│   ├── icon-foreground.png
│   ├── splash.png  (2732x2732)
│   └── splash-dark.png
├── android/                        ← proyecto Android Capacitor
│   ├── app/
│   │   ├── build.gradle
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       └── res/                ← iconos en todas las resoluciones
│   └── ...
├── scripts/
│   └── build-source-assets.mjs     ← convierte SVGs a PNGs
└── .github/workflows/
    ├── build-android.yml           ← build automatico del AAB
    └── generate-keystore.yml       ← one-time, para crear el keystore
```

---

## Setup inicial (UNA VEZ EN LA VIDA)

### 1. Generar el keystore de signing

El keystore firma el AAB. Google Play **exige el mismo keystore** para todos los
updates. Si lo perdes, la app es irrecuperable.

#### Pasos:

1. Ir a `https://github.com/asistentedeingenieria/puntorojo/actions`
2. Click en el workflow **"Generate Android Keystore (one-time)"** del menú izquierdo
3. Click en **"Run workflow"** (arriba a la derecha)
4. En el campo "confirm" escribir literalmente: **`GENERAR`**
5. Click **"Run workflow"** verde
6. Esperar ~1 min hasta que termine en verde ✅
7. Click en el run que terminó → scrolear abajo → sección **"Artifacts"**
8. Click en **`puntorojo-keystore-bundle`** para descargar el ZIP

#### Lo que hay adentro del ZIP:

| Archivo | Para qué |
|---|---|
| `puntorojo-release.keystore` | El keystore real — **GUARDAR OFFLINE** |
| `keystore.base64.txt` | Mismo keystore en base64 — para subir como secret |
| `keystore-info.txt` | Las 4 credenciales que tenes que copiar como secrets |

### 2. Crear los 4 secrets en GitHub

1. Ir a `https://github.com/asistentedeingenieria/puntorojo/settings/secrets/actions`
2. Click **"New repository secret"** y crear los 4 (uno por uno):

| Nombre del secret | Valor (lo saca de keystore-info.txt) |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Pegar el contenido de `keystore.base64.txt` |
| `ANDROID_KEYSTORE_PASSWORD` | La password que dice ahí |
| `ANDROID_KEY_ALIAS` | `puntorojo` |
| `ANDROID_KEY_PASSWORD` | La misma password |

### 3. Guardar el keystore en lugar SEGURO

- Subirlo a 1Password / Bitwarden / Dashlane (cualquier password manager con file storage)
- O guardarlo en un USB encriptado
- O en otra cuenta de cloud separada
- **NUNCA commitearlo al repo** (`.gitignore` ya lo bloquea, pero por seguridad)

### 4. Borrar el workflow generate-keystore (limpieza)

Una vez que tenes los 4 secrets configurados:

1. Borrar el archivo `.github/workflows/generate-keystore.yml`
2. Commit + push
3. Así nadie más puede correrlo accidentalmente

---

## Build automático

A partir de ahora, **cada push a `main` que toque archivos relevantes** dispara
un build automático del AAB.

### Tipos de cambios que disparan rebuild Android

- Cambios en `android/`
- Cambios en `capacitor.config.json`
- Cambios en `package.json`
- Cambios en `public/`
- Cambios en `assets-source/`
- Cambios en `.github/workflows/build-android.yml`

### Tipos de cambios que NO requieren rebuild

- Cambios en `puntorojo.html`, `mobile.html`, `clientes.html`, `index.html`
- Cambios en `sw.js`
- Cambios CSS/JS de la web
- Casi todos los cambios funcionales del día a día

Esos se publican automáticamente en `puntorojo.app` vía Cloudflare y la app
los toma sola.

### Trigger manual de rebuild

Si quiero forzar un rebuild de Android:

1. Ir a Actions → "Build Android AAB"
2. Click "Run workflow" → "Run workflow"

### Bajar el AAB

Cuando un build termina exitoso:

1. Click en el run verde
2. Scrolear abajo → sección "Artifacts"
3. **`puntorojo-release-aab`** → descargar
4. Adentro hay un `.aab` firmado, listo para subir a Google Play

También se genera un `puntorojo-debug-apk` para instalar directamente en un
celular sin pasar por Play Store (para testing).

---

## Subir el AAB a Google Play (primera vez)

### Pre-requisitos

- Cuenta de Google Play Console (`$25` USD una sola vez)
  - Crear en `https://play.google.com/console`
  - Tipo: **Organization** (Punto Rojo S.A.)
  - Datos requeridos: NIT, dirección comercial, teléfono

### Crear el listing de la app

1. Login en Google Play Console
2. **"Create app"**
3. Llenar:
   - **App name**: `Punto Rojo`
   - **Default language**: Español (España) o Español (Latinoamérica)
   - **App or game**: App
   - **Free or paid**: Free
   - Aceptar declaraciones legales

### Llenar la información del store listing

Google Play exige llenar varios campos antes de poder publicar. Ir secuencialmente:

1. **Privacy Policy** — necesitamos generar URL pública. Sugerencia: crear página
   en `puntorojo.app/privacy.html` o usar generador de plantillas.
2. **App access** — si la app requiere login (la nuestra sí), marcar y dar
   credenciales de testing al revisor.
3. **Ads** — No (no tiene anuncios)
4. **Content rating** — Llenar el cuestionario (es business, no apunta a niños)
5. **Target audience** — Adultos, business
6. **News app** — No
7. **COVID-19 contact tracing** — No
8. **Data safety** — Declarar qué datos colecta Firebase (auth, Firestore).
9. **Government apps** — No
10. **Financial features** — No

### Subir el AAB

1. **Production** → **Create new release**
2. Subir el `.aab` descargado del workflow
3. Llenar **Release name** (ej. `1.0 - Lanzamiento inicial`)
4. **Release notes** en español:
   ```
   Primera version de Punto Rojo: gestion de obra de tablayeso para
   constructoras, supervisores y receptores de los proyectos.
   ```
5. **Save** → **Review release** → **Start rollout to Production**

### Esperar review

- Tiempo típico: 1-3 días
- Email cuando lo aprueban
- Una vez aprobado, la app aparece en Play Store buscando "Punto Rojo"

---

## Updates futuros (después de la primera publicación)

### Cambios web (95% de los casos)

```
Yo: edito código, push a main
↓
Cloudflare: deploy en 30 seg
↓
puntorojo.app: actualizado
↓
App Android: lo recibe en próximo refresh del SW (segundos)
```

**No hay que tocar Google Play.**

### Cambios nativos (5% de los casos)

Cuando se cambia: ícono, splash, permisos del manifest, plugins de Capacitor,
versión nativa, etc.

```
Yo: edito código + bumpeo versionCode en android/app/build.gradle
Yo: push a main
↓
GitHub Actions: builda nuevo AAB en ~10 min
↓
Vos: descargas el AAB del workflow
Vos: subis a Google Play Console como nuevo release
↓
Google review: 1-3 días
↓
Update publicado
```

---

## Troubleshooting

### El workflow falla con "keystore not found"

→ Revisar que los 4 secrets estén creados en Settings → Secrets and variables → Actions

### El workflow falla con "build error"

→ Click en el step que falló para ver el log. Mandarme el error.

### Google Play rechaza el AAB

→ Razones típicas:
   - Falta privacy policy
   - Datos de seguridad incompletos
   - App requiere login pero no diste credenciales de testing al revisor
   - Falta categoría o información

### Perdí el keystore

→ Si todavía no subí la app: regenerar uno nuevo (correr otra vez generate-keystore)
→ Si ya subí la app: pedirle a Google Play "Reset upload key" — proceso de 1-2 semanas

### App muestra "Sin conexión a Internet" siempre

→ El fallback de `public/index.html` se está mostrando. Significa que la app no
   pudo cargar `puntorojo.app`. Verificar:
   - El celular tiene internet
   - puntorojo.app está accesible (curl o desde browser)
   - El `server.url` en `capacitor.config.json` apunta a la URL correcta

---

## Comandos útiles (local, para devs)

```bash
# Instalar dependencias
npm install

# Regenerar PNGs desde SVGs (si cambias el logo)
node scripts/build-source-assets.mjs

# Regenerar todos los iconos Android desde los PNGs master
npx capacitor-assets generate --android \
  --iconBackgroundColor "#C8141C" \
  --splashBackgroundColor "#0F172A"

# Sincronizar capacitor.config con android/
npx cap sync android

# Build local del AAB (requiere Android Studio + JDK 21)
cd android && ./gradlew bundleRelease

# Build local del APK debug (requiere Android Studio + JDK 21)
cd android && ./gradlew assembleDebug
```

---

## Próximos pasos — iOS (cuando haya Mac + D-U-N-S)

```bash
# Solo agregar iOS:
npx cap add ios

# Después abrir en Xcode (en Mac):
npx cap open ios
```

El mismo `capacitor.config.json` ya está configurado para iOS. Solo falta:

1. Tener Mac
2. Apple Developer Account ($99/año, requiere D-U-N-S Number aprobado)
3. Xcode instalado
4. Build el `.ipa` desde Xcode
5. Subir a App Store Connect via Transporter o Xcode

Mismo flujo de updates: cambios web son automáticos, cambios nativos requieren
nuevo `.ipa` y review de Apple.
