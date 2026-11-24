# VISCA en Fase 1

No se implementó VISCA over IP ni se emite UDP. Existe el contrato intercambiable `ViscaAdapter` y `MockViscaAdapter`, que registra llamadas en memoria para pruebas.

`generic-visca-ip` es únicamente una variante de configuración, no un codificador. Antes de implementar red deben validarse modelo, firmware, encapsulado, puerto y rangos contra la documentación de cámara.
