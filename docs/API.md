# API HTTP

Las rutas `/api/*` responden JSON, salvo `DELETE` exitoso, que responde `204` sin cuerpo. Las cámaras exigen
nombre de 1–100 caracteres, IP o hostname válido (una cadena compuesta solo por dígitos y puntos debe ser IPv4
válida), puerto entero 1–65535, `protocolVariant: "generic-visca-ip"`, booleano `enabled`, `sortOrder` entero
mayor o igual a 0 y límites positivos. Las entradas inválidas, incluido JSON malformado, responden `400` con
`{ "error": "..." }` en español. Una ruta `/api/*` inexistente responde `404` con el mismo formato.

| Método | Ruta               | Resultado                                                                   |
| ------ | ------------------ | --------------------------------------------------------------------------- |
| GET    | `/api/cameras`     | Lista cámaras por orden y nombre.                                           |
| POST   | `/api/cameras`     | Crea una cámara; devuelve `201`. Entrada inválida: `400`.                   |
| PUT    | `/api/cameras/:id` | Reemplaza una cámara; `400` si la entrada es inválida y `404` si no existe. |
| DELETE | `/api/cameras/:id` | Devuelve `204`; `404` si no existe.                                         |
| GET    | `/api/profiles`    | Lista los perfiles guardados.                                               |
| PUT    | `/api/profiles`    | Crea o actualiza un perfil por UUID; entrada inválida: `400`.               |
| GET    | `/api/health`      | Estado del proceso y conectividad SQLite; `503` si no está disponible.      |

Ejemplo:

```json
{
  "name": "Plano general",
  "host": "192.168.10.20",
  "port": 52381,
  "protocolVariant": "generic-visca-ip",
  "enabled": true,
  "sortOrder": 1,
  "panMax": 24,
  "tiltMax": 20,
  "zoomMax": 7
}
```

Los eventos WebSocket son solo tipos en `@ptz/shared`; no hay endpoint WebSocket.

Los perfiles contienen índices editables de tres ejes (`axisPan`, `axisTilt`, `axisZoom`) y dos botones
(`buttonPrev`, `buttonNext`), además de los parámetros de calibración definidos por el contrato compartido.
