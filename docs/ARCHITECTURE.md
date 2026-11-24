# Arquitectura implementada

El monorepo usa npm workspaces: `apps/web` (React/Vite), `apps/server` (Express), y `packages/shared` (Zod,
DTOs y tipos). El build de Vite queda en `apps/web/dist` y Express lo sirve junto con `/api` en un único
proceso Node.

`Store` abre SQLite con `better-sqlite3`, habilita WAL y ejecuta `CREATE TABLE IF NOT EXISTS` al iniciar. Las
tablas presentes son `cameras` y `joystick_profiles`; Docker monta `/data` como volumen nombrado.

El cliente incorpora `useGamepad`, que escucha conexión y desconexión, consulta `navigator.getGamepads()` con
`requestAnimationFrame` y entrega instantáneas inmutables para la vista de estado y el aprendizaje de mapeos.
El aprendizaje compara muestras sucesivas y asigna el eje que más cambió, o un botón presionado. Los perfiles se
guardan por REST en SQLite; los valores de calibración se persisten pero no se aplican todavía.

El contrato `ViscaAdapter` y `MockViscaAdapter` viven en `apps/server/src/visca`. El mock solo conserva órdenes en
memoria. No hay WebSocket, movimiento de cámaras, lease, watchdog, autenticación ni UDP en esta fase.
