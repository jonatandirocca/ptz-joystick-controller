# Brief Fase 2 — Gamepad API y mapeo configurable

## Contrato de trabajo

- **Repo:** `/root/ptz-joystick-controller`
- **Branch base:** `main` (`f87a22d`) — Fase 1 ya está mergeada y auditada
- **Branch de trabajo:** `feat/fase2-gamepad`
- **Spec:** `docs/SPEC-v1.0.md` §4 (mapeo), §9 (JoystickProfile), RF-05 y RF-11
- **Fase 1 entregó:** monorepo, API REST de cámaras, SQLite, UI CRUD, contrato VISCA + mock

Leé `docs/SPEC-v1.0.md` completo antes de empezar. Fase 1 ya está cerrada y auditada — no la toques salvo lo que esta fase exige.

## Alcance EXACTO de la Fase 2

Del plan §12:

> Fase 2: Gamepad API, visualización de ejes/botones y asignación configurable.

Eso significa, y **nada más**:

### 1. Lectura de gamepads en el cliente

- Hook `useGamepad()` (o equivalente) que:
  - Detecte gamepads conectados/desconectados vía los eventos `gamepadconnected` / `gamepaddisconnected`
  - Encueste `navigator.getGamepads()` con `requestAnimationFrame`
  - Devuelva por cada gamepad: `id`, `index`, `mapping`, ejes con su valor crudo, botones con `pressed`/`value`
  - Se limpie correctamente en `useEffect` al desmontar (cancelar el RAF)

- **Estado visible (RF-11):** panel que muestre en tiempo real
  - Joystick detectado (o "ninguno")
  - Ejes con sus valores numéricos y una barra visual
  - Botones con su índice y si están presionados
  - `mapping` del dispositivo (`standard` o vacío) y su `id`

### 2. Modo de aprendizaje

Pantalla o panel donde el usuario puede:

- Elegir qué control quiere asignar (pan, tilt, zoom, cámara anterior, cámara siguiente)
- Mover el eje o presionar el botón que quiere asociar
- La UI **captura automáticamente** el índice del eje/botón que se movió más, o el botón presionado
- Confirmación visible de qué se capturó

Requisito concreto: **detectar el eje correcto**. Si el usuario mueve el analógico derecho hacia arriba, hay que capturar el índice del eje que cambió, no "el primer eje que no sea 0".

### 3. Perfiles por joystick/operador (RF-06)

- La API `GET/PUT /api/profiles` ya existe y persiste en SQLite.
- La UI debe permitir: listar perfiles, crear uno nuevo desde el gamepad conectado, editar y guardar.
- `gamepadId` se completa desde el `id` del gamepad que reporta la API del navegador.
- Persistencia real: tras recargar la página, el perfil y sus mapeos siguen ahí.

### 4. Mapeo predeterminado (§4)

Al crear un perfil nuevo, precargar:

- Eje izquierdo X → pan
- Eje izquierdo Y → tilt
- Eje derecho Y → zoom
- LB → cámara anterior, RB → cámara siguiente

Pero **todos los índices deben ser editables**, porque la Gamepad API varía por dispositivo.

## FUERA de alcance — no lo toques

- **Cualquier envío al servidor de movimiento.** Fase 3.
- Zonas muertas, curvas, exponente, sensibilidad **aplicados** al cálculo → Fase 4. Los campos del perfil existen en el modelo; en Fase 2 solo se editan y se guardan, no se usan para mover nada.
- Rampas de aceleración/desaceleración → Fase 4.
- Cambio real de cámara activa con STOP → Fase 4.
- WebSocket funcional → Fase 3.
- Watchdog, lease, arbitraje, auth → Fase 5.

Si te tienta "dejar preparado" algo de esto: **no**. Se rechaza en audit.

## Requisito técnico importante

**Gamepad API requiere contexto seguro.** Funciona en `localhost` y en HTTPS, pero **no** en HTTP sobre IP remota. La app ya se sirve en `localhost:3000` en desarrollo, así que alcanza. Documentá esta limitación en `OPERATIONS.md`.

Cuando no hay gamepad o no hay contexto seguro, la UI debe mostrar un mensaje claro, **no romperse**.

## Calidad — reglas que ya nos costaron una ronda de corrección

Estas vienen del audit de Fase 1. No las repitas:

1. **Ninguna línea de código supera 120 caracteres.** Prettier ya está configurado (`printWidth: 120`). Corré `npm run format:check`.
2. **Mensajes de error en español**, no en inglés.
3. **Tests reales**, no de humo. Cada feature de esta fase necesita su test.
4. **No reformatees `docs/SPEC-v1.0.md`.** Está en `.prettierignore` — no lo saques de ahí.
5. TypeScript estricto, sin `any` sueltos ni `@ts-ignore`.

## Entregables

1. Branch `feat/fase2-gamepad`.
2. Hook de gamepad + panel de estado en vivo + pantalla de mapeo/aprendizaje + CRUD de perfiles.
3. Tests:
   - Detección de gamepad (con `navigator.getGamepads` mockeado)
   - Captura del eje correcto en modo aprendizaje
   - Persistencia de perfil contra la API real
   - Estado vacío sin gamepad (no rompe)
4. Docs actualizados: `OPERATIONS.md` (limitación de contexto seguro), `API.md` si cambia algo, y `ARCHITECTURE.md` con el hook nuevo.

## Verificación obligatoria

Pegá la salida real de:

```bash
npm run build
npx tsc --noEmit
npm test
npm run format:check
docker compose build --no-cache
docker compose up -d && curl -s http://localhost:3000/api/health
```

Y `awk 'length($0) > 120'` sobre todos los archivos que toques.

Escribí `PHASE2-REPORT.md` con lo hecho, la salida real, y cualquier decisión de diseño que la spec no fijara.
