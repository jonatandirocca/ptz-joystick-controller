# PTZ Joystick Controller

Aplicación web multiplataforma para controlar cámaras PTZ por **VISCA over IP** desde joysticks USB conectados a las computadoras de los operadores.

**Flujo:** Joystick USB → Gamepad API → React → WebSocket → Node.js → VISCA UDP → cámara PTZ.

## Estado del proyecto

| Fase | Alcance | Estado |
|------|---------|--------|
| 1 | Monorepo, Docker Compose, servidor, CRUD de cámaras, persistencia SQLite, UI básica | 🔄 en curso |
| 2 | Gamepad API, visualización de ejes/botones, asignación configurable | ⬜ pendiente |
| 3 | Controlador VISCA UDP real con simulador/mock y pruebas por modelo | ⬜ pendiente |
| 4 | Selección anterior/siguiente, curvas, rampas y STOP de seguridad | ⬜ pendiente |
| 5 | Concurrencia multioperador, autenticación, logs y pruebas en estudio | ⬜ pendiente |

## Documentación

- [`docs/SPEC-v1.0.md`](docs/SPEC-v1.0.md) — especificación funcional y técnica v1.0 (fuente de verdad del alcance)

## Estructura prevista

```
apps/web          React + TypeScript — pantallas de operación, cámaras, calibración y perfiles
apps/server       Node.js + TypeScript — API HTTP, WebSocket, sesiones, arbitraje y watchdog
packages/shared   Tipos, esquemas de validación y contratos de eventos
apps/server/src/visca   Adaptadores UDP y variantes por fabricante
```

## Requisitos

- Node.js 20+
- Docker + Docker Compose (para despliegue)
- Navegador con soporte de Gamepad API (Chrome, Edge, Firefox)

> **Gamepad API requiere contexto seguro:** HTTPS o `localhost`. Sobre HTTP remoto el navegador no expone los gamepads.

## Datos pendientes de validar

Marcas y modelos de cámaras, variante VISCA over IP, puertos, límites de velocidad, modelos de joystick y entorno de despliegue. El adaptador VISCA es intercambiable y existe un simulador para desarrollar sin hardware.

## Licencia

MIT
