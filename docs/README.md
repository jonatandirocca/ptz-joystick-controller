// Estructura de documentación técnica del proyecto.

# Documentación

| Documento | Contenido |
|-----------|-----------|
| [SPEC-v1.0.md](SPEC-v1.0.md) | Especificación funcional y técnica v1.0. Fuente de verdad del alcance, requisitos y criterios de aceptación. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Arquitectura del sistema: componentes, flujos de datos y decisiones de diseño. |
| [VISCA.md](VISCA.md) | Protocolo VISCA over IP: encapsulado, comandos, adaptadores por fabricante y simulador. |
| [OPERATIONS.md](OPERATIONS.md) | Puesta en marcha, despliegue con Docker Compose y operación diaria. |
| [API.md](API.md) | Contrato REST y de eventos WebSocket. |

## Convenciones

- Cada documento describe **lo que existe en el repositorio**, no lo que se planea.
- Si algo está pendiente de validación con hardware real, se marca explícitamente como **no verificado**.
- Los números de requisito (RF-01 … RF-12) referencian `SPEC-v1.0.md` y no se renumeran.
