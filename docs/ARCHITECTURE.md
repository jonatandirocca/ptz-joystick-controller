# Arquitectura implementada

El monorepo usa npm workspaces: `apps/web` (React/Vite), `apps/server` (Express), y `packages/shared` (Zod, DTOs y tipos). El build de Vite queda en `apps/web/dist` y Express lo sirve junto con `/api` en un único proceso Node.

`Store` abre SQLite con `better-sqlite3`, habilita WAL y ejecuta `CREATE TABLE IF NOT EXISTS` al iniciar. Las tablas presentes son `cameras` y `joystick_profiles`; Docker monta `/data` como volumen nombrado.

El contrato `ViscaAdapter` y `MockViscaAdapter` viven en `apps/server/src/visca`. El mock solo conserva órdenes en memoria. No hay WebSocket, Gamepad, lease, watchdog, autenticación ni UDP en esta fase.
