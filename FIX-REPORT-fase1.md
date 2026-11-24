# Reporte de corrección — Fase 1

## Correcciones aplicadas

- N1: `Store` crea el directorio padre para una base que no sea `:memory:`. Se agregaron `data/`, `*.sqlite-wal` y `*.sqlite-shm` a `.gitignore`.
- N2: un host compuesto solo por dígitos y puntos ahora debe pasar `z.ipv4()`.
- N3: Zod usa locale español; JSON malformado devuelve `400` JSON y rutas `/api/*` desconocidas devuelven `404` JSON. `docs/API.md` documenta esos contratos.
- N4: `sortOrder` exige mínimo 0 tanto en API como en UI, y está documentado.
- N5: se agregaron pruebas para los casos requeridos (404, strict PUT, `enabled: false`, perfiles, health degradado, migración, mock VISCA, 404 API y JSON malformado).
- N6: se reformatearon los archivos indicados, se agregó Prettier con `printWidth: 120` y `npm run format:check`.
- N7: `supertest` pasó a `devDependencies`, se eliminó `tsx` y la raíz dejó de declarar dependencias runtime. La imagen final usa `npm ci --omit=dev` y no contiene `supertest`.

## Salida real de verificaciones

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
✓ 15 modules transformed.
dist/index.html                   0.16 kB │ gzip:  0.14 kB
dist/assets/index-v4Oqd3o7.css    0.64 kB │ gzip:  0.40 kB
dist/assets/index-BD8WtPdw.js   222.86 kB │ gzip: 69.69 kB
✓ built in 373ms

$ npx tsc --noEmit
(sin salida; código 0)

$ npm test
> ptz-joystick-controller@1.0.0 test
> vitest run

 RUN  v5.1.1 /root/ptz-joystick-controller

 Test Files  1 passed (1)
      Tests  9 passed (9)
   Duration  860ms

$ npm run format:check
> ptz-joystick-controller@1.0.0 format:check
> prettier --check .

Checking formatting...
All matched files use Prettier code style!

$ docker compose build --no-cache
Image ptz-joystick-controller-ptz-controller Building
#12 [build 7/9] RUN ... npm ci
#13 [stage-1  7/11] RUN ... npm ci --omit=dev ...
#15 [build 9/9] RUN npm run build
Image ptz-joystick-controller-ptz-controller Built

$ docker compose up -d && curl -s http://localhost:3000/api/health
Container ptz-joystick-controller-ptz-controller-1 Running
{"status":"ok","database":"connected"}
```

La primera ejecución de `docker compose up -d` reutilizó el contenedor anterior; se recreó explícitamente antes de las pruebas de borde para validar la imagen nueva.

```text
$ docker compose up -d --force-recreate
Container ptz-joystick-controller-ptz-controller-1 Recreate
Container ptz-joystick-controller-ptz-controller-1 Recreated
Container ptz-joystick-controller-ptz-controller-1 Starting
Container ptz-joystick-controller-ptz-controller-1 Started

$ curl -s http://localhost:3000/api/health
{"status":"ok","database":"connected"}

$ curl -s -X POST localhost:3000/api/cameras -H 'Content-Type: application/json' -d '{"name":"x","host":"999.999.999.999","port":52381,"protocolVariant":"generic-visca-ip","enabled":true,"sortOrder":1,"panMax":24,"tiltMax":20,"zoomMax":7}'
{"error":"host: El host debe ser una IP o nombre de host válido"}

$ curl -s localhost:3000/api/nope -w '\nHTTP=%{http_code}\n'
{"error":"Ruta API no encontrada"}
HTTP=404

$ curl -s -X POST localhost:3000/api/cameras -H 'Content-Type: application/json' -d '{roto' -w '\nHTTP=%{http_code}\n'
{"error":"El cuerpo JSON es inválido"}
HTTP=400

$ curl -s -X POST localhost:3000/api/cameras -H 'Content-Type: application/json' -d '{"name":"orden negativo","host":"192.168.0.1","port":52381,"protocolVariant":"generic-visca-ip","enabled":true,"sortOrder":-1,"panMax":24,"tiltMax":20,"zoomMax":7}' -w '\nHTTP=%{http_code}\n'
{"error":"sortOrder: El orden no puede ser negativo"}
HTTP=400

$ docker compose exec -T ptz-controller node -e "try { require.resolve('supertest'); console.error('supertest presente'); process.exit(1) } catch { console.log('supertest ausente') }"
supertest ausente

$ PORT=3101 DATABASE_PATH=<temporal>/data/ptz.sqlite node apps/server/dist/index.js
$ curl -s http://localhost:3101/api/health
{"status":"ok","database":"connected"}
SQLite creada sin preparar data/
```
