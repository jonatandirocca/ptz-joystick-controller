# Operación

Ejecutar `docker compose up -d` para construir y publicar el puerto `3000` (o `PORT`). La base SQLite vive en el volumen `ptz-data`; `docker compose down` no lo elimina.

Comprobar con `curl -f http://localhost:3000/api/health`. Responde 503 si SQLite no está disponible. La imagen Node 22 sirve UI y API con Express. No configura HTTPS, proxy, autenticación ni conectividad VISCA.
