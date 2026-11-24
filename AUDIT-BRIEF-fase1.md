# Audit Fase 1 — PTZ Joystick Controller

Sos el auditor. Tu veredicto decide si esta fase pasa a `main` o vuelve a Codex.

- **Repo:** `/root/ptz-joystick-controller`
- **Branch:** `feat/fase1-fundacion` (commit `3263f98`)
- **Base:** `main` (commit `b0658d7`)
- **Spec:** `docs/SPEC-v1.0.md` — fuente de verdad del alcance
- **Brief que se le dio a Codex:** `BRIEF-fase1.md`
- **Reporte de Codex:** `PHASE1-REPORT.md`

## Qué tenés que auditar

### 1. Alcance (lo más importante)

El brief define explícitamente qué entra y qué **NO**. Verificá que Codex no se haya ido de alcance:

**Debe estar:**
- Monorepo con `apps/web`, `apps/server`, `packages/shared`, `apps/server/src/visca`
- Tipos/shared con Zod para `Camera` y `JoystickProfile` + contratos de eventos WS
- Server: `GET/POST /api/cameras`, `PUT/DELETE /api/cameras/:id`, `GET/PUT /api/profiles`, `GET /api/health`
- SQLite con persistencia real y migración idempotente
- Validación estricta (host, puerto 1–65535, enums cerrados, longitudes)
- `ViscaAdapter` como **interfaz** + `MockViscaAdapter`
- UI React con CRUD de cámaras
- Dockerfile multi-stage + docker-compose con volumen
- Tests de validación y CRUD

**NO debe estar (rechazar si aparece):**
- Gamepad API, lectura de ejes, mapeo de botones
- Cualquier envío VISCA UDP real, bytes VISCA, sockets UDP hacia cámaras
- Curvas (lineal/potencia/S-curve), rampas, zonas muertas **implementadas en runtime**
  (los *campos* del schema sí van — son parte del modelo de datos de §9;
  la *lógica* de aplicación es Fase 4)
- Watchdog, lease de control, arbitraje multioperador
- Autenticación
- Servidor WebSocket funcional (solo tipos en shared)

### 2. Corrección técnica

- **¿Los endpoints cumplen §8 exactamente?** Nombres, métodos, códigos HTTP.
- **¿La validación es estricta de verdad?** Probá mentalmente: host vacío, host con espacios, puerto 0, puerto 65536, puerto string, `sortOrder` negativo, `protocolVariant` fuera del enum, body con campos extra (`.strict()`).
- **¿La migración es idempotente?** ¿Qué pasa si el server arranca dos veces?
- **¿`enabled` boolean ↔ SQLite integer funciona en ambos sentidos?**
- **¿Los errores devuelven mensajes útiles en español?**
- **¿`/api/health` distingue DB sana de DB caída?** (debe dar 503 si falla)
- **SQL injection:** todo debe ir por prepared statements.
- **¿El `UPDATE` maneja correctamente un id inexistente (404)?**

### 3. Calidad de código

- TypeScript estricto real (no `any` sueltos, no `@ts-ignore`).
- Código legible. **Ojo:** Codex escribió líneas muy largas (300+ caracteres). Eso funciona pero es difícil de revisar y mantener. Evaluá si es un problema de mantenibilidad real o solo cosmético — y decilo con honestidad, sin inflarlo.
- Sin dependencias innecesarias.
- Sin código muerto ni TODOs sin resolver.

### 4. Documentación

Los cuatro docs (`ARCHITECTURE.md`, `VISCA.md`, `OPERATIONS.md`, `API.md`) deben describir **lo que el código hace**, no lo que "debería" hacer. Si un doc afirma algo que el código no hace, es un hallazgo.

### 5. Verificación independiente

**No confíes en el reporte de Codex.** Corré vos mismo:

```bash
cd /root/ptz-joystick-controller
npm run build
npx tsc --noEmit
npm test
docker compose up -d --build
curl -s http://localhost:3000/api/health
curl -s http://localhost:3000/api/cameras
```

Y probá casos borde que Codex no haya cubierto: payloads inválidos, campos extra, puertos fuera de rango.

## Formato del veredicto

Escribí `AUDIT-fase1.md` con:

1. **VEREDICTO:** `APROBADO` / `APROBADO CON OBSERVACIONES` / `RECHAZADO`
2. **Hallazgos bloqueantes** — numerados, con archivo:línea y por qué bloquea
3. **Hallazgos no bloqueantes** — mejoras sugeridas
4. **Fuera de alcance detectado** — si lo hay
5. **Salida real de tus verificaciones** — pegada, no resumida

Sé duro pero justo. No inventes problemas para parecer riguroso, ni apruebes para cerrar rápido. Si algo está bien, decilo.
