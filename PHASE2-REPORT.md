# Informe de Fase 2

## Alcance entregado

- Se incorporó `useGamepad`: escucha `gamepadconnected` y `gamepaddisconnected`, consulta la API con
  `requestAnimationFrame` y cancela el frame y los listeners al desmontar.
- La UI exhibe cada joystick detectado, su ID, mapping, ejes con valor y barra, y botones con estado y valor.
- Se agregó aprendizaje para pan, tilt, zoom, cámara anterior y cámara siguiente. Compara dos muestras consecutivas
  y toma el eje de mayor variación; un botón presionado se captura por índice.
- La UI lista, crea desde el joystick conectado, edita y guarda perfiles por la API existente. Las asignaciones
  iniciales son ejes 0/1/3 y botones 4/5 (izquierdo X/Y, derecho Y, LB/RB).
- Los parámetros de calibración se editan y persisten, sin aplicarse a movimiento. No se agregó movimiento,
  WebSocket, VISCA UDP, STOP, curvas, rampas, watchdog, lease ni autenticación.
- Se documentó la exigencia de HTTPS o localhost para Gamepad API y la arquitectura del hook.

## Decisiones de diseño

El umbral de aprendizaje de eje es 0.15 entre frames: evita una captura por ruido sin favorecer un índice concreto.
Los botones se priorizan sobre ejes porque su evento es inequívoco. Al elegir una acción de eje o botón, entradas
del otro tipo se ignoran hasta que se produzca la entrada esperada.

## Pruebas agregadas

- Lectura desde `navigator.getGamepads()` mockeado.
- Estado vacío sin gamepads.
- Captura del eje 3 al moverlo más que el eje 0.
- Captura de botón presionado.
- Persistencia real: guardar perfil por HTTP, cerrar SQLite, reabrir SQLite y leerlo por HTTP.

## Salida real de verificaciones

```text
$ npm run build
> ptz-joystick-controller@1.0.0 build
> npm run build --workspace=@ptz/shared && npm run build --workspace=@ptz/server && npm run build --workspace=@ptz/web

> @ptz/shared@1.0.0 build
> tsc -p tsconfig.json

> @ptz/server@1.0.0 build
> tsc -p tsconfig.json

> @ptz/web@1.0.0 build
> vite build

✓ 17 modules transformed.
dist/assets/index--Hr8vJY0.css    1.25 kB │ gzip:  0.63 kB
dist/assets/index-DL7db0P9.js   230.55 kB │ gzip: 71.75 kB
✓ built in 275ms

$ npx tsc --noEmit
(sin salida; código de salida 0)

$ npm test
Test Files  2 passed (2)
     Tests  14 passed (14)
Duration  606ms

$ npm run format:check
> prettier --check .
Checking formatting...
All matched files use Prettier code style!

$ docker compose build --no-cache
Image ptz-joystick-controller-ptz-controller Built

$ docker compose up -d && curl -s http://localhost:3000/api/health
Container ptz-joystick-controller-ptz-controller-1 Running
{"status":"ok","database":"connected"}

$ awk 'length($0) > 120' <todos los archivos tocados>
(sin salida; código de salida 0)
```
