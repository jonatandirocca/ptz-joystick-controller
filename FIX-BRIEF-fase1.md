# Brief de corrección — Fase 1 (post-audit)

OpenCode aprobó la Fase 1 con observaciones. **Ninguna bloquea**, pero todas son correcciones reales y las queremos hechas antes de pasar a Fase 2.

Leé `AUDIT-fase1.md` completo. Ahí está el detalle con archivo:línea y cómo reproducir cada caso.

## Correcciones a aplicar

### N1 — Arranque local roto (prioridad más alta)

`better-sqlite3` no crea el directorio padre. En `Store`, si el path no es `:memory:`, crear el directorio con `mkdirSync(dirname(path), { recursive: true })` antes de abrir la DB.

Además, agregar a `.gitignore`:
```
data/
*.sqlite-wal
*.sqlite-shm
```

Verificá el arranque local en un clon limpio, sin crear `./data` a mano.

### N2 — Host IPv4 inválido aceptado

`999.999.999.999` pasa la regex de hostname. Si el valor está compuesto **solo por dígitos y puntos**, exigir `z.ipv4()`; si no, validar como hostname. Agregá el test correspondiente.

### N3 — Errores JSON consistentes y en español

- Middleware de error que devuelva `{"error": "..."}` en JSON 400 para body malformado (`entity.parse.failed`), en vez del HTML de Express.
- 404 JSON para cualquier `/api/*` desconocido, no el catch-all del SPA.
- Personalizar los mensajes de Zod que hoy salen en inglés: `Invalid UUID`, `Unrecognized key`, `Too small`, `Invalid input: expected number, received string`. Todos en español.
- Ajustar `docs/API.md` para que diga la verdad sobre qué devuelve cada caso.

### N4 — `sortOrder` sin cota

Agregar `.min(0)` al schema y `min="0"` en el input de la UI. Documentarlo en `API.md`.

### N5 — Cobertura de tests

Convertir en tests automatizados los casos que el auditor verificó a mano:

- `PUT` y `DELETE` sobre id inexistente → 404
- Campos extra en `PUT` → 400
- `enabled: false` de punta a punta (boolean → integer → boolean)
- `GET` y `PUT /api/profiles`
- `/api/health` → 503 cuando la DB no responde
- Migración idempotente: dos aperturas del mismo archivo
- `MockViscaAdapter` registra las tres operaciones
- `/api/nope` → 404 JSON
- Body JSON malformado → 400 JSON

### N6 — Legibilidad (importante, no cosmético)

Reformatear el código para que ninguna línea supere **~120 caracteres**. Esto incluye:
- `apps/web/src/main.tsx`
- `packages/shared/src/index.ts`
- `apps/server/src/database.ts`
- `apps/server/src/app.ts`
- `tests/api.test.ts`

**Regla:** separá statements, objetos y cadenas de métodos en líneas propias. Un objeto Zod multilínea es perfectamente legible; uno de 879 caracteres no.

Agregá Prettier al repo con `printWidth: 120` y un script `npm run format:check`. Debe pasar.

### N7 — Higiene de dependencias

- `supertest` → `devDependencies`
- Eliminar `tsx` (no se usa)
- Dependencias de runtime declaradas **solo** en el workspace que las usa, no duplicadas en la raíz
- Verificá que la imagen Docker no arrastre deps de test

## NO toques

- No agregues nada de Fase 2/3/4/5 (Gamepad, UDP real, curvas, watchdog, auth).
- No reescribas la historia de git para "commits atómicos" (N8) — queda para futuras fases. Hacé **un commit de corrección** encima del actual.
- No cambies el modelo de datos ni los endpoints.

## Verificación obligatoria

Pegá la salida real de:

```bash
npm run build
npx tsc --noEmit
npm test
npm run format:check
docker compose build --no-cache
docker compose up -d && curl -s http://localhost:3000/api/health
```

Y probá a mano los casos de N2, N3 y N4 contra el contenedor:
```bash
curl -s -X POST localhost:3000/api/cameras -H 'Content-Type: application/json' -d '{"name":"x","host":"999.999.999.999","port":52381,"protocolVariant":"generic-visca-ip","enabled":true,"sortOrder":1,"panMax":24,"tiltMax":20,"zoomMax":7}'
curl -s localhost:3000/api/nope -w '\nHTTP=%{http_code}\n'
curl -s -X POST localhost:3000/api/cameras -H 'Content-Type: application/json' -d '{roto' -w '\nHTTP=%{http_code}\n'
```

Escribí `FIX-REPORT-fase1.md` con lo que corregiste y la salida real.
