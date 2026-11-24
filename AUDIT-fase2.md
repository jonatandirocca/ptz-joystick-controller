# Audit Fase 2 — Gamepad API y mapeo configurable

- **Repo:** `/root/ptz-joystick-controller`
- **Branch auditada:** `feat/fase2-gamepad`
- **Commit auditado:** `ff81e00` (`feat(fase2): Gamepad API, panel en vivo, modo aprendizaje y perfiles`)
- **Base:** `f87a22d` (`feat/fase1-fundacion`, Fase 1 auditada)
- **Fecha:** 2026-11-24
- **Alcance de referencia:** `BRIEF-fase2.md` y `docs/SPEC-v1.0.md` (RF-05, RF-06, RF-11, §4, §9)
- **Método:** lectura completa del diff `f87a22d..ff81e00`, lectura del código nuevo, build, `tsc`, tests,
  `format:check`, build Docker sin caché, arranque con Docker Compose, prueba de persistencia con reinicio real
  del proceso y verificaciones de borde ejecutadas por el auditor. No se tomó como válido ningún resultado de
  `PHASE2-REPORT.md` sin reproducirlo.

---

## 1. VEREDICTO

**APROBADO CON OBSERVACIONES**

La Fase 2 cumple el alcance exacto del brief: hook de Gamepad API, panel de estado en vivo, aprendizaje de
ejes/botones y CRUD de perfiles con persistencia real. No hay funcionalidad de la sección “FUERA de alcance”:
no se aplican zonas muertas/curvas/rampas, no se envía movimiento al servidor y no se agregó WebSocket. El
aprendizaje captura el eje que más cambió y no “el primero distinto de cero”. Los perfiles sobreviven a un
reinicio del proceso y a la recarga de la UI. La UI no se rompe sin gamepad ni fuera de contexto seguro. La
especificación `docs/SPEC-v1.0.md` sigue intacta y no hay regresiones funcionales de Fase 1.

Las observaciones son no bloqueantes. La principal es que el aprendizaje de ejes compara solo muestras
consecutivas con un umbral de `0.15`, por lo que un movimiento lento pero claro puede no capturarse nunca (O1).
No invalida la selección correcta del eje, pero conviene corregirlo antes de usar la función en estudio.

---

## 2. Alcance: nada de la sección “FUERA de alcance”

**Cumple.** El diff solo agrega el hook, la UI de estado/aprendizaje/perfiles, estilos, tests y documentación.
No modifica `apps/server` ni `packages/shared`.

Búsqueda explícita sobre el código nuevo:

- Las únicas llamadas `fetch` de la fase son `GET /api/profiles` y `PUT /api/profiles`
  (`apps/web/src/GamepadProfiles.tsx:88` y `:138`). No hay `POST` de movimiento, ni `WebSocket`, ni `sendBeacon`.
- `deadzones`, `curves`, `exponent`, `sensitivity`, `rampUpMs` y `rampDownMs` aparecen **solo** como campos del
  formulario y del perfil guardado (`GamepadProfiles.tsx:27-32`, `:211-333`). No se usan en ningún cálculo.
  El propio formulario está rotulado “Calibración guardada (no aplicada en esta fase)”.
- No hay cálculo de movimiento, selección real de cámara, STOP, watchdog, lease ni autenticación nuevos.
- El tipo `motion` de `@ptz/shared` y el campo `gamepadId` son preexistentes de Fase 1; no se agregó lógica que
  los ejecute.

Esto coincide con el brief, que permite editar y guardar los parámetros de calibración en Fase 2 pero prohíbe
aplicarlos.

---

## 3. Modo aprendizaje: captura el eje correcto

**Cumple el requisito concreto.** `learnControl` compara la muestra actual con la anterior, calcula el cambio
absoluto de cada eje y elige el de mayor variación (`apps/web/src/useGamepad.ts:62-76`). No usa el primer eje
distinto de cero.

Verificado con una prueba temporal del auditor:

```text
previous.axes = [0.5, 0, 0, 0]
current.axes  = [0.5, 0, 0, -0.8]
learnControl  = { kind: "axis", index: 3 }   # ignora el 0.5 preexistente del eje 0
```

También se verificó el test del repo: con ejes `[0.03, 0, 0, -0.82]` devuelve el índice `3`, no el `0`.
La confirmación visible se muestra en `notice` y el campo editado se actualiza en el perfil.

**Observación O1:** el umbral se aplica al delta entre dos frames, no al desplazamiento acumulado desde que se
inició el aprendizaje. Ver detalle en la sección 8.

---

## 4. Persistencia real de perfiles

**Cumple.**

- La UI carga perfiles con `GET /api/profiles` al montar (`GamepadProfiles.tsx:98-100`) y guarda con
  `PUT /api/profiles` (`:130-155`). Después de guardar recarga la lista.
- El servidor valida con `joystickProfileSchema` y hace upsert por `id` en SQLite
  (`apps/server/src/app.ts:52-63`, `apps/server/src/database.ts:114-122`).
- `gamepadId` se completa desde `gamepad.id` (`GamepadProfiles.tsx:15-18`).
- El test `conserva un perfil tras reabrir SQLite mediante la API` (`tests/api.test.ts:115-126`) cierra y
  reabre la base y recupera el perfil.

Reproducido por el auditor con el servidor real y reinicio de proceso:

```text
PUT /api/profiles  → 200, perfil completo devuelto
(kill del proceso, nueva instancia con el mismo DATABASE_PATH)
GET /api/profiles  → 200, perfil con sus mapeos y calibración intactos
GET /api/cameras   → 200, []
```

La recarga de página vuelve a ejecutar el `GET` de montaje, por lo que el perfil reaparece en la UI.

---

## 5. UI sin gamepad y fuera de contexto seguro

**Cumple: no se rompe.**

- `isGamepadContextAvailable()` detecta ausencia de `window`, `isSecureContext` falso y hostname distinto de
  `localhost` (`useGamepad.ts:21-27`). `GamepadStatus` muestra el aviso
  “Gamepad API requiere HTTPS o localhost…” (`GamepadProfiles.tsx:35-38`).
- Sin gamepads muestra “No hay joystick detectado…” (`:40-42`).
- `readGamepads()` devuelve `[]` si `navigator.getGamepads` no existe o no hay dispositivos
  (`useGamepad.ts:29-33`), y el hook no registra RAF si la API no está soportada (`:82-85`).
- En `GamepadProfiles`, el botón de crear perfil se deshabilita sin gamepad y el formulario de perfiles sigue
  funcionando para administrar los existentes (`:168-171`).

Verificación del auditor renderizando los componentes en servidor con contexto inseguro y sin gamepads:

```text
window.isSecureContext = false, hostname = 192.168.1.50
GamepadStatus  → contiene "Gamepad API requiere HTTPS o localhost"

window.isSecureContext = true, hostname = localhost, gamepads = []
GamepadStatus     → contiene "No hay joystick detectado"
GamepadProfiles   → contiene "Conectá un joystick para crear un perfil."
```

Ambos renders terminaron sin excepción.

**Observación O3:** el test automático de “estado vacío” solo cubre `readGamepads()`, no el render de los
componentes. **Observación O5:** el botón “Aprender” sigue activo sin gamepad y deja el mensaje de espera.

---

## 6. `docs/SPEC-v1.0.md` intacta

**Cumple.** Coincide exactamente con el hash pedido:

```text
$ sha256sum docs/SPEC-v1.0.md
b11b1956479818ef0fdf95be5c50f87903d0a14538e79386a2bb2303fbdfe546  docs/SPEC-v1.0.md

$ git hash-object docs/SPEC-v1.0.md
fc2d2f1237c31e6ad3694a2bf4ca73df0aeebb8e

$ git log --oneline --all -- docs/SPEC-v1.0.md
9c0e52a docs: especificación v1.0 y estructura inicial del repositorio
```

Además, `.prettierignore` sigue excluyendo `docs/SPEC-v1.0.md`; no se sacó de ahí. El working tree quedó limpio.

---

## 7. Regresiones de Fase 1

**No se encontraron regresiones funcionales.**

- `apps/server/**` y `packages/shared/**` no cambian en el diff (`git diff --name-status f87a22d ff81e00`).
- `apps/web/src/main.tsx` solo agrega el hook y dos secciones al final (`:21`, `:206-210`); el CRUD de cámaras
  quedó sin cambios.
- `tests/api.test.ts` solo agrega el fixture de perfil y dos tests; los tests previos de cámaras, health,
  migración, mock VISCA y errores JSON siguen presentes.
- `npm test` ejecuta los 14 tests (10 de API + 4 de gamepad) y pasan.
- El build Docker arranca y responde `200` en `/api/health` y `/api/profiles`.

**Observación O4:** el nuevo `useGamepad` provoca un `setState` con un array nuevo en cada frame de animación,
aun sin gamepads conectados; eso re-renderiza toda la `App` a ~60 fps. No rompe Fase 1, pero es una regresión de
rendimiento/consumo evitable.

---

## 8. Observaciones

### O1 (media, no bloqueante) — El aprendizaje de ejes puede no capturar movimientos lentos

- **Dónde:** `apps/web/src/useGamepad.ts:62-76`, efecto de `GamepadProfiles.tsx:102-122`.
- **Qué pasa:** solo se considera el cambio entre dos muestras consecutivas y se exige `>= 0.15`. Un movimiento
  continuo de `0.1` por frame (recorrido completo en ~10 frames, unos 166 ms a 60 fps) nunca supera el umbral.
  Reproducido con prueba temporal del auditor:
  ```text
  delta 0.14 en un frame → undefined
  delta 0.16 en un frame → { kind: "axis", index: 3 }
  incrementos de 0.1/frame desde 0 hasta 1 → undefined en todos los frames
  ```
  El test del repo usa un salto de `0.82`, por eso no detecta este caso.
- **Impacto:** con un movimiento lento o preciso la UI queda en “Esperando entrada…” aunque el eje se haya
  movido claramente. La elección del eje sigue siendo correcta cuando hay un salto suficiente.
- **Sugerencia:** guardar una muestra base al iniciar el aprendizaje y comparar contra ella (o acumular el
  máximo desplazamiento absoluto) en lugar de comparar solo frames consecutivos. Alternativa: umbral menor con
  histéresis y selección del eje de mayor recorrido acumulado.

### O2 (baja, no bloqueante) — Un botón ya presionado antes de aprender se captura igual

- **Dónde:** `apps/web/src/useGamepad.ts:57-60`.
- **Qué pasa:** `current.buttons.find((button) => button.pressed)` captura cualquier botón que esté presionado en
  la muestra actual, sin comprobar que se haya presionado después de iniciar el aprendizaje. Si el usuario
  mantenía un botón apretado antes de pulsar “Aprender”, se asigna ese botón.
- **Impacto:** posible mapeo incorrecto por un botón retenido; además, al aprender un eje con un botón
  presionado, la detección de eje se posterga hasta que se suelte.
- **Sugerencia:** exigir transición `false → true` respecto de la muestra base del aprendizaje.

### O3 (baja, no bloqueante) — Cobertura de tests de UI y ciclo de vida incompleta

- **Dónde:** `tests/gamepad.test.ts`.
- **Qué pasa:** se testean `readGamepads`, el estado vacío de la función y el aprendizaje, y hay un test real de
  persistencia por HTTP/SQLite. No hay test de render sin gamepad/contexto inseguro ni del cleanup de listeners
  y `cancelAnimationFrame` del hook. El brief pedía explícitamente el caso “Estado vacío sin gamepad (no rompe)”
  y el test actual no renderiza la UI.
- **Impacto:** el comportamiento es correcto (verificado manualmente por el auditor), pero una regresión de UI
  no sería detectada por CI.
- **Sugerencia:** agregar un test de componente (jsdom + Testing Library o render a string) para los dos estados
  y, si es posible, un test del hook que verifique que al desmontar se cancelan RAF y listeners.

### O4 (baja, no bloqueante) — Re-render continuo por frame

- **Dónde:** `apps/web/src/useGamepad.ts:87-97`.
- **Qué pasa:** `readGamepads()` devuelve un array nuevo y `setGamepads` se llama en cada
  `requestAnimationFrame` sin comparar si hubo cambios. Aun sin gamepads conectados, la `App` completa
  (incluido el formulario de cámaras) se re-renderiza a ~60 fps.
- **Impacto:** consumo innecesario de CPU y posibles molestias de interacción; no altera datos ni rompe nada.
- **Sugerencia:** comparar de forma superficial el estado anterior y evitar el `setState` si no cambió; o bajar
  la frecuencia de sondeo cuando no hay dispositivos.

### O5 (muy baja, no bloqueante) — “Aprender” habilitado sin gamepad

- **Dónde:** `apps/web/src/GamepadProfiles.tsx:205-207`.
- **Qué pasa:** el botón de aprendizaje no se deshabilita cuando no hay gamepad. Al pulsarlo muestra “Mové el
  eje…” y queda en “Esperando entrada…” indefinidamente, porque nunca llega una muestra.
- **Sugerencia:** deshabilitarlo con `!currentGamepad` y mostrar el mismo aviso de conexión que en la creación.

---

## 9. Verificaciones ejecutadas (salida real)

Entorno: branch `feat/fase2-gamepad`, commit `ff81e00`, working tree limpio.

```text
$ npm run build
> @ptz/shared build → tsc OK
> @ptz/server build → tsc OK
> @ptz/web build    → vite v8.3.8, 17 modules transformed, dist generado
EXIT 0

$ npx tsc --noEmit
(sin salida)
EXIT 0

$ npm test
Test Files  2 passed (2)
     Tests  14 passed (14)
Duration  2.89s
EXIT 0

$ npm run format:check
Checking formatting...
All matched files use Prettier code style!
EXIT 0

$ docker build --no-cache -t ptz-joystick-controller:audit-fase2 .
...
naming to docker.io/library/ptz-joystick-controller:audit-fase2 done
EXIT 0

$ docker compose up -d --build
Container ptz-joystick-controller-ptz-controller-1 Started
$ curl -s http://localhost:3000/api/health
{"status":"ok","database":"connected"}   HTTP 200
$ curl -s http://localhost:3000/api/profiles
[]                                       HTTP 200
$ docker compose down
(contenedor y red eliminados; el volumen ptz-data se conserva)
```

Longitud de líneas en los archivos tocados (todos los archivos del commit, incluidos docs y tests):

```text
$ awk 'length($0) > 120' apps/web/src/GamepadProfiles.tsx apps/web/src/main.tsx \
      apps/web/src/useGamepad.ts apps/web/src/styles.css tests/gamepad.test.ts \
      tests/api.test.ts docs/API.md docs/ARCHITECTURE.md docs/OPERATIONS.md PHASE2-REPORT.md
(sin salida)
```

Pruebas de borde adicionales del auditor, con archivos temporales eliminados después:

- Render de `GamepadStatus` y `GamepadProfiles` sin gamepad y con contexto inseguro: sin excepciones.
- `PUT /api/profiles` seguido de cierre, reinicio y `GET`: perfil intacto.
- Aprendizaje de eje correcto con eje 0 preexistente en `0.5` y eje 3 movido a `-0.8`: devuelve índice `3`.
- Movimiento lento por incrementos de `0.1` por frame: no captura (O1).
- Botón ya presionado antes de aprender: se captura igual (O2).

Antes de agregar este informe, `git status --porcelain` estaba vacío; el único archivo nuevo del audit es
`AUDIT-fase2.md`.

---

## 10. Conclusión

La Fase 2 está **completa en alcance y funcionalmente correcta** para los objetivos del brief. No hay
violaciones de la sección “FUERA de alcance”, el eje aprendido es el correcto, la persistencia es real, la UI
resiste la ausencia de gamepad/contexto inseguro, la especificación no fue tocada y Fase 1 no presenta
regresiones.

Se recomienda corregir O1 antes de llevar el modo aprendizaje a operación real, y sumar O2/O3/O4/O5 al backlog
inmediato. Ninguna de estas observaciones justifica rechazar la fase.
