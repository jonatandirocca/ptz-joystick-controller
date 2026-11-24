# PTZ Joystick Controller

Fase 1: administración de cámaras PTZ con API HTTP, SQLite persistente y una interfaz React para alta, edición y baja.

## Arranque

Requiere Node.js 22+ y Docker Compose.

```bash
npm install
npm run build
npm test
docker compose up -d
```

Abrir `http://localhost:3000`. La comprobación de servicio es `curl -f http://localhost:3000/api/health`. Para parar: `docker compose down`; el volumen `ptz-data` conserva la base.

Localmente, tras compilar: `PORT=3000 DATABASE_PATH=./data/ptz.sqlite npm run start --workspace=@ptz/server`.

## Variables

El servidor lee `PORT` (por defecto `3000`) y `DATABASE_PATH` (por defecto `./data/ptz.sqlite`). Docker fija el segundo a `/data/ptz.sqlite`.

## Alcance actual

Incluye CRUD de cámaras, perfiles persistibles por API, migraciones SQLite y contrato/mock VISCA. No incluye Gamepad, WebSocket operativo, tráfico VISCA UDP, selección de cámara, curvas/rampas, autenticación ni arbitraje.

Se usó npm workspaces para no requerir otro gestor. Ver [API](docs/API.md), [arquitectura](docs/ARCHITECTURE.md), [operación](docs/OPERATIONS.md) y [VISCA](docs/VISCA.md).
