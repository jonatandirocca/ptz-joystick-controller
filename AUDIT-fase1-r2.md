# Audit Fase 1 — Re-auditoría (r2)

- **Repo:** `/root/ptz-joystick-controller`
- **Branch:** `feat/fase1-fundacion`
- **Commit auditado:** `aeb255d` (`fix(fase1): correcciones del audit N1-N7`)
- **Audit previo:** `AUDIT-fase1.md` (commit `3263f98`, hallazgos N1–N10)
- **Reporte de corrección:** `FIX-REPORT-fase1.md`
- **Fecha:** 2026-11-23
- **Método:** diff completo `3263f98..aeb255d`, lectura del código, build/typecheck/tests/format ejecutados por el auditor, build Docker **sin caché**, pruebas de borde reales contra el contenedor y arranque local en directorio limpio. No se tomó como válido ningún resultado del `FIX-REPORT` sin reproducirlo.

---

## 1. VEREDICTO

**APROBADO (con una observación menor nueva, no bloqueante).**

N1 a N7 están **realmente corregidos** y verificados contra el contenedor, no solo en el reporte. No hay código fuera de alcance, no hay regresiones funcionales en el CRUD/persistencia y `docs/SPEC-v1.0.md` **no fue modificada** (mismo blob en todos los commits). Única observación nueva: el nuevo manejador de errores devuelve `500` ante un payload que excede `32kb` (antes habría sido `413`); es un detalle de contrato HTTP, ajeno al CRUD y no bloqueante.

---

## 2. Estado de N1–N7 (verificado por el auditor)

| ID | Estado | Evidencia reproducida |
| --- | --- | --- |
| N1 | **Corregido** | `Store` hace `mkdirSync(dirname(path), { recursive: true })` salvo `:memory:` (`apps/server/src/database.ts:9-12`). Arranqué el servidor en `/tmp/ptz-clean-XXXX` con `DATABASE_PATH=./data/ptz.sqlite` y un directorio `data/` inexistente: creó `data/` y los archivos `ptz.sqlite`, `-wal`, `-shm`, y `/api/health` respondió `200`. El comando documentado en el README (`npm run start --workspace=@ptz/server`) también arrancó y respondió `200`. `.gitignore` ahora incluye `data/`, `*.sqlite-wal` y `*.sqlite-shm`. |
| N2 | **Corregido** | `host="999.999.999.999"` → `400 {"error":"host: El host debe ser una IP o nombre de host válido"}`. Siguen válidos `192.168.0.10`, `camara.local` y `::1` (todos `201`). La rama es “solo dígitos y puntos ⇒ debe pasar `z.ipv4()`” (`packages/shared/src/index.ts:12-21`). |
| N3 | **Corregido** | JSON malformado → `400 {"error":"El cuerpo JSON es inválido"}` (JSON, no HTML). `GET /api/nope` → `404 {"error":"Ruta API no encontrada"}`. Zod responde en español: `port:"abc"` → `"port: Entrada inválida: se esperaba número, recibido texto"`; campo extra → `"entrada: Llave desconocida: \"hack\""`; UUID inválido → `"id: Inválido UUID"`; enum inválido → `"protocolVariant: Entrada inválida: se esperaba \"generic-visca-ip\""`. `docs/API.md` quedó alineado. |
| N4 | **Corregido** | `sortOrder:-1` → `400 {"error":"sortOrder: El orden no puede ser negativo"}`; `sortOrder:0` → `201`. Schema con `.min(0, ...)` (`packages/shared/src/index.ts:38`) y UI con `min="0"` (`apps/web/src/main.tsx:111`). Documentado en `docs/API.md`. |
| N5 | **Corregido** | `npm test`: **9 tests, 9 passed**. Cubren: IPv4 inválida, CRUD con `enabled:false`, `404` de PUT/DELETE, strict en PUT, `sortOrder` negativo, perfiles, health `200`/`503`, migración con directorio anidado, mock VISCA, `/api` inexistente y JSON malformado (`tests/api.test.ts`). Los tests son reales (sin skip/condicionales) y pasan. |
| N6 | **Corregido** | Archivos reformateados; longitud máxima de línea en código fuente ahora **119** caracteres (`database.ts:56`), antes había líneas de 433–1971. `npm run format:check` → “All matched files use Prettier code style!”. `prettier.config.mjs` (`printWidth:120`) y `.prettierignore` que preserva `docs/SPEC-v1.0.md` y los docs de proceso. |
| N7 | **Corregido** | `supertest` pasó a `devDependencies`; `tsx` eliminado; la raíz ya no declara dependencias de runtime (cada workspace declara las suyas). Imagen final construida con `npm ci --omit=dev`: dentro del contenedor `supertest` **ausente**, `tsx` **ausente**, y `zod`, `express`, `better-sqlite3`, `@ptz/shared` **presentes**. `npm ci` desde el lockfile funcionó en build y runtime. |

---

## 3. Source of truth: `docs/SPEC-v1.0.md`

**No modificada.** Verificado por blob SHA de Git y por contenido:

```text
$ git log --oneline --all -- docs/SPEC-v1.0.md
9c0e52a docs: especificación v1.0 y estructura inicial del repositorio

$ git rev-parse 9c0e52a:docs/SPEC-v1.0.md b0658d7:docs/SPEC-v1.0.md \
                 3263f98:docs/SPEC-v1.0.md aeb255d:docs/SPEC-v1.0.md main:docs/SPEC-v1.0.md
fc2d2f1237c31e6ad3694a2bf4ca73df0aeebb8e   (idéntico en los 5)
```

El blob es el mismo en `main`, en el commit auditado original y en `aeb255d`. Además, `.prettierignore` la excluye explícitamente para que no se reformatee por accidente. `git status` quedó limpio.

---

## 4. Alcance y código fuera de alcance

**Ningún código fuera de alcance nuevo.** El commit `aeb255d` toca 28 archivos: correcciones N1–N7, reformateo, Prettier, tests y docs de API. No agrega endpoints (siguen siendo los siete de §8), ni Gamepad/UDP/WebSocket/watchdog/lease/auth. Búsqueda explícita:

```text
$ grep -rniE "navigator\.getGamepads|Gamepad|dgram|createSocket|WebSocket|watchdog|lease|authentic|..." apps packages tests
packages/shared/src/index.ts:51: gamepadId: ...        # campo del schema JoystickProfile (preexistente, permitido)
packages/shared/src/index.ts:77: acquire/release/select  # tipos de eventos (preexistente, permitido)
tests/api.test.ts:25: gamepadId: 'gamepad-1'             # fixture de test
```

No hay lógica de ejecución de ninguna de esas funciones. `MockViscaAdapter` sigue siendo un mock en memoria (sin red) y ahora tiene test.

---

## 5. Regresiones y observaciones nuevas

### R1 (nueva, menor, no bloqueante) — payload > 32kb devuelve 500 en vez de 413

- **Dónde:** `apps/server/src/app.ts:9-16` (`errorHandler`).
- **Qué pasa:** el handler nuevo solo reconoce `entity.parse.failed` (→400 JSON); cualquier otro error de `express.json` cae en `500 {"error":"Error interno del servidor"}`. Probado con un body de ~40kb:
  ```text
  === payload grande >32kb ===
  {"error":"Error interno del servidor"}
  HTTP=500
  ```
- **Impacto:** antes, el handler por defecto de Express devolvía `413` (aunque en HTML). No afecta el CRUD normal ni la validación de campos; es corrección de semántica HTTP.
- **Sugerencia (backlog):** mapear `entity.too.large` → `413` y `charset.unsupported`/`encoding.unsupported` → `415`, siempre en JSON.

### Observación documental menor

El comando local del README (`npm run start --workspace=@ptz/server`) se ejecuta con cwd en `apps/server`, por lo que `DATABASE_PATH=./data/ptz.sqlite` resuelve a `apps/server/data/ptz.sqlite` (no a `./data` en la raíz). Ya no falla porque N1 crea el directorio, y `.gitignore` cubre `data/` en cualquier nivel. No es un defecto funcional; solo aclaración opcional.

### Hallazgos previos que siguen igual (fuera del encargo N1–N7)

- **N8** (un solo commit para la fase): sigue; no afecta operación.
- **N9** (migraciones sin versionado): sigue; idempotencia verificada y suficiente para Fase 1.
- **N10** (UI: `save()`/`remove()` no manejan rechazo de red): sigue; fuera de N1–N7, no bloqueante.

---

## 6. Verificaciones ejecutadas (salida real)

Entorno: Node `v24.16.0`, npm `11.13.0`, Docker `29.1.3`, Compose `v5.6.1`. Working tree limpio en `aeb255d`.

```text
$ npm run build          → EXIT 0 (shared + server + vite)
$ npx tsc --noEmit       → EXIT 0 (sin salida)
$ npm test               → Test Files 1 passed | Tests 9 passed (9) | EXIT 0
$ npm run format:check   → "All matched files use Prettier code style!" | EXIT 0

$ docker compose build --no-cache
 Image ptz-joystick-controller-ptz-controller Built          → EXIT 0

$ docker compose up -d --force-recreate
 $ curl -s http://localhost:3000/api/health
{"status":"ok","database":"connected"}                        HTTP 200
```

Casos de borde contra el contenedor (resumen; todos reproducidos por el auditor):

```text
host 999.999.999.999   → 400  host: El host debe ser una IP o nombre de host válido
host 192.168.0.10      → 201
host camara.local      → 201
host ::1               → 201
JSON malformado        → 400  {"error":"El cuerpo JSON es inválido"}
GET /api/nope          → 404  {"error":"Ruta API no encontrada"}
sortOrder -1           → 400  sortOrder: El orden no puede ser negativo
sortOrder 0            → 201
campo extra en PUT     → 400  entrada: Llave desconocida: "id"
PUT id inexistente     → 404  Cámara no encontrada
DELETE id inexistente  → 404  Cámara no encontrada
PUT enabled=false      → 200  enabled:false
perfil PUT/GET         → 200 / 200
payload >32kb          → 500  (ver R1)
```

Persistencia: reinicié el contenedor y la cámara con `enabled:false` y `sortOrder:9` sobrevivió; health `200` tras el reinicio. Al terminar eliminé por API las cámaras de prueba y borré el perfil de prueba de la base del volumen; el estado final quedó `[]` / `[]`. El contenedor quedó levantado y sano.

Arranque local en clon limpio:

```text
$ ls -ld data                                  → No such file or directory
$ (cwd temporal) PORT=3199 DATABASE_PATH=./data/ptz.sqlite node apps/server/dist/index.js
PTZ Controller listening on 3199
$ ls -ld data                                   → drwxr-xr-x ... data   (creado)
$ curl /api/health                              → 200 {"status":"ok","database":"connected"}
```

---

## 7. Conclusión

Las correcciones N1–N7 son reales y completas; la fase mantiene el alcance y la especificación intacta. **Recomiendo aprobar `feat/fase1-fundacion` para `main`.** R1 va a backlog junto con N8–N10, sin bloquear.
