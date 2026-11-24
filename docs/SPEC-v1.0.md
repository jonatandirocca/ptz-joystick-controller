PTZ Joystick Controller
Especificación funcional y técnica para implementación
Versión 1.0  |  24 noviembre 2026  |  Proyecto de control PTZ para estudio
1. Objetivo y alcance
Construir una aplicación web multiplataforma para controlar cámaras PTZ por VISCA over IP desde joysticks USB conectados a las computadoras de los operadores. El servidor centralizado correrá en Docker o máquina virtual dentro de la red del estudio. Esta especificación describe la primera versión implementable; no incluye código fuente ejecutable.
2. Arquitectura
* Cliente: navegador compatible con Gamepad API; React + TypeScript. Lee ejes y botones del joystick local.
* Transporte: WebSocket entre navegador y backend para órdenes de movimiento, selección y telemetría.
* Servidor: Node.js + TypeScript; API de administración, arbitraje multioperador, watchdog y adaptador VISCA UDP.
* Persistencia: SQLite en volumen Docker para cámaras, perfiles y parámetros.
* Cámaras: red IP accesible desde el contenedor/VM; puerto UDP configurable por cámara (valor inicial sugerido 52381, sujeto a modelo y encapsulado).
Flujo: Joystick USB → Gamepad API → React → WebSocket → Node.js → VISCA UDP → cámara PTZ.
3. Requisitos funcionales
ID
	Descripción
	RF-01
	CRUD de cámaras: nombre, IP, puerto, protocolo/variante, habilitada y orden.
	RF-02
	Selección anterior/siguiente con botones físicos y botones en pantalla; navegación circular.
	RF-03
	Pan y tilt simultáneos proporcionales con analógico izquierdo X/Y.
	RF-04
	Zoom proporcional con eje Y del analógico derecho; inversión opcional.
	RF-05
	Mapeo libre de ejes y botones, modo aprendizaje, vista en tiempo real.
	RF-06
	Perfiles por joystick/operador; persistencia de mapeos y calibración.
	RF-07
	Zona muerta, inversión, sensibilidad, velocidades mínima/máxima y curvas independientes para pan/tilt y zoom.
	RF-08
	Curvas lineal, potencia/exponencial y S-curve; rampas de aceleración y desaceleración temporales.
	RF-09
	STOP al centrar ejes, cambiar de cámara, desconectar joystick, perder foco/control o agotar watchdog.
	RF-10
	Arbitraje exclusivo por cámara para evitar comandos simultáneos de varios operadores.
	RF-11
	Estado visible: joystick, conexión servidor, cámara activa, valores de ejes y velocidades.
	RF-12
	Interfaz administrativa con alta, edición, eliminación, orden y prueba de conectividad de cámaras.
	4. Mapeo predeterminado
* Analógico izquierdo X: Pan (izquierda/derecha).
* Analógico izquierdo Y: Tilt (arriba/abajo).
* Analógico derecho Y: Zoom (tele/wide).
* LB: cámara anterior. RB: cámara siguiente.
* Todos los índices deben ser editables: Gamepad API puede variar según el dispositivo y su mapping.
5. Algoritmo de respuesta
Para un eje normalizado x ∈ [-1,1], aplicar inversión opcional, zona muerta d y normalización: u = max(0, (|x| − d)/(1 − d)). Mantener signo original. Curvas: lineal f(u)=u; potencia f(u)=u^γ (γ ≥ 1); S-curve f(u)=3u²−2u³. Convertir f(u) a velocidad VISCA discreta permitida por la cámara, con redondeo y límites configurables. Para u=0 emitir STOP, no una velocidad mínima.
Rampa temporal: limitar el cambio de velocidad solicitada según dt y parámetros de aceleración/desaceleración; aplicar separadamente a pan, tilt y zoom. Evitar oscilaciones por cuantización y enviar comandos solo al cambiar la velocidad o según una frecuencia máxima definida. Las rampas software no garantizan suavidad física: dependen de la cámara.
6. Seguridad y concurrencia
* Watchdog en backend: si no llega una actualización válida dentro del umbral configurable (ej. 300–500 ms), enviar STOP a la cámara controlada.
* Al cambiar de cámara: STOP explícito a la anterior, liberar control y adquirir la siguiente antes de mover.
* Al desconectar WebSocket, perder joystick o abandonar la interfaz: STOP; el backend no debe depender exclusivamente del evento de cierre del navegador.
* Implementar lease de control por cámara con dueño, expiración y renovación; rechazar órdenes de otros operadores.
* Validar IP, puerto y comandos; limitar acceso administrativo y proteger el WebSocket con autenticación en despliegues compartidos.
* Evitar que una interfaz web servida por HTTP remoto dependa de permisos del navegador: probar Gamepad API en contexto seguro (HTTPS o localhost).
7. Protocolo VISCA
Implementar un adaptador aislado por fabricante/variante. Los comandos VISCA de pan/tilt y zoom tienen velocidades discretas y rangos que dependen del modelo. VISCA over IP puede usar encapsulado específico y secuencias; verificar documentación de las cámaras antes de fijar paquetes, límites y gestión de respuestas. Puerto configurable; 52381 es común pero no universal.
8. API y eventos propuestos
* REST: GET/POST /api/cameras; PUT/DELETE /api/cameras/:id; GET/PUT /api/profiles; GET /api/health.
* WebSocket cliente→servidor: acquire(cameraId), release(cameraId), select(cameraId), motion(cameraId, pan, tilt, zoom, seq), heartbeat.
* WebSocket servidor→cliente: cameraList, controlGranted, controlDenied, activeCamera, joystickStatus (local), error, stopped.
* Mensajes tipados, validados, con marca temporal y secuencia; el servidor descarta mensajes viejos o de una sesión sin lease.
9. Modelo de datos sugerido
* Camera: id, name, host, port, protocolVariant, enabled, sortOrder, panMax, tiltMax, zoomMax.
* JoystickProfile: id, name, gamepadId, axisPan, axisTilt, axisZoom, buttonPrev, buttonNext, invertPan/Tilt/Zoom, deadzones, curves, exponent, sensitivity, rampUpMs, rampDownMs.
* ControlLease (memoria): cameraId, clientId, expiresAt; no persistir control activo tras reinicio.
10. Estructura del repositorio
* apps/web — React, pantallas de operación, cámaras, calibración y perfiles.
* apps/server — API HTTP, WebSocket, sesiones, arbitraje y watchdog.
* packages/shared — tipos, esquemas de validación y contratos de eventos.
* apps/server/src/visca — adaptadores UDP y variantes por fabricante.
* docker-compose.yml, Dockerfile, .env.example, README.md, tests/.
11. Despliegue
Contenedor Node.js que sirva frontend compilado y backend. Volumen persistente para SQLite. Puerto TCP publicado para HTTP(S)/WebSocket; salida UDP hacia cámaras. En producción, publicar HTTPS mediante proxy inverso y restringir la red administrativa. Probar que Docker pueda alcanzar las VLAN/subredes de cámaras; host networking no es obligatorio si existe ruta de salida.
12. Plan de implementación
1. Fase 1: monorepo, Docker Compose, servidor y UI básica; CRUD de cámaras y persistencia.
2. Fase 2: Gamepad API, visualización de ejes/botones y asignación configurable.
3. Fase 3: controlador VISCA UDP real con simulador/mock y pruebas por modelo.
4. Fase 4: selección anterior/siguiente, curvas, rampas y STOP de seguridad.
5. Fase 5: concurrencia multioperador, autenticación, logs y pruebas en estudio.
13. Criterios de aceptación
* Funciona desde Windows/macOS/Linux con navegador compatible y joystick reconocido.
* Al seleccionar una cámara, solo esa cámara recibe movimiento; cambio anterior/siguiente circular.
* Centro del joystick produce STOP; movimiento proporcional con curvas y parámetros guardados.
* Zoom independiente de pan/tilt; botones y ejes reasignables sin cambiar código.
* Ante desconexión o timeout, se envía STOP; dos operadores no controlan la misma cámara a la vez.
* Reinicio del contenedor conserva cámaras y perfiles; despliegue reproducible con Docker Compose.
14. Datos pendientes de validar
Marcas/modelos y firmware de cámaras; variante VISCA over IP y puertos; límites de velocidades; modelos de joystick; entorno de despliegue (Docker/VM, VLAN, HTTPS); política de autenticación y cantidad de operadores. Estos puntos no impiden desarrollar con un adaptador VISCA intercambiable y un simulador.