# Auto‑marcado de asistencia — personal de oficina

**Fecha:** 2026‑06‑16
**Objetivo:** Que ciertos colaboradores tipo OFICINA registren su PROPIA asistencia
(entrada/salida) en varias obras el mismo día, con login propio + reconocimiento
facial 1‑a‑1, sin poder ver ni marcar a nadie más.

## Decisiones (brainstorming 2026‑06‑16)
- **Identidad:** login propio (usuario+clave) + pantalla "MI ASISTENCIA" dedicada.
- **Obras:** puede elegir de TODAS las obras.
- **Cara:** Face ID igual que el kiosko de obra, pero **1‑a‑1** contra su propia cara.
- **Sin respaldo:** si la cara no reconoce, NO marca (no hay botón de "marcar igual").
- **GPS:** obligatorio (se captura), pero **OCULTO** para la persona. Solo el admin lo ve.

## Modelo de datos
- **Usuario** (user doc): nuevo permiso `self.asistencia`; nuevo campo `colaboradorId`
  (id del registro en `personalGlobal`).
- **Colaborador:** se fuerza `multiSesion=true` al crear el acceso.
- **Lista de permisos:** nueva entrada `self.asistencia` = "Auto‑marcar mi propia asistencia".

## Componentes

### 1. Crear acceso (admin)
En la ficha de un colaborador **tipo OFICINA**: botón **"Crear acceso de auto‑marcado"**.
Pide **usuario + clave (PIN)**. Reusa la creación de usuario usuario+clave (email
sintético existente). Setea `perms=['self.asistencia']`, `colaboradorId=p.id`, y
`p.multiSesion=true`. Si ya existe el acceso, permite **resetear la clave**.

### 2. Landing restringido
Al loguear, si el usuario tiene SOLO `self.asistencia` (y no `users.manage`/`*`), la app
salta el dashboard normal y muestra únicamente **"MI ASISTENCIA"**. Sin navegación ni
otras secciones. (Hook en el arranque post‑login / router — a localizar en el plan.)

### 3. Registrar su propia cara
La pantalla detecta si su colaborador no tiene `face`. Si no, muestra **"Registrá tu cara"**
y reusa el enrolamiento existente sobre SU propia ficha. Extensión de permiso: enrolar se
permite si `(personal.edit || users.manage)` **O** `(user.colaboradorId === personaId &&
can('self.asistencia'))`. La cara entra al **modelo facial compartido** (`face` +
`faceBackups`), así que los kioscos de obra también la reconocen.

### 4. Marcar entrada/salida (Face ID 1‑a‑1)
Flujo en "MI ASISTENCIA":
1. Selector de **obra** (todas las obras).
2. Botón **MARCAR** → abre cámara (mismo motor face‑api del kiosko).
3. Detecta una cara, calcula descriptor, compara **solo contra el descriptor de su propio
   colaborador** (1‑a‑1, umbral de distancia).
4. Si coincide → `_marcarAsistenciaFacial(colaboradorId, obraId, obraDesc, geo)` (ya maneja
   multiSesion). El **geo obligatorio** se captura antes/durante, en background.
5. Si NO coincide → "No te reconozco, intentá de nuevo". **No marca.**
La pantalla **no muestra** geo ni EN OBRA / FUERA.

### 5. Vista de la persona
Muestra: su nombre, las **sesiones de HOY** (obra + entrada/salida) y el botón MARCAR.
Nada de ubicación. Nada de otras personas.

### 6. Reportes (admin)
Las marcas usan la misma estructura (`sessions[]`, geo en la sesión), así que aparecen en
lista/resumen/PDF de cada obra como cualquier colaborador. El admin ve la ubicación (con
`personal.verUbicacion`).

## Seguridad
- El usuario self‑service solo opera sobre su `colaboradorId`: marcar y enrolar validan
  `personaId === user.colaboradorId`.
- `perms=['self.asistencia']` no concede acceso a ningún otro módulo (`can()` lo bloquea).
- 1‑a‑1: el escaneo solo compara contra su propia cara; otra persona no matchea → no marca.

## Testing
- **Lógica pura (TDD):** `_esUsuarioAutoMarcado(user)` (tiene `self.asistencia`, no admin),
  `_puedeAutoEnrolar(user, personaId)`, y el match 1‑a‑1 (distancia vs umbral → bool).
- El marcado multiSesion y `faceBackups` reusan código ya probado.
- **Verificación manual:** crear acceso → loguear → enrolar cara → marcar en 2 obras →
  confirmar que NO ve geo y que SÍ aparece en el reporte del admin con ubicación.

## Fuera de alcance (YAGNI)
- Sin respaldo manual si la cara falla.
- Sin asignación de obras (elige de todas).
- Sin auto‑detección de obra por geo (el geo solo se captura, no filtra).
