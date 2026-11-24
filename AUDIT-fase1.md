# Audit Fase 1 — PTZ Joystick Controller

- **Repo:** `/root/ptz-joystick-controller`
- **Branch auditada:** `feat/fase1-fundacion` (`3263f98`)
- **Base:** `main` (`b0658d7`)
- **Fecha del audit:** 2026-11-23
- **Alcance de referencia:** `docs/SPEC-v1.0.md`, `BRIEF-fase1.md`, `AUDIT-BRIEF-fase1.md`
- **Método:** lectura completa del código y docs, build/typecheck/tests/Docker ejecutados por el auditor, pruebas de borde contra la API en el contenedor.

---

## 1. VEREDICTO

**APROBADO CON OBSERVACIONES**

La Fase 1 está completa en alcance y funciona de punta a punta. Verifiqué la salida real de `npm run build`, `npx tsc --noEmit`, `npm test`, un build Docker **sin caché** (`docker compose build --no-cache`), el arranque con volumen y las pruebas de borde. No hay funcionalidad fuera de alcance. Los defectos encontrados son acotados, ninguno rompe el objetivo de la fase ni la persistencia: el más relevante es que la instrucción de arranque local del `README` falla en un clon limpio porque no existe `./data`.

**Lo que está bien (verificado, no asumido):**

- Los siete endpoints de §8 están implementados con los métodos y códigos correctos (`apps/server/src/app.ts:9-15`).
- La validación es estricta de verdad en lo importante: `.strict()` rechaza campos extra, puerto entero 1–65535, enums cerrados, longitudes, booleanos y UUIDs.
- Toda la persistencia usa prepared statements de `better-sqlite3`; probé inyección SQL en `id` y en `name` y no hubo efecto.
- La migración es idempotente: dos `restart` consecutivos y un `recreate` del contenedor arrancan sin error y conservan los datos.
- `enabled` hace el viaje boolean → integer → boolean correctamente (probado `false`).
- `PUT`/`DELETE` sobre id inexistente devuelven 404; `DELETE` exitoso devuelve 204.
- `/api/health` devuelve 200 con DB sana y **503** con `{"status":"degraded","database":"unavailable"}` cuando la DB no responde (probado cerrando el `Store`).
- El contrato VISCA y el `MockViscaAdapter` existen y no emiten red. No hay Gamepad, UDP, WebSocket funcional, curvas/rampas en runtime, watchdog, lease ni auth.
- La UI React lista/crea/edita/elimina contra la API real y se sirve compilada desde el mismo proceso Express.
- Docker multi-stage, Compose con volumen nombrado, `.env.example` coherente y build reproducible desde cero.

---

## 2. Hallazgos bloqueantes

**Ninguno.**

Ningún hallazgo impide cumplir el objetivo de Fase 1 (CRUD de cámaras con persistencia, API y UI servidos por Docker). Los problemas encontrados se detallan abajo como no bloqueantes. Consideré si el fallo del arranque local del `README` debía bloquear: no lo hago porque el camino principal documentado y exigido por el brief es Docker, ese camino funciona, y el defecto se corrige con una línea. Queda marcado como el hallazgo no bloqueante de mayor prioridad.

---

## 3. Hallazgos no bloqueantes

### N1. El arranque local documentado falla en un clon limpio (prioridad alta dentro de no bloqueantes)

- **Dónde:** `README.md:18` y `apps/server/src/database.ts:7`.
- **Qué pasa:** el README indica:
  `PORT=3000 DATABASE_PATH=./data/ptz.sqlite npm run start --workspace=@ptz/server`
  pero `./data` no existe en el repo y `better-sqlite3` no crea el directorio padre. Reproducido:
  ```text
  $ ls -ld data
  ls: cannot access 'data': No such file or directory
  $ node --input-type=module -e "new Store('/tmp/ptz-audit-nonexistent-dir-xyz/ptz.sqlite')"
  ERROR: undefined Cannot open database because the directory does not exist
  ```
- **Por qué no bloquea:** Docker crea `/data` en la imagen (`Dockerfile:22`) y el flujo Docker verificado funciona. Es una instrucción secundaria del README, no el camino principal.
- **Fix sugerido:** en `Store`, si el path no es `:memory:`, hacer `mkdirSync(dirname(path), { recursive: true })`; o documentar `mkdir -p data` antes del comando local.
- **Relacionado:** `.gitignore` no ignora `data/` ni `*.sqlite-wal` / `*.sqlite-shm`. Al correr local, `data/`, `ptz.sqlite-wal` y `ptz.sqlite-shm` quedarían como archivos sin trackear. Conviene agregarlos.

### N2. La validación de `host` acepta un IPv4 inválido disfrazado de hostname

- **Dónde:** `packages/shared/src/index.ts:3`.
- **Qué pasa:** `999.999.999.999` falla `z.ipv4()`, pero pasa la regex de hostname y se acepta:
  ```text
  POST host="999.999.999.999" => 201 | {"host":"999.999.999.999",...}
  ```
- **Por qué no bloquea:** los hostnames por definición no se pueden validar por resolución en este punto (se permiten nombres DNS legítimos), y el valor no es peligroso: solo sería una cámara inalcanzable. No afecta CRUD ni persistencia.
- **Fix sugerido:** si el valor está compuesto solo por dígitos y puntos, exigir `z.ipv4()`; en caso contrario, validar como hostname. Opcional: aceptar FQDN con punto final, hoy rechazado.

### N3. Errores no siempre en español y respuestas no siempre JSON; además contradice `docs/API.md`

- **Dónde:** `packages/shared/src/index.ts:3-6`, `apps/server/src/app.ts:8`, `apps/server/src/index.ts:5`, `docs/API.md:3`.
- **Qué pasa:**
  - Los mensajes custom están en español, pero los defaults de Zod salen en inglés: `Invalid input: expected number, received string`, `Unrecognized key: "hack"`, `Invalid UUID`, `Too small: expected number to be >0`.
  - JSON malformado devuelve `400` con HTML (`<pre>Bad Request</pre>`), no `{"error":"..."}`.
  - `GET /api/nope` devuelve **200 con el HTML del SPA**, no 404 JSON, porque el catch-all de `apps/server/src/index.ts:5` también atrapa `/api/*`.
  - `docs/API.md:3` afirma “Todas las rutas responden JSON”; no es exacto para esos casos (y `DELETE` 204 no lleva body).
- **Por qué no bloquea:** los siete endpoints exigidos cumplen el contrato para entradas válidas y para errores de validación de schema. Esto afecta ergonomía de cliente y precisión documental, no la funcionalidad central.
- **Fix sugerido:** middleware de error que devuelva JSON 400 (incluido `entity.parse.failed`) y 404 JSON para `/api/*`; personalizar los mensajes de Zod que hoy quedan en inglés; ajustar `docs/API.md`.

### N4. `sortOrder` negativo se acepta (y no tiene cota superior)

- **Dónde:** `packages/shared/src/index.ts:3`.
- **Qué pasa:** `POST` con `sortOrder: -5` devuelve `201`. Ni `SPEC-v1.0.md` ni el brief fijan un rango para el orden; “numérico” se cumple. La UI tampoco impone `min` en ese input (`apps/web/src/main.tsx:9`).
- **Por qué no bloquea:** ordenar con valores negativos es funcionalmente válido (simplemente ordena antes). Es una decisión de contrato, no un bug demostrable.
- **Fix sugerido:** si la intención era “orden ≥ 0”, agregar `.min(0)` al schema y `min="0"` en la UI, y documentarlo en `API.md`.

### N5. Cobertura de tests mínima para lo que pide el brief

- **Dónde:** `tests/api.test.ts:4-6`.
- **Qué pasa:** hay 3 tests: un DTO inválido, un CRUD completo y health. Cumplen literalmente “tests de validación y CRUD” y “al menos un test de integración”, pero faltan casos que el propio brief menciona o insinúa: `PUT`/`DELETE` 404, campos extra en `PUT`, `enabled:false` de punta a punta, `/api/profiles`, health 503, idempotencia de migración y `MockViscaAdapter`.
- **Por qué no bloquea:** la exigencia mínima está satisfecha y el auditor verificó esos casos manualmente.
- **Fix sugerido:** convertir las pruebas de borde de este audit en tests automatizados.

### N6. Líneas exageradamente largas: problema real de mantenibilidad, no solo cosmético

- **Dónde:** por ejemplo `apps/web/src/main.tsx:9` (1.971 caracteres), `packages/shared/src/index.ts:3` (879), `packages/shared/src/index.ts:6` (785), `tests/api.test.ts:5` (631), `apps/server/src/database.ts:19` (433).
- **Por qué no bloquea:** compila, pasa typecheck y tests; el comportamiento es correcto.
- **Por qué lo reporto igual:** no es solo estética. El código está escrito en estilo “minificado”: componentes, handlers y schemas enteros en una línea. Eso hace que `git diff`, code review, blame y depuración sean innecesariamente costosos, y aumenta el riesgo de errores al modificar. No lo inflaría a bloqueante, pero es una deuda de legibilidad concreta. No hay comentarios ni `TODO`s, lo cual es correcto.

### N7. Higiene de dependencias

- **Dónde:** `package.json:1`; `Dockerfile:15`.
- **Qué pasa:** `supertest` (solo para tests) está en `dependencies` de la raíz, por lo que se instala en la imagen final con `npm ci --omit=dev`. `tsx` está en `devDependencies` pero no lo usa ningún script. Además, `better-sqlite3`, `express`, `react`, `react-dom` y `zod` están declarados en la raíz y otra vez en cada workspace.
- **Por qué no bloquea:** la imagen funciona y el sobrepeso es chico.
- **Fix sugerido:** mover `supertest` a `devDependencies`, eliminar `tsx` y dejar las dependencias de runtime en cada workspace.

### N8. Un solo commit para toda la fase, pese a que el brief pedía commits atómicos

- **Dónde:** `git log --oneline b0658d7..HEAD` → un único `3263f98`.
- **Qué pasa:** el mensaje sí es español y conventional commit, pero no hay commits atómicos separados (shared, server, web, Docker, docs, tests).
- **Por qué no bloquea:** no afecta código ni operación; reescribir la historia ahora no aporta valor proporcional. Queda como desvío de entregable para futuras fases.

### N9. Migraciones sin versionado

- **Dónde:** `apps/server/src/database.ts:11-14`.
- **Qué pasa:** solo hay `CREATE TABLE IF NOT EXISTS`. Es idempotente (verificado), pero no hay tabla de versión ni migraciones incrementales; un cambio futuro de columnas no se aplicaría solo.
- **Por qué no bloquea:** para Fase 1 el esquema es inicial y la idempotencia exigida está cumplida.

### N10. Robustez menor de la UI ante fallos de red

- **Dónde:** `apps/web/src/main.tsx:4,6,8`.
- **Qué pasa:** `load()` captura errores, pero `save()` y `remove()` no manejan rechazos de `fetch` (solo `response.ok`). Un fallo de red deja una promesa rechazada sin mensaje visible.
- **Por qué no bloquea:** el camino feliz y los errores HTTP 400/404 se muestran/operan correctamente.

---

## 4. Fuera de alcance detectado

**Ninguno.**

Revisé explícitamente que no exista:

- Gamepad API / `navigator.getGamepads` / lectura de ejes o botones: **no aparece**.
- Sockets UDP / `dgram` / bytes VISCA / envío real: **no aparece**; solo el contrato y el mock en `apps/server/src/visca/index.ts`.
- Servidor WebSocket funcional: **no existe**; solo tipos en `packages/shared/src/index.ts:8-9`.
- Curvas, rampas, zonas muertas, exponente o sensibilidad **aplicados en runtime**: no hay lógica; solo los campos del schema de `JoystickProfile` (`packages/shared/src/index.ts:6`), que el `AUDIT-BRIEF` permite explícitamente.
- Watchdog, lease, arbitraje multioperador o autenticación: **no aparecen**.
- Los endpoints son exactamente los siete de §8; el catch-all es servido estático del SPA, no un endpoint de negocio adicional.

El `MockViscaAdapter` no se usa desde la app, pero es un entregable pedido; no lo considero código muerto.

---

## 5. Salida real de las verificaciones

Entorno del auditor:

```text
$ node -v; npm -v; docker --version; docker compose version
v24.16.0
11.13.0
Docker version 29.1.3, build 29.1.3-0ubuntu3~24.04.2
Docker Compose version v5.6.1
```

### 5.1 `npm run build`

```text
$ npm run build
> ptz-joystick-controller@1.0.0 build
> npm run build --workspace=@ptz/shared && npm run build --workspace=@ptz/server && npm run build --workspace=@ptz/web

> @ptz/shared@1.0.0 build
> tsc -p tsconfig.json

> @ptz/server@1.0.0 build
> tsc -p tsconfig.json

> @ptz/web@1.0.0 build
> vite build

vite v8.3.8 building client environment for production...
transforming...
✓ 15 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.16 kB │ gzip:  0.14 kB
dist/assets/index-v4Oqd3o7.css    0.64 kB │ gzip:  0.40 kB
dist/assets/index-ByunIyhA.js    222.84 kB │ gzip: 69.69 kB

✓ built in 271ms
EXIT:0
```

### 5.2 `npx tsc --noEmit`

```text
$ npx tsc --noEmit; echo "EXIT:$?"
EXIT:0
```

Sin salida (código 0).

### 5.3 `npm test`

```text
$ npm test
> ptz-joystick-controller@1.0.0 test
> vitest run

(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.

 RUN  v5.1.1 /root/ptz-joystick-controller

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  21:12:44
   Duration  1.24s (import 75%, tests 20%, transform 4%, worker 1%)

EXIT:0
```

### 5.4 Docker: build sin caché + arranque + endpoints

Primero reconstruí desde cero para no confiar en capas cacheadas de Codex:

```text
$ docker compose build --no-cache
...
#12 [build 7/9] RUN apt-get ... && npm ci
#12 DONE 33.9s

#13 [stage-1  7/11] RUN apt-get ... && npm ci --omit=dev ...
#13 DONE 34.0s

#14 [build 8/9] COPY . .
#14 DONE 0.2s

#15 [build 9/9] RUN npm run build
#15 0.725 > ptz-joystick-controller@1.0.0 build
#15 0.725 > npm run build --workspace=@ptz/shared && npm run build --workspace=@ptz/server && npm run build --workspace=@ptz/web
#15 1.008 > @ptz/shared@1.0.0 build
#15 1.521 > @ptz/server@1.0.0 build
#15 2.114 > @ptz/web@1.0.0 build
#15 2.532 vite v8.3.8 building client environment for production...
#15 2.747 ✓ 15 modules transformed.
#15 2.921 dist/index.html                   0.16 kB │ gzip:  0.14 kB
#15 2.921 dist/assets/index-v4Oqd3o7.css    0.64 kB │ gzip:  0.40 kB
#15 2.921 dist/assets/index-ByunIyhA.js    222.84 kB │ gzip: 69.69 kB
#15 2.922 ✓ built in 388ms
#15 DONE 3.0s

#16 [stage-1  8/11] COPY --from=build /app/apps/server/dist apps/server/dist
#17 [stage-1  9/11] COPY --from=build /app/apps/web/dist apps/web/dist
#18 [stage-1 10/11] COPY --from=build /app/packages/shared/dist packages/shared/dist
#19 [stage-1 11/11] RUN mkdir -p /data
#20 exporting to image
#20 naming to docker.io/library/ptz-joystick-controller-ptz-controller:latest done
#20 DONE 9.5s

 Image ptz-joystick-controller-ptz-controller Built 
EXIT:0
```

Arranque y endpoints:

```text
$ docker compose up -d
 Container ptz-joystick-controller-ptz-controller-1 Recreate 
 Container ptz-joystick-controller-ptz-controller-1 Recreated 
 Container ptz-joystick-controller-ptz-controller-1 Starting 
 Container ptz-joystick-controller-ptz-controller-1 Started 

$ curl -s -o /dev/null -w "health:%{http_code}\n" http://localhost:3000/api/health
health:200
$ curl -s http://localhost:3000/api/health
{"status":"ok","database":"connected"}
$ curl -s http://localhost:3000/api/cameras
[{"id":"c00246fb-068f-49af-827d-a3b270770f73","name":"Plano general","host":"192.168.10.20","port":52381,"protocolVariant":"generic-visca-ip","enabled":true,"sortOrder":1,"panMax":24,"tiltMax":20,"zoomMax":7}]
$ curl -s -o /dev/null -w "ui:%{http_code}\n" http://localhost:3000/
ui:200
$ docker compose ps --format '{{.Name}} {{.Status}}'
ptz-joystick-controller-ptz-controller-1 Up 2 seconds
```

Nota de transparencia: el volumen ya contenía la cámara `Plano general` de la verificación previa de Codex; no es un seed del código. Mis cámaras/perfiles de prueba fueron eliminados al terminar. La persistencia se comprobó con un `recreate` del contenedor y con dos `restart`:

```text
--- restart 1 ---
 Container ptz-joystick-controller-ptz-controller-1 Restarting 
 Container ptz-joystick-controller-ptz-controller-1 Started 
health:200 {"status":"ok","database":"connected"}
count= 7
[('Xneg', True, -5), ("'); DROP TABLE cameras;--", True, 0), ('Xbadip', True, 0), ('trim', True, 0), ('v6', True, 0), ('Plano general', True, 1), ('Test editado', False, 7)]
--- restart 2 ---
 Container ptz-joystick-controller-ptz-controller-1 Restarting 
 Container ptz-joystick-controller-ptz-controller-1 Started 
health:200 {"status":"ok","database":"connected"}
```

Sin errores de migración en los logs (`PTZ Controller listening on 3000` en cada arranque). `Test editado` con `enabled:false` sobrevivió el reinicio, confirmando el round-trip booleano/integer.

### 5.5 Casos borde (salida real)

```text
=== crear válida ===
POST valid => 201 | {"id":"a70baf74-...","name":"Test","host":"192.168.10.21","port":52381,...}
=== validaciones ===
extra field => 400 | {"error":"entrada: Unrecognized key: \"hack\""}
host vacío => 400 | {"error":"host: El host es obligatorio; host: El host debe ser una IP o nombre de host válido"}
host espacios => 400 | {"error":"host: El host es obligatorio; host: El host debe ser una IP o nombre de host válido"}
port 0 => 400 | {"error":"port: El puerto debe estar entre 1 y 65535"}
port 65536 => 400 | {"error":"port: El puerto debe estar entre 1 y 65535"}
port string => 400 | {"error":"port: Invalid input: expected number, received string"}
port decimal => 400 | {"error":"port: Invalid input: expected int, received number"}
sortOrder negativo => 201 | {"id":"fbc414c0-...","name":"Xneg",...,"sortOrder":-5,...}
protocolVariant inválido => 400 | {"error":"protocolVariant: Invalid input: expected \"generic-visca-ip\""}
enabled string => 400 | {"error":"enabled: Invalid input: expected boolean, received string"}
panMax 0 => 400 | {"error":"panMax: Too small: expected number to be >0"}
host 999.999.999.999 => 201 | {"id":"e50e5522-...","name":"Xbadip","host":"999.999.999.999",...}
host con scheme => 400 | {"error":"host: El host debe ser una IP o nombre de host válido"}
JSON malformado => 400 | <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Bad Request</pre>
</body>
</html>
=== 404 ===
PUT inexistente => 404 | {"error":"Cámara no encontrada"}
DELETE inexistente => 404 | {"error":"Cámara no encontrada"}
DELETE id basura (SQLi) => 404 | {"error":"Cámara no encontrada"}
=== ruta API inexistente ===
GET /api/nope => 200 | <script type="module" crossorigin src="/assets/index-ByunIyhA.js"></script>
<link rel="stylesheet" href="/assets/index-v4Oqd3o7.css">
<div id="root"></div>
=== profiles ===
PUT profile válido => 200 | {"id":"11111111-1111-4111-8111-111111111111","name":"P1",...}
PUT profile extra => 400 | {"error":"entrada: Unrecognized key: \"x\""}
PUT profile id inválido => 400 | {"error":"id: Invalid UUID"}
GET profiles => 200 | [{"id":"11111111-1111-4111-8111-111111111111","name":"P1",...}]
```

Casos adicionales:

```text
PUT body con id extra => 400 | {"error":"entrada: Unrecognized key: \"id\""}
PUT parcial (solo name) => 400 | {"error":"host: Invalid input: expected string, received undefined; port: ..."}
POST sin body => 400 | {"error":"name: Invalid input: expected string, received undefined; ..."}
nombre vacío => 400 | {"error":"name: El nombre es obligatorio"}
nombre 101 => 400 | {"error":"name: El nombre no puede superar 100 caracteres"}
host IPv6 => 201 | {"host":"::1",...}
host con espacios alrededor (trim) => 201 | {"host":"192.168.0.9",...}
name SQLi literal => 201 | {"name":"'); DROP TABLE cameras;--",...}
GET tras intento SQLi => 200 | [... 7 cámaras, tabla intacta ...]
PUT enabled=false => 200 | {...,"enabled":false,...}
```

Health con la DB cerrada:

```text
$ node --input-type=module -e "... const s = new Store(':memory:'); s.close(); ..."
closed-db health => 503 {"status":"degraded","database":"unavailable"}
```

### 5.6 Chequeos estáticos adicionales

```text
$ grep -rniE "\bany\b|@ts-ignore|@ts-expect-error|TODO|FIXME|XXX" apps packages tests --include='*.ts' --include='*.tsx' --include='*.json'
sin coincidencias

$ git log --oneline b0658d7..HEAD
3263f98 feat(fase1): monorepo, API REST de cámaras, SQLite, UI base y Docker
```

Conclusión operativa: **Fase 1 lista para `main`** una vez atendidos, como mínimo, N1 y N3; el resto puede ir a backlog sin bloquear.
