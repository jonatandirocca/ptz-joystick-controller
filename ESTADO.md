# Estado del proyecto — pausa

**Fecha de pausa:** 2026-11-24
**Repo:** https://github.com/jonatandirocca/ptz-joystick-controller
**Rama principal:** `main` @ `5868cc5` — todo pusheado, working tree limpio.

---

## Fases

| Fase | Alcance | Estado |
|------|---------|--------|
| 1 | Monorepo, Docker, API REST de cámaras, SQLite, UI base | ✅ mergeada |
| 2 | Gamepad API, panel en vivo, modo aprender, perfiles | ✅ mergeada |
| 3 | Adaptador VISCA UDP real + simulador | ⬜ no iniciada |
| 4 | Selección, curvas, rampas, STOP de seguridad | ⬜ no iniciada |
| 5 | Multioperador, auth, logs | ⬜ no iniciada |

---

## Dónde retomar

### Fase 3 — Adaptador VISCA UDP

Requiere:
- Implementar `ViscaUdpAdapter` contra el contrato `ViscaAdapter` ya existente
- **Jonatan confirmó que no hace falta conocer los modelos**: "las cámaras con protocolo VISCA funcionan todas iguales"
- Pendiente de definir con Jonatan: ¿hay una cámara accesible para probar de verdad, o el simulador alcanza para cerrar la fase?

### Deuda pendiente de Fase 2 (observaciones del audit)

- **O1 (prioridad real)** — `learnControl` en `apps/web/src/useGamepad.ts:76` exige un cambio de **0.15 entre un frame y el siguiente**. A 60 fps un movimiento lento nunca alcanza el umbral y no se captura. Fix: acumular el delta a lo largo de varios frames en vez de medirlo frame a frame.
- **O2** — captura un botón que ya estaba presionado antes de entrar en modo aprender.
- Faltan tests de UI y de cleanup del hook (cancelación del `requestAnimationFrame`).
- Re-render por frame: `setGamepads(readGamepads())` en cada RAF provoca re-render continuo. Convendría comparar antes de setear, o mover el estado a un ref.
- "Aprender" queda activo aunque no haya gamepad conectado.

### Deuda de Fase 1

- **R1** — payload mayor a 32 kb devuelve `500` en vez de `413` (el `errorHandler` lo intercepta).

---

## Cómo se trabaja este repo

Pipeline fijo, no improvisar:

1. **Rick** escribe el brief de la fase (`BRIEF-faseN.md`) con alcance exacto y una sección explícita de lo que NO entra.
2. **Codex** implementa en una branch `feat/faseN-*`.
3. **Rick** verifica por su cuenta: `build`, `tsc --noEmit`, `tests`, `format:check`, `docker compose build --no-cache`, y casos borde contra el contenedor real. **No confía en el reporte de Codex.**
4. **OpenCode** audita con un brief propio (`AUDIT-BRIEF-faseN.md`) y emite veredicto.
5. Si hay observaciones, **Codex** corrige con `FIX-BRIEF-faseN.md` y **OpenCode** re-audita.
6. Recién con veredicto verde, **Rick** mergea a `main` con `--no-ff`.

### Reglas que ya costaron una ronda de corrección

1. **`docs/SPEC-v1.0.md` no se toca nunca.** Es la especificación original de Jonatan. Está en `.prettierignore` justamente por esto — Prettier la reformateó una vez y hubo que revertirla.
2. **Ninguna línea de código supera 120 caracteres.** Prettier con `printWidth: 120`.
3. **Mensajes de error en español**, no los defaults de Zod en inglés.
4. **Tests reales, no de humo.**
5. **Respetar la sección "FUERA de alcance"** del brief. Si aparece código de una fase futura, el audit lo rechaza.

### Verificación obligatoria (Rick la corre siempre, no Codex)

```bash
cd /root/ptz-joystick-controller
npm run build
npx tsc --noEmit
npm test
npm run format:check
docker compose build --no-cache
docker compose up -d && curl -s http://localhost:3000/api/health
sha256sum docs/SPEC-v1.0.md   # debe seguir siendo b11b1956...
awk 'length($0) > 120' apps/*/src/*.ts* packages/*/src/*.ts tests/*.ts
```

---

## Notas de entorno

- Codex: `CODEX_HOME=/root/.hermes/profiles/rick/home/.codex`, modelo `gpt-5.6-terra`, sandbox `danger-full-access`.
  - **La cuenta de Codex se quedó sin cuota el 2026-11-24.** Jonatan logueó una cuenta nueva con device auth (`codex login --device-auth`). Si vuelve a pasar, generar código nuevo y que Jonatan lo cargue en https://auth.openai.com/codex/device.
- OpenCode: `opencode run --model ollama-cloud/deepseek-v4.1-flash`.
- Git del repo: `user.name = Rick Sanchez`, `user.email = rick@mundopixar`.
- Contenedor detenido al pausar (`docker compose down`). Se levanta con `docker compose up -d`.
