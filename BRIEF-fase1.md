# Brief Fase 1 — PTZ Joystick Controller

## Contrato de trabajo

- **Repo:** `/root/ptz-joystick-controller` (github.com/jonatandirocca/ptz-joystick-controller)
- **Fuente de verdad:** `docs/SPEC-v1.0.md`. Leelo completo antes de escribir una línea.
- **Vos escribís el código.** Rick coordina y revisa el diff. No inventes alcance fuera de esta fase.
- **Branch:** trabajá en `feat/fase1-fundacion`, no en `main`.

## Alcance EXACTO de la Fase 1

Del plan de implementación (§12):

> Fase 1: monorepo, Docker Compose, servidor y UI básica; CRUD de cámaras y persistencia.

Eso significa, y **nada más**:

### 1. Monorepo

- `pnpm` workspaces o npm workspaces (elegí uno y justificá en el PR; pnpm preferido).
- Estructura según §10:
  ```
  apps/web
  apps/server
  packages/shared
  apps/server/src/visca
  docker-compose.yml
  Dockerfile
  .env.example
  README.md
  tests/
  ```
- TypeScript estricto en los tres paquetes. Un `tsconfig.base.json` compartido.

### 2. `packages/shared`

Tipos y esquemas de validación (Zod) para:

- `Camera` — id, name, host, port, protocolVariant, enabled, sortOrder, panMax, tiltMax, zoomMax (§9)
- DTOs REST: crear/actualizar cámara
- Contratos de eventos WebSocket de §8 — **solo las definiciones de tipo**, no la implementación del servidor WS en esta fase

El modelo `JoystickProfile` también va en shared (tipos), aunque su UI sea Fase 2.

### 3. `apps/server`

- Express (o Fastify si preferís, justificá) + TypeScript.
- SQLite con **better-sqlite3** o `node:sqlite`. Migraciones idempotentes al arrancar.
- Endpoints de §8, **solo estos**:
  ```
  GET    /api/cameras
  POST   /api/cameras
  PUT    /api/cameras/:id
  DELETE /api/cameras/:id
  GET    /api/profiles
  PUT    /api/profiles
  GET    /api/health
  ```
- **Validación estricta de entrada:** IP/host válido, puerto 1–65535, nombres con longitud acotada, `sortOrder` numérico, `protocolVariant` de un enum cerrado. Rechazar con 400 y mensaje claro.
- Persistencia real en archivo SQLite (volumen Docker).
- `GET /api/health` devuelve estado del proceso + conectividad de la DB.

### 4. `apps/server/src/visca`

**Solo el contrato, no la implementación real.**

```ts
export interface ViscaAdapter {
  readonly variant: string;
  panTilt(cameraId: string, pan: number, tilt: number): Promise<void>;
  zoom(cameraId: string, zoom: number): Promise<void>;
  stop(cameraId: string): Promise<void>;
}
```

Más un `MockViscaAdapter` que registre las órdenes recibidas en memoria y las exponga para pruebas. **No emitas un solo byte VISCA UDP real en esta fase** — la §7 dice explícitamente que los paquetes dependen del modelo y hay que verificarlos contra documentación.

### 5. `apps/web`

- React + Vite + TypeScript.
- Una sola pantalla funcional: **lista y alta/edición de cámaras** contra la API real.
- Sin Gamepad API todavía (eso es Fase 2).
- Sin curvas ni rampas (Fase 4).
- Servida compilada por el mismo contenedor que el backend.

### 6. Docker

- `Dockerfile` multi-stage: build de web + server → imagen Node final.
- `docker-compose.yml` con volumen persistente para SQLite y puerto TCP publicado.
- `.env.example` con las variables reales que lea el server.
- Debe levantar con `docker compose up` y servir la UI.

### 7. Tests

- Tests unitarios de la validación de DTOs y del CRUD (con SQLite en memoria o archivo temporal).
- Al menos un test de integración que ejercite los endpoints REST de punta a punta.
- El proyecto debe pasar `npm run build`, `npm test` y `npx tsc --noEmit`.

## FUERA de alcance — no lo toques aunque parezca fácil

- Gamepad API, lectura de ejes, mapeo de botones (Fase 2)
- Cualquier envío VISCA UDP real (Fase 3)
- Curvas lineal/potencia/S-curve, rampas, zonas muertas (Fase 4)
- Watchdog, lease de control, arbitraje multioperador (Fase 5)
- Autenticación (Fase 5)
- WebSocket servidor funcional (solo tipos en shared)

Si te tienta agregar algo de esto, **no lo hagas**: se rechaza en el audit por alcance inflado.

## Entregables

1. Branch `feat/fase1-fundacion` con commits atómicos y mensajes en español, estilo conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
2. `README.md` actualizado con instrucciones reales de arranque — verificadas por vos, no supuestas.
3. Los cuatro documentos de `docs/` que faltan (`ARCHITECTURE.md`, `VISCA.md`, `OPERATIONS.md`, `API.md`) redactados sobre **lo que el código realmente hace**. Nada de lo que "debería" hacer.
4. Al final: un resumen en `PHASE1-REPORT.md` con qué hiciste, qué quedó fuera a propósito, y cualquier decisión de diseño que tomaste sin que la spec la fijara.

## Verificación obligatoria antes de declarar terminado

Corré y pegá la salida real de:

```bash
npm run build      # o pnpm build
npx tsc --noEmit
npm test
docker compose up -d && curl -f http://localhost:3000/api/health
```

Si algo falla, arreglalo. **No reportes éxito sin salida real.**

## Preguntas que NO debés resolver solo

Si te encontrás con algo que la spec no define y afecta el diseño, **pará y dejalo anotado** en `PHASE1-REPORT.md` bajo "Decisiones pendientes de Jonatan". No inventes.
