# Reporte Fase 1

## Implementado

- Monorepo npm workspaces con TypeScript estricto compartido.
- `@ptz/shared`: modelos, DTOs Zod y tipos de eventos WebSocket.
- Express + SQLite persistente, migraciones idempotentes y todos los endpoints REST solicitados.
- UI React/Vite de listado, alta, edición y eliminación de cámaras contra la API real.
- Contrato VISCA y mock en memoria, sin red UDP.
- Imagen Docker multi-stage, Compose, volumen de SQLite, documentación operativa y pruebas.

## Fuera de alcance a propósito

No se implementaron Gamepad API, WebSocket funcional, envío VISCA UDP, selección/anterior/siguiente, curvas, rampas, watchdog, lease, arbitraje ni autenticación.

## Decisiones de diseño

- Se eligió npm workspaces: está disponible con Node/npm y evita un gestor adicional. El brief prefería pnpm, pero no lo imponía.
- Se usó `better-sqlite3`; la imagen instala herramientas de compilación sólo durante `npm ci` porque el módulo nativo las requiere.
- `PUT /api/profiles` realiza upsert por UUID. La especificación enumera la ruta pero no define su semántica fina; es una decisión reversible para permitir persistir el tipo requerido sin UI en esta fase.

## Decisiones pendientes de Jonatan

- Marca, modelo, firmware, encapsulado VISCA, puertos y límites discretos reales de cada cámara.
- Semántica de administración de perfiles (un perfil, muchos perfiles, o perfil activo) antes de construir su UI.

## Verificaciones ejecutadas

`npm run build` (salida real):

```text
> ptz-joystick-controller@1.0.0 build
> npm run build --workspace=@ptz/shared && npm run build --workspace=@ptz/server && npm run build --workspace=@ptz/web

> @ptz/shared@1.0.0 build
> tsc -p tsconfig.json

> @ptz/server@1.0.0 build
> tsc -p tsconfig.json

> @ptz/web@1.0.0 build
> vite build
✓ 15 modules transformed.
✓ built in 368ms
```

`npx tsc --noEmit` (salida real, código 0):

```text
(sin salida)
```

`npm test` (salida real):

```text
> ptz-joystick-controller@1.0.0 test
> vitest run

Test Files  1 passed (1)
Tests  3 passed (3)
```

`docker compose up -d && curl -f http://localhost:3000/api/health` (salida real):

```text
Container ptz-joystick-controller-ptz-controller-1 Running
{"status":"ok","database":"connected"}
```
