# API HTTP

Todas las rutas responden JSON. Las cámaras exigen nombre de 1–100 caracteres, IP o hostname válido, puerto entero 1–65535, `protocolVariant: "generic-visca-ip"`, booleano `enabled`, `sortOrder` entero y límites positivos. Entradas inválidas responden `400` con `{ "error": "..." }`.

| Método | Ruta | Resultado |
| --- | --- | --- |
| GET | `/api/cameras` | Lista cámaras por orden y nombre. |
| POST | `/api/cameras` | Crea una cámara; devuelve `201`. |
| PUT | `/api/cameras/:id` | Reemplaza una cámara; `404` si no existe. |
| DELETE | `/api/cameras/:id` | Devuelve `204`; `404` si no existe. |
| GET | `/api/profiles` | Lista los perfiles guardados. |
| PUT | `/api/profiles` | Crea o actualiza un perfil por UUID. |
| GET | `/api/health` | Estado del proceso y conectividad SQLite. |

Ejemplo: `{"name":"Plano general","host":"192.168.10.20","port":52381,"protocolVariant":"generic-visca-ip","enabled":true,"sortOrder":1,"panMax":24,"tiltMax":20,"zoomMax":7}`.

Los eventos WebSocket son solo tipos en `@ptz/shared`; no hay endpoint WebSocket.
